"use client";

import { useState, useEffect, useRef } from "react";
import { useAPI } from "@/context/APIContext";
import { useUser } from "@/context/UserContext";
import { useRouter, useSearchParams } from "next/navigation";
import type { GameInfo, GameProvider } from "@/types/api_client";
import styles from "@/styles/GameGrid/GameGrid.module.css";
import skins from "@/styles/skins.module.css";
import GameFilters from "./GameFilters";
import GameList from "./GameList";
import { createLogger } from "@/utils/logger";

export default function GameGrid() {
  const { client } = useAPI();
  const { user, profileChanged, setProfileChanged } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const log = useRef(createLogger("GameGrid")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  const [games, setGames] = useState<GameInfo[]>([]);
  const [providers, setProviders] = useState<GameProvider[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<"asc" | "desc" | "popular" | "new">("popular");
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [noMoreGames, setNoMoreGames] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const userId = user?.id;

  const limit = 12;

  const fetchGames = async (append: boolean = false) => {
    if (!client || !user) return;
    setLoading(true);
    log.info("Fetching games", {
      op_id: opId,
      append,
      filters: { search, selectedProviders, sortOption, showOnlyFavorites },
      offset: append ? games.length : 0,
    });

    try {
      const lastGame = append && games.length ? games[games.length - 1] : null;

      const lastName = lastGame?.name ?? null;
      const lastUuid = lastGame?.uuid ?? null;

      const lastTxCount =
        (sortOption === "popular" || sortOption === "new") && lastGame && "tx_count" in (lastGame as any)
          ? (lastGame as any).tx_count ?? null
          : null;

      const lastCreatedAt =
        sortOption === "new" && lastGame
          ? ((lastGame as any).created_at ??
             (lastGame as any).createdAt ??
             null)
          : null;

      const { games: fetchedGames, providers: fetchedProviders } = await client.getGames(
        user.id,
        search,
        selectedProviders,
        sortOption,
        showOnlyFavorites,
        limit,
        sortOption === "asc" || sortOption === "desc" ? lastName : null,
        lastUuid,
        lastTxCount,
        lastCreatedAt
      );

      log.debug("Fetched games result", {
        op_id: opId,
        fetched_count: fetchedGames.length,
        providers_count: fetchedProviders.length,
      });

      setGames((prev) => (append ? [...prev, ...fetchedGames] : fetchedGames));
      setProviders(fetchedProviders);
      setNoMoreGames(fetchedGames.length < limit);
    } catch (error) {
      log.error("Failed to fetch games", { op_id: opId, error });
      console.error("Failed to fetch games:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialProvider = searchParams.get("provider");
    if (initialProvider) {
      log.info("Initial provider from query", { op_id: opId, provider: initialProvider });
      setSelectedProviders([initialProvider]);
    }
    setInitialized(true);
  }, [searchParams]);

  useEffect(() => {
    if (!initialized || !client || !userId) return;

    if (profileChanged) {
      log.info("Profile changed, skipping games reload", { op_id: opId });
      setProfileChanged(false);
      return;
    }

    log.info("Reloading games due to filters change", {
      op_id: opId,
      search,
      selectedProviders,
      sortOption,
      showOnlyFavorites,
    });

    setGames([]);
    setNoMoreGames(false);
    fetchGames(false);
  }, [initialized, client, userId, search, selectedProviders.join(","), sortOption, showOnlyFavorites]);

  return (
    <div className={`${styles.container}`}>
      <GameFilters
        search={search}
        setSearch={(val) => {
          log.debug("Search updated", { op_id: opId, value: val });
          setSearch(val);
        }}
        showOnlyFavorites={showOnlyFavorites}
        setShowOnlyFavorites={(val) => {
          log.debug("Show only favorites updated", { op_id: opId, value: typeof val === "function" ? "fn" : val });
          setShowOnlyFavorites(val);
        }}
        sortOption={sortOption}
        setSortOption={(val) => {
          log.debug("Sort option updated", { op_id: opId, value: val });
          setSortOption(val);
        }}
        providers={providers}
        selectedProviders={selectedProviders}
        setSelectedProviders={(val) => {
          log.debug("Selected providers updated", {
            op_id: opId,
            value: typeof val === "function" ? "fn" : val,
          });
          setSelectedProviders(val);
        }}
      />
      <GameList
        games={games}
        router={router}
        loading={loading}
        noMoreGames={noMoreGames}
        fetchGames={fetchGames}
      />
    </div>
  );
}
