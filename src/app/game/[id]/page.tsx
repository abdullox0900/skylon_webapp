"use client";

import Header from "@/components/Header";
import GameCard from "@/components/GameCard";
import GameStats from "@/components/GameStats";
import GameRates from "@/components/GameRates";
import ProviderCarousel from "@/components/ProviderCarousel";
import { useParams, useRouter } from "next/navigation";
import styles from "@/styles/ComponentsGlobal.module.css";
import { useEffect, useRef } from "react";
import { createLogger } from "@/utils/logger";
import SlotsBanner from "@/components/SlotsBanner";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";

  const log = useRef(createLogger("GamePage")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const startTime = performance.now();

    if (!gameId) {
      log.error("No gameId found in URL", { op_id: opId });
    } else {
      log.info("GamePage opened", { op_id: opId, gameId });
    }

    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;

      tg.BackButton.show();
      tg.BackButton.onClick(() => {
        log.info("BackButton clicked", { op_id: opId, gameId });
        router.push("/games");
      });

      return () => {
        tg.BackButton.hide();
        tg.BackButton.offClick();
        log.info("GamePage unmounted", {
          op_id: opId,
          gameId,
          lifetime_ms: Math.round(performance.now() - startTime),
        });
      };
    }

    return () => {
      log.info("GamePage unmounted", {
        op_id: opId,
        gameId,
        lifetime_ms: Math.round(performance.now() - startTime),
      });
    };
  }, [router, gameId, log, opId]);

  if (!gameId) {
    return (
      <main>
        <Header />
        <div style={{ padding: "1rem", textAlign: "center" }}>
          <p>Ошибка: Не удалось определить ID игры. Проверьте URL.</p>
        </div>
      </main>
    );
  }

  return (
    <main >
      <Header />
      <div className={styles.main}>
      <div className={styles.content}>
        <GameCard gameId={gameId} />
        <GameStats gameId={gameId} />
        <GameRates gameId={gameId} />
      </div>
      </div>
    </main>
  );
}
