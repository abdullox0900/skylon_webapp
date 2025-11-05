"use client";

import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import GameGrid from "@/components/GameGrid/GameGrid";
import GameRates from "@/components/GameRates";
import ProviderCarousel from "@/components/ProviderCarousel";
import styles from "@/styles/ComponentsGlobal.module.css";
import { createLogger } from "@/utils/logger";

export default function SlotsPage() {
  const log = useRef(createLogger("SlotsPage")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const startTime = performance.now();
    log.info("SlotsPage opened", { op_id: opId });

    return () => {
      log.info("SlotsPage unmounted", {
        op_id: opId,
        lifetime_ms: Math.round(performance.now() - startTime),
      });
    };
  }, [log, opId]);

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.content}>
        <GameGrid />
        <ProviderCarousel />
        <GameRates />
      </div>
    </main>
  );
}
