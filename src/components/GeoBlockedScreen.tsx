"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Lottie from "lottie-react";
import animationData from "@/../public/lottie/access-denied.json";
import styles from "@/styles/GeoBlockedScreen.module.css";
import skins from "@/styles/skins.module.css";
import { createLogger } from "@/utils/logger";
import Image from "next/image";

export default function GeoBlockedScreen() {
  const router = useRouter();
  const log = useRef(createLogger("GeoBlockedScreen")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const startTime = performance.now();
    log.warn("GeoBlockedScreen opened", { op_id: opId });

    return () => {
      log.info("GeoBlockedScreen closed", {
        op_id: opId,
        lifetime_ms: Math.round(performance.now() - startTime),
      });
    };
  }, [log, opId]);

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.container}`}>
        <Image src="/assets/error/error-logo.svg" className={styles.errorLogo} width={119} height={88} alt="Error" />

        <div className={styles.textBlock}>
          <h1 className={styles.title}>Игра недоступна</h1>
          <p className={styles.subtitle}>
            К сожалению, данный провайдер недоступен для вашего региона.
          </p>
        </div>
        <button
          onClick={() => {
            log.info("Back button clicked", { op_id: opId });
            router.back();
          }}
          className={`${styles.telegramButton}`}
        >
          Назад
        </button>
      </div>
    </div>
  );
}
