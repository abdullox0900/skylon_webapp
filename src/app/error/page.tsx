'use client';

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "@/styles/ErrorScreen.module.css";
import { createLogger } from "@/utils/logger";
import Image from "next/image";

const messageMap: Record<string, string> = {
  invalid_data: "Перезапустите мини-приложение через нашего бота.",
  blocked: "Доступ заблокирован. Обратитесь в поддержку.",
  no_telegram_id: "Пользователь не найден. Запустите через бота.",
  session_expired: "Сессия устарела. Откройте приложение заново.",
  unknown: "Произошла ошибка. Попробуйте снова через бота.",
  geo_block: "Доступ к приложению ограничен для вашего региона.",
};

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const msg = searchParams.get("msg") || "unknown";
  const message = messageMap[msg] || messageMap["unknown"];

  const log = useRef(createLogger("ErrorPage")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const startTime = performance.now();
    log.warn("ErrorPage opened", { op_id: opId, msg, shownMessage: message });

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const isReload = (nav && nav.type === "reload") || (performance as any).navigation?.type === 1;

    const RETRY_KEY = "skylon:error-retry-at";
    const RETRY_TTL_MS = 15000;

    const canRetry = () => {
      try {
        const v = sessionStorage.getItem(RETRY_KEY);
        if (!v) return true;
        const ts = Number(v);
        return !Number.isFinite(ts) || Date.now() - ts > RETRY_TTL_MS;
      } catch { return true; }
    };

    if (isReload && canRetry()) {
      try { sessionStorage.setItem(RETRY_KEY, String(Date.now())); } catch {}
      router.replace("/games");
    }

    return () => {
      log.info("ErrorPage closed", {
        op_id: opId,
        msg,
        lifetime_ms: Math.round(performance.now() - startTime),
      });
    };
  }, [log, msg, message, opId, router]);


  const handleTelegramClick = () => {
    log.info("Telegram support button clicked", { op_id: opId, msg });
  };

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container}`}>
        <Image src="/assets/error/error-logo.svg" className={styles.errorLogo} width={119} height={88} alt="Error" />
        <div className={styles.textBlock}>
          <h1 className={styles.title}>Ошибка доступа!</h1>
          <p className={styles.subtitle}>{message}</p>
        </div>
        <a
          href="https://t.me/FrostyWinBot"
          className={`${styles.telegramButton}`}
          onClick={handleTelegramClick}
        >
          <img src="/assets/error/tg_icon.svg" alt="Telegram" className={styles.telegramIcon} />
          Frosty Casino
        </a>
      </div>
    </div>
  );
}
