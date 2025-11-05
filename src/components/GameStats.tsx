"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/styles/GameStats.module.css";
import { useAPI } from "@/context/APIContext";
import skins from "@/styles/skins.module.css";
import { useUser } from "@/context/UserContext";
import { createLogger } from "@/utils/logger";

interface PlayerStat {
  user_id: number;
  user_name: string;
  is_hidden: number;
  payout: number;
  date?: number;
}

interface GameStatsProps {
  gameId: string;
}

type StatTab = "big_wins" | "lucky_bets" | "top_today";

const tabLabels: Record<StatTab, string> = {
  big_wins: "Крупные выигрыши",
  lucky_bets: "Удачные ставки",
  top_today: "Лучшие за сегодня",
};

export default function GameStats({ gameId }: GameStatsProps) {
  const { client } = useAPI();
  const { profileChanged, setProfileChanged } = useUser();
  const [activeTab, setActiveTab] = useState<StatTab>("big_wins");
  const [data, setData] = useState<Record<StatTab, PlayerStat[]>>({
    big_wins: [],
    lucky_bets: [],
    top_today: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const log = useRef(createLogger("GameStats")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  const fetchTabData = async (tab: StatTab) => {
    if (!client) return;
    setIsLoading(true);

    const startTime = performance.now();
    log.info("Fetching game stats", { op_id: opId, gameId, tab });

    try {
      let result: PlayerStat[] = [];

      if (tab === "big_wins") {
        const apiResult = await client.getBigWins(gameId);
        result = apiResult.map((item) => ({
          user_id: item.user_id,
          user_name: item.user_name,
          is_hidden: item.is_hidden,
          payout: item.payout,
          date: item.date,
        }));
      } else if (tab === "lucky_bets") {
        const apiResult = await client.getLuckyBets(gameId);
        result = apiResult.map((item) => ({
          user_id: item.user_id,
          user_name: item.user_name,
          is_hidden: item.is_hidden,
          payout: item.average_payout,
          date: item.date,
        }));
      } else {
        const apiResult = await client.getTopPlayersToday(gameId);
        result = apiResult.map((item) => ({
          user_id: item.user_id,
          user_name: item.user_name,
          is_hidden: item.is_hidden,
          payout: item.total_bet,
          date: item.date,
        }));
      }

      setData((prev) => ({ ...prev, [tab]: result }));
      log.info("Game stats fetched", {
        op_id: opId,
        gameId,
        tab,
        count: result.length,
        latency_ms: Math.round(performance.now() - startTime),
      });
    } catch (e: any) {
      log.error("Error fetching game stats", {
        op_id: opId,
        gameId,
        tab,
        error: e?.message || String(e),
      });
    } finally {
      setTimeout(() => setIsLoading(false));
    }
  };

  useEffect(() => {
    log.info("GameStats mounted", { op_id: opId, gameId, initialTab: activeTab });
    if (client && gameId) {
      fetchTabData(activeTab);
    }
    return () => {
      log.info("GameStats unmounted", { op_id: opId, gameId });
    };
  }, []);

  useEffect(() => {
    if (!client || !gameId) return;
    fetchTabData(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!client || !gameId) return;
    if (profileChanged) {
      log.debug("Profile changed, reloading stats", { op_id: opId, gameId, tab: activeTab });
      fetchTabData(activeTab);
      setProfileChanged(false);
    }
  }, [profileChanged]);

  const renderRow = (stats: PlayerStat[]) => {
    const places = [2, 1, 3];
    const sorted = [...stats].sort((a, b) => b.payout - a.payout);
    const reorderedStats: (PlayerStat | null)[] = [
      sorted[1] || null,
      sorted[0] || null,
      sorted[2] || null,
    ];

    return (
      <div className={styles.statsRow}>
        {reorderedStats.map((item, idx) => (
          <div
            key={idx}
            className={`${styles.statColumn} ${styles[`place${places[idx]}`]}`}
          >
            <img
              src={`/assets/GameStats/place_${places[idx]}.svg`}
              alt={`place ${places[idx]}`}
              className={`${styles.cupImage} ${styles[`place${places[idx]}`]}`}
            />
            {item ? (
              <>
                <div className={styles.amount}>
                  {item.payout.toLocaleString()} ₽
                </div>
                <div className={styles.nameWrapper}>
                  <div className={styles.name}>
                    {item.is_hidden === 1 ? "Аноним" : item.user_name}
                  </div>
                </div>
                <div className={styles.date}>
                  {item.date
                    ? activeTab === "top_today"
                      ? new Date(item.date * 1000).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : new Date(item.date * 1000).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                    : "—"}
                </div>
              </>
            ) : (
              <>
                <div className={styles.amount}>–</div>
                <div className={styles.name}>Не занято</div>
                <div className={styles.date}>—</div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${styles.container} ${skins.containerSkin} ${skins.containerWithPattern }`}>
      <div className={styles.tabs}>
        {Object.entries(tabLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key as StatTab);
              log.info("Tab changed", { op_id: opId, gameId, newTab: key });
            }}
            className={activeTab === key ? skins.blueGlowSkin : ""}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.statsBody}>
        {isLoading && (
          <div className={styles.loadingWrapper}>
            <img
              src="/assets/spinner.svg"
              alt="Загрузка"
              className={styles.loadingIcon}
            />
            <span>Загрузка...</span>
          </div>
        )}
        {renderRow(data[activeTab])}
      </div>
    </div>
  );
}
