"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useAPI } from "@/context/APIContext";
import BrandedLoading from "@/components/BrandedLoading";
import { getClientIP, getClientFingerprint } from "@/utils/get-client-ip";
import { setupAutoLogger, createLogger, bindClient, setUserId, sendInitOnce } from "@/utils/logger";

export default function AppInit({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setUser } = useUser();
  const { client } = useAPI();
  const [loading, setLoading] = useState(true);

  const opIdRef = useRef<string>("");
  const log = useRef(createLogger("AppInit")).current;

  useEffect(() => {
    setupAutoLogger();
    log.debug("Auto logger initialized");
  }, []);

  useEffect(() => {
    if (!client) return;
    bindClient(client);
    log.debug("API client bound to logger");
  }, [client]);

  useEffect(() => {
    if (pathname === "/error") {
      log.warn("AppInit skipped: /error page detected");
      setLoading(false);
      return;
    }
    if (!client) return;

    const uuid = () => (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
    opIdRef.current = uuid();

    const getIpWithTimeout = async (ms: number) => {
      try {
        return await Promise.race<string | null>([
          getClientIP(),
          new Promise((r) => setTimeout(() => r(null), ms)),
        ]);
      } catch {
        return null;
      }
    };

    (async () => {
      const startTime = performance.now();
      try {
        log.info("=== AppInit started ===", { op_id: opIdRef.current, path: pathname });

        const [webAppModule, clientIp, fingerprint] = await Promise.all([
          import("@twa-dev/sdk"),
          getIpWithTimeout(600),
          Promise.resolve(getClientFingerprint()),
        ]);
        const WebApp = webAppModule.default;
        const fingerprintHash = fingerprint != null
          ? String(fingerprint).slice(0, 8)
          : null;

        log.debug("Dependencies loaded", {
          op_id: opIdRef.current,
          clientIp,
          fingerprintHash,
        });

        const verifyStart = performance.now();
        const status = await client.verifyUser(clientIp ?? undefined, fingerprint);
        log.info("Verification result", {
          op_id: opIdRef.current,
          status,
          latency_ms: Math.round(performance.now() - verifyStart),
          clientIpPresent: !!clientIp,
        });

        if (status !== "ok") {
          log.warn("Redirecting due to verification failure", { op_id: opIdRef.current, reason: status });
          // Temporarily disabled for local development
          // router.replace(`/error?msg=${status}`);
          router.replace("/games");
          return;
        }

        const userId = WebApp.initDataUnsafe?.user?.id;
        if (!userId) {
          log.error("No Telegram user_id found in initData", { op_id: opIdRef.current });
          // Temporarily disabled for local development
          // router.replace("/error?msg=no_telegram_id");
          router.replace("/games");
          return;
        }

        setUserId(userId);
        log.debug("User ID set in logger context", { op_id: opIdRef.current, userId });

        const initData = WebApp.initData || "";
        await sendInitOnce(initData, { op_id: opIdRef.current });

        const userLoadStart = performance.now();
        const user = await client.getUser(userId);
        log.info("User profile loaded", {
          op_id: opIdRef.current,
          latency_ms: Math.round(performance.now() - userLoadStart),
          userId,
          blocked: user.block === 1,
        });

        if (user.block === 1) {
          log.warn("User is blocked, redirecting", { op_id: opIdRef.current, userId });
          // Temporarily disabled for local development
          // router.replace("/error?msg=blocked");
          router.replace("/games");
          return;
        }

        setUser({
          ...user,
          avatar_url: WebApp.initDataUnsafe?.user?.photo_url || null,
        });
        setLoading(false);

        log.info("=== AppInit completed ===", {
          op_id: opIdRef.current,
          total_ms: Math.round(performance.now() - startTime),
          userId,
        });
      } catch (e: any) {
        log.error("AppInit fatal error", {
          op_id: opIdRef.current,
          error: e?.message || String(e),
        });
        // Temporarily disabled for local development
        // router.replace("/error?msg=unknown");
        router.replace("/games");
      }
    })();
  }, [client, pathname, router, setUser, log]);

  // if (loading) return <BrandedLoading />;
  return <>{children}</>;
}
