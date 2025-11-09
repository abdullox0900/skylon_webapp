"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "@/styles/GameRates.module.css";
import { useAPI } from "@/context/APIContext";
import { useUser } from "@/context/UserContext";
import type { TransactionEntry } from "@/types/api_client";
import skins from "@/styles/skins.module.css";
import Image from "next/image";
import { createLogger } from "@/utils/logger";

type TabType = "my" | "all" | "high";

interface GameRatesProps {
  gameId?: string;
}

function useEllipsisMask<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    }
  }, []);

  return { ref, isOverflowing };
}

function TableRow({ bet }: { bet: TransactionEntry }) {
  const { ref: userRef, isOverflowing: userOverflow } = useEllipsisMask<HTMLDivElement>();
  const { ref: slotRef, isOverflowing: slotOverflow } = useEllipsisMask<HTMLAnchorElement>();

  return (
    <div className={styles.tableRow}>
      <span>
        <div
          ref={userRef}
          className={`${styles.userNameCell} ${userOverflow ? styles.needsMask : ""}`}
        >
          {bet.user_name || `Игрок #${bet.user_id}`}
        </div>
      </span>

      <span className={styles.slotName}>
        <Link
          ref={slotRef}
          href={`/game/${bet.game_uuid}`}
          className={`${styles.slotLink} ${slotOverflow ? styles.needsMask : ""}`}
        >
          {bet.slot_name || "Без названия"}
        </Link>
      </span>

      <span className={bet.amount >= 0 ? styles.payoutWin : styles.payoutLoss}>
        {bet.amount >= 0 ? "+" : "-"} {Math.abs(bet.amount).toLocaleString()} ₽
      </span>
    </div>
  );
}

export default function GameRates({ gameId }: GameRatesProps) {
  const { client } = useAPI();
  const { user } = useUser();

  const [tab, setTab] = useState<TabType>("my");
  const [bets, setBets] = useState<TransactionEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [limit, setLimit] = useState<number>(10);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const log = useRef(createLogger("GameRates")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    const fetchData = async () => {
      if (!client || !user) return;
      setLoading(true);
      const fetchStart = performance.now();

      log.info("Fetching bets", { op_id: opId, tab, limit, gameId });

      try {
        let result: TransactionEntry[] = [];

        if (tab === "my") {
          result = await client.getMyBets(user.id, gameId, limit);
        } else if (tab === "all") {
          result = await client.getTotalBets(gameId, limit);
        } else if (tab === "high") {
          result = await client.getHighBetPlayers(gameId, limit);
        }

        setBets(result);
        log.info("Bets fetched", {
          op_id: opId,
          tab,
          limit,
          count: result.length,
          latency_ms: Math.round(performance.now() - fetchStart),
        });
      } catch (error: any) {
        log.error("Error fetching bets", {
          op_id: opId,
          tab,
          limit,
          error: error?.message || String(error),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tab, limit, client, user, gameId, log, opId]);

  const limits = [10, 20, 30, 40, 50];

  return (
    <div className={`${styles.container}`}>
      <div className={styles.tabs}>
        <div className={styles.tabBox}>
        <button
          className={`${styles.tabButton} ${tab === "high" ? styles.activeTab : ""}`}
          onClick={() => {
            setTab("high");
            log.info("Tab changed", { op_id: opId, newTab: "high" });
          }}
        >
          Крупные ставки
        </button>
        <button
          className={`${styles.tabButton} ${tab === "my" ? styles.activeTab : ""}`}
          onClick={() => {
            setTab("my");
            log.info("Tab changed", { op_id: opId, newTab: "my" });
          }}
        >
          Мои ставки
        </button>
        <button
          className={`${styles.tabButton} ${tab === "all" ? styles.activeTab : ""}`}
          onClick={() => {
            setTab("all");
            log.info("Tab changed", { op_id: opId, newTab: "all" });
          }}
        >
          Все ставки
        </button>
        </div>
        <div
          className={`${styles.limitSelectorButton} ${skins.darkblueSkin}`}
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span>{limit}</span>
          <Image
            src="/assets/GameGrid/arrow_buttons.svg"
            alt="arrow"
            width={12}
            height={12}
            className={`${styles.dropdownIcon} ${showDropdown ? styles.open : ""}`}
          />
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Игрок</span>
          <span>Выплата</span>
        </div>

        <div className={styles.tableBody}>
          {loading && (
            <div className={styles.loadingWrapper}>
              <Image
                src="/assets/spinner.svg"
                alt="Загрузка"
                className={styles.loadingIcon}
                width={36}
                height={36}
              />
              <span>Загрузка...</span>
            </div>
          )}

          {bets.length ? (
            bets.map((bet, i) => <TableRow key={i} bet={bet} />)
          ) : (
            !loading && <div className={styles.emptyState}>Нет данных для отображения</div>
          )}
        </div>
      </div>
      <div className={styles.limitSelectorContainer}>
      

      {showDropdown && (
        <div className={`${styles.limitDropdown} ${skins.darkblueSkin}`}>
          {limits.map((val) => (
            <div
              key={val}
              className={`${styles.limitOption} ${limit === val ? styles.selected : ""}`}
              onClick={() => {
                setLimit(val);
                setShowDropdown(false);
                log.info("Limit changed", { op_id: opId, newLimit: val });
              }}
            >
              {val}
            </div>
          ))}
        </div>
      )}
    </div>
     
    </div>
  );
}
