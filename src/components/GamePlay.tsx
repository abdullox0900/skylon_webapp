"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/styles/GamePlay.module.css";
import { useAPI } from "@/context/APIContext";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import GeoBlockedScreen from "./GeoBlockedScreen";
import Lottie from "lottie-react";
import animationData from "@/../public/lottie/loading.json";
import skins from "@/styles/skins.module.css";
import { createLogger } from "@/utils/logger";

interface GamePlayProps {
  gameId: string;
  mode: "normal" | "demo";
  fullscreen: boolean;
}

export default function GamePlay({ gameId, mode, fullscreen }: GamePlayProps) {
  const { client } = useAPI();
  const { user } = useUser();
  const router = useRouter();

  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);

  const log = useRef(createLogger("GamePlay")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const startTime = performance.now();
    log.info("GamePlay mounted", { op_id: opId, gameId, mode, fullscreen, userId: user?.id });

    return () => {
      log.info("GamePlay unmounted", {
        op_id: opId,
        gameId,
        lifetime_ms: Math.round(performance.now() - startTime),
      });
    };
  }, [gameId, mode, fullscreen, user?.id, log, opId]);

  useEffect(() => {
    if (!client || !user) return;

    const startGame = async () => {
      log.info("Starting game session", { op_id: opId, gameId, mode });
      try {
        const url =
          mode === "demo"
            ? await client.initDemoSession(gameId)
            : await client.initGameSession(gameId, user.id);

        setSessionUrl(url);
        log.info("Game session initialized", { op_id: opId, gameId, sessionUrl: url });
      } catch (error: any) {
        log.error("Game session init failed", {
          op_id: opId,
          gameId,
          error: error?.message || String(error),
        });
      }
    };

    startGame();
  }, [client, gameId, mode, user?.id, log, opId]);

  useEffect(() => {
    if (!sessionUrl) return;

    const timeout = setTimeout(() => {
      if (!gameLoaded) {
        setGeoBlocked(true);
        log.warn("Game load timeout - possible geo block", { op_id: opId, gameId });
      }
    }, 8000); // 7 секунд

    return () => clearTimeout(timeout);
  }, [sessionUrl, gameLoaded, gameId, log, opId]);

  if (!sessionUrl) {
    return (
      <div className={styles.centeredWrapper}>
        <div className={`${styles.loaderContainer} ${skins.containerSkin} ${skins.containerWithPattern}`}>
          <div className={styles.animation}>
            <Lottie animationData={animationData} loop autoplay style={{ width: "100%", height: "100%" }} />
          </div>
          <p className={styles.loadingText}>Загрузка...</p>
        </div>
      </div>
    );
  }

  if (geoBlocked) {
    return <GeoBlockedScreen />;
  }

  return (
    <div className={styles.wrapper}>
      {!fullscreen && (
        <button
          className={styles.closeButton}
          onClick={() => {
            log.info("Close button clicked", { op_id: opId, gameId });
            router.back();
          }}
          aria-label="Закрыть"
        >
          <img src="/assets/close_icon.svg" alt="Закрыть" />
        </button>
      )}
      <object
        data={sessionUrl}
        type="text/html"
        className={styles.gameView}
        onLoad={() => {
          setGameLoaded(true);
          log.info("Game loaded successfully", { op_id: opId, gameId });
        }}
      />
    </div>
  );
}
