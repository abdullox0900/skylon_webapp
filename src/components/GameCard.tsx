"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "@/styles/GameCard.module.css";
import skins from "@/styles/skins.module.css";
import { useAPI } from "@/context/APIContext";
import { useUser } from "@/context/UserContext";
import type { GameDetails } from "@/types/api_client";
import { createLogger } from "@/utils/logger";
import ModalPortal from "@/components/ModalPortal";

interface GameCardProps {
  gameId: string;
  opId?: string;
}

export default function GameCard({ gameId, opId }: GameCardProps) {
  const { client } = useAPI();
  const { user } = useUser();
  const router = useRouter();
  const log = useRef(createLogger("GameCard")).current;

  const [isLoading, setIsLoading] = useState(true);
  const [gameInfo, setGameInfo] = useState<GameDetails | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [animatingFavorite, setAnimatingFavorite] = useState(false);
  const [animatingSwitch, setAnimatingSwitch] = useState(false);

  const [slotsBlocked, setSlotsBlocked] = useState(false);
  const [showBlockNotice, setShowBlockNotice] = useState(false);
  const [fsAllowedGames, setFsAllowedGames] = useState<string[]>([]);

  const currentPath =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "";

  const didRunRef = useRef(false);

  useEffect(() => {
    if (!client || !gameId || !user?.id) return;
    if (didRunRef.current) return;
    didRunRef.current = true;

    let timeoutId: number | undefined;
    let aborted = false;

    const fetchAll = async () => {
      setIsLoading(true);
      log.info("Fetching game info", { op_id: opId, game_id: gameId });

      try {
        const [data, access] = await Promise.all([
          client.getGameInfo(gameId, user.id),
          client.getSlotsAccess(user.id),
        ]);
        if (aborted) return;

        setGameInfo(data);
        setFsAllowedGames(access.freespin_allowed_game_uuids || []);

        const allowedByFs = (access.freespin_allowed_game_uuids || []).includes(
          (gameInfo?.uuid ?? gameId)
        );
        const restricted = !access.can_play && !allowedByFs;
        setSlotsBlocked(restricted);

        log.info("Game info loaded", {
          op_id: opId,
          game_id: gameId,
          game_name: data.name,
          provider: data.provider?.provider,
          slots_blocked: restricted,
          allowed_by_freespins: allowedByFs,
        });
      } catch (error) {
        if (aborted) return;
        log.error("Failed to load game info or access", { op_id: opId, game_id: gameId, error });
      } finally {
        timeoutId = window.setTimeout(() => {
          if (!aborted) setIsLoading(false);
        }, 150);
      }
    };

    fetchAll();

    return () => {
      aborted = true;
      if (timeoutId) window.clearTimeout(timeoutId);
      didRunRef.current = false;
    };
  }, [client, gameId, user?.id]);

  useEffect(() => {
    if (!showBlockNotice) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showBlockNotice]);

  const handleFavoriteToggle = async () => {
    if (!client || !user || !gameInfo) return;
    setAnimatingFavorite(true);
    log.info("Toggle favorite", {
      op_id: opId,
      game_id: gameInfo.uuid,
      new_status: !gameInfo.is_favorite,
    });

    try {
      await client.toggleFavorite(gameInfo.uuid, user.id, gameInfo.is_favorite);
      setGameInfo((prev) =>
        prev ? { ...prev, is_favorite: !prev.is_favorite } : prev
      );
    } catch (error) {
      log.error("Failed to toggle favorite", { op_id: opId, error });
      alert(error);
    } finally {
      window.setTimeout(() => setAnimatingFavorite(false), 200);
    }
  };

  const handleSwitchToggle = () => {
    setAnimatingSwitch(true);
    setFullscreen((prev) => !prev);
    log.info("Fullscreen toggle", { op_id: opId, enabled: !fullscreen });
    window.setTimeout(() => setAnimatingSwitch(false), 150);
  };

  const handleModeSelect = (mode: "normal" | "demo") => {
    if (mode === "normal" && slotsBlocked) {
      log.info("Play blocked: promo without deposit", { op_id: opId, game_id: gameId });
      setShowBlockNotice(true);
      return;
    }
    const fullscreenFlag = fullscreen ? "1" : "0";
    log.info("Play mode selected", { op_id: opId, game_id: gameId, mode, fullscreen });
    const from = encodeURIComponent(currentPath);
    const qs = `mode=${mode}&fullscreen=${fullscreenFlag}&from=${from}`;
    router.push(`/game/${gameId}/play?${qs}`);
  };

  return (
    <div
      className={`${styles.container} ${skins.containerSkin} ${skins.containerWithPattern} ${
        isLoading ? styles.dimmed : ""
      }`}
    >
      {gameInfo && (
        <>
          <div className={styles.topBlock}>
            <div className={`${styles.imageWrapper} ${skins.slotBorderSkin}`}>
              <img
                src={gameInfo.image || "/placeholder.jpg"}
                alt={gameInfo.name}
                className={styles.slotImage}
                loading="eager"
                decoding="async"
              />
            </div>

            <div className={styles.details}>
              <div className={styles.name}>{gameInfo.name}</div>
              <div className={styles.provider}>
                {gameInfo.provider?.label || gameInfo.provider?.provider || ""}
              </div>

              <button
                className={`${styles.favoriteBtn} ${
                  animatingFavorite ? styles.animating : ""
                }`}
                onClick={handleFavoriteToggle}
                disabled={isLoading}
              >
                <img
                  src={
                    gameInfo.is_favorite
                      ? "/assets/GameCard/favorite_active_card.svg"
                      : "/assets/GameCard/favorite_card.svg"
                  }
                  alt="Избранное"
                />
              </button>
            </div>
          </div>

          <div className={styles.fullscreenToggle}>
            <button
              className={`${styles.toggleSwitch} ${
                animatingSwitch ? styles.animating : ""
              }`}
              onClick={handleSwitchToggle}
              disabled={isLoading}
            >
              <img
                src={
                  fullscreen
                    ? "/assets/GameCard/switch_off.svg"
                    : "/assets/GameCard/switch_on.svg"
                }
                alt="Переключатель"
              />
            </button>
            <span>Играть в полноэкранном режиме</span>
          </div>

          <div className={styles.buttonGroup}>
            <button
              className={`${styles.playButton} ${skins.blueGlowSkin}`}
              onClick={() => handleModeSelect("normal")}
              disabled={isLoading}
            >
              Играть
            </button>
            {(gameInfo?.provider?.supports_demo ?? true) && (
              <button
                className={styles.demoButton}
                onClick={() => handleModeSelect("demo")}
                disabled={isLoading}
              >
                Демо
              </button>
            )}
          </div>
        </>
      )}

      {isLoading && (
        <div className={styles.loadingOverlay}>
          <img
            src="/assets/spinner.svg"
            alt="Загрузка..."
            className={styles.spinner}
          />
        </div>
      )}

      {showBlockNotice && (
        <ModalPortal>
          <div
            className={styles.blockOverlay}
            onClick={() => setShowBlockNotice(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className={styles.blockModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.blockTitle}>Доступ к слотам ограничен</div>
              <div className={styles.blockText}>
                Промокоды без депозита работают только в TG-играх.  
                Чтобы открыть доступ к слотам — пополните баланс.
              </div>
              <button
                onClick={() => setShowBlockNotice(false)}
                className={`${styles.blockCloseBtn} ${skins.blueGlowSkin}`}
              >
                Понятно
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}