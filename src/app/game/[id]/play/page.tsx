"use client";

import Header from "@/components/Header";
import GamePlay from "@/components/GamePlay";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAPI } from "@/context/APIContext";
import { useUser } from "@/context/UserContext";
import { createLogger } from "@/utils/logger";

export default function GamePlayPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const { client } = useAPI();
  const { user, setUser } = useUser();

  const mode = searchParams.get("mode") || "normal";
  const fullscreen = searchParams.get("fullscreen") === "1";
  const fromPage = searchParams.get("from") || "/games";

  const log = useRef(createLogger("GamePlayPage")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const startTime = performance.now();
    log.info("GamePlayPage opened", {
      op_id: opId,
      gameId: id,
      mode,
      fullscreen,
      fromPage,
    });

    return () => {
      log.info("GamePlayPage unmounted", {
        op_id: opId,
        gameId: id,
        lifetime_ms: Math.round(performance.now() - startTime),
      });
    };
  }, [id, mode, fullscreen, fromPage, log, opId]);

  useEffect(() => {
    if (!client || !user) return;

    log.debug("Balance polling started", { op_id: opId, interval_ms: 10000 });
    const interval = setInterval(async () => {
      try {
        const balance = await client.getUserBalance(user.id);
        setUser({ ...user, balance });
        log.debug("Balance updated", { op_id: opId, balance });
      } catch (e: any) {
        log.error("Balance polling error", {
          op_id: opId,
          error: e?.message || String(e),
        });
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      log.debug("Balance polling stopped", { op_id: opId });
    };
  }, [client, user, setUser, log, opId]);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        log.info("BackButton clicked", { op_id: opId, fromPage });
        router.push(fromPage);
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick();
      };
    }
  }, [router, fromPage, log, opId]);

  return (
    <main>
      {!fullscreen && <Header />}
      <GamePlay
        gameId={id as string}
        mode={mode as "normal" | "demo"}
        fullscreen={fullscreen}
      />
    </main>
  );
}
