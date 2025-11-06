import styles from "@/styles/GameGrid/GameList.module.css";
import skins from "@/styles/skins.module.css";
import { useRef, useEffect, useState } from "react";
import type { GameInfo } from "@/types/api_client";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createLogger } from "@/utils/logger";

interface Props {
  games: GameInfo[];
  router: AppRouterInstance;
  loading: boolean;
  noMoreGames: boolean;
  fetchGames: (append: boolean) => void;
  opId?: string;
}

const LIMIT = 12;

export default function GameList({
  games,
  router,
  loading,
  noMoreGames,
  fetchGames,
  opId,
}: Props) {
  const [minGridHeight, setMinGridHeight] = useState<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const log = useRef(createLogger("GameList")).current;

  const isEmpty = !loading && games.length === 0;
  const isReloading = loading && games.length === 0 && !noMoreGames;
  const isAppending = loading && games.length > 0;

  const visibleGames = [...new Map(games.map((g) => [g.uuid, g])).values()];
  const lastLoadedGames = visibleGames.slice(-LIMIT);

  useEffect(() => {
    log.info("Render GameList", {
      op_id: opId,
      total_games: games.length,
      unique_games: visibleGames.length,
      loading_state: { isEmpty, isReloading, isAppending },
    });

    if (gridRef.current && games.length > 0) {
      const height = gridRef.current.offsetHeight;
      setMinGridHeight(height);
    }
  }, [games, loading, isEmpty, isReloading, isAppending]);

  return (
    <>
      <div
        className={styles.gridWrapper}
        style={{ minHeight: loading ? 200 : undefined }}
      >
        <div
          ref={gridRef}
          className={`${styles.grid} ${loading ? styles.loading : styles.loaded}`}
        >
          {isEmpty && (
            <div className={styles.emptyState}>Нет доступных игр</div>
          )}

          {visibleGames.map((game, index) => {
            const isNew = lastLoadedGames.includes(game);
            const delay = isNew ? (index % LIMIT) * 70 : 0;

            return (
              <div
                key={game.uuid}
                className={`${styles.card} ${skins.slotBorderSkin}`}
                style={{ "--fade-delay": `${delay}ms` } as React.CSSProperties}
                onClick={() => {
                  log.info("Open game", { op_id: opId, game_id: game.uuid, game_name: game.name });
                  router.push(`/game/${game.uuid}`);
                }}
              >
                <img
                  src={game.image || "/placeholder.jpg"}
                  alt={game.name}
                  className={styles.image}
                />
              </div>
            );
          })}

          {isReloading && (
            <div className={styles.gridOverlay}>
              <img
                src="/assets/spinner.svg"
                alt="Загрузка..."
                className={styles.spinner}
              />
            </div>
          )}
        </div>
      </div>

      {isAppending && <p className={styles.loadingText}>Загрузка...</p>}

      {!loading && !noMoreGames && (
        <button
          className={`${styles.showMoreButton}`}
          onClick={() => {
            log.info("Load more games", { op_id: opId });
            fetchGames(true);
          }}
        >
            Смотреть больше
        </button>
      )}
    </>
  );
}
