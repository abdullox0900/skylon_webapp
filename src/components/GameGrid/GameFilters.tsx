import styles from "@/styles/GameGrid/GameFilters.module.css";
import { useState, useEffect, useRef } from "react";
import type { GameProvider } from "@/types/api_client";
import skins from "@/styles/skins.module.css";
import { createLogger } from "@/utils/logger";

interface Props {
  search: string;
  setSearch: (val: string) => void;
  showOnlyFavorites: boolean;
  setShowOnlyFavorites: React.Dispatch<React.SetStateAction<boolean>>;
  sortOption: "asc" | "desc" | "popular" | "new";
  setSortOption: (val: "asc" | "desc" | "popular" | "new") => void;
  providers: GameProvider[];
  selectedProviders: string[];
  setSelectedProviders: (val: string[] | ((prev: string[]) => string[])) => void;
}

export default function GameFilters({
  search,
  setSearch,
  showOnlyFavorites,
  setShowOnlyFavorites,
  sortOption,
  setSortOption,
  providers,
  selectedProviders,
  setSelectedProviders,
}: Props) {
  const [showSortMenu, setShowSortMenu] = useState<boolean>(false);
  const [showProviderMenu, setShowProviderMenu] = useState<boolean>(false);
  const [sortedProviders, setSortedProviders] = useState<GameProvider[]>([]);

  const log = useRef(createLogger("GameFilters")).current;
  const opId = useRef(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).current;

  const toggleProvider = (provider: string) => {
    setSelectedProviders((prev: string[]) => {
      const isSelected = prev.includes(provider);
      log.info("Provider selection toggled", { op_id: opId, provider, selected: !isSelected });
      return isSelected ? prev.filter((p) => p !== provider) : [...prev, provider];
    });
  };

  useEffect(() => {
    if (showProviderMenu) {
      const ordered = [
        ...providers.filter(p => selectedProviders.includes(p.provider)),
        ...providers.filter(p => !selectedProviders.includes(p.provider)),
      ];
      setSortedProviders(ordered);
      log.debug("Providers menu opened", { op_id: opId, selected_count: selectedProviders.length });
    }
  }, [showProviderMenu]);

  const sortLabel =
    sortOption === "asc" ? "От A до Z"
    : sortOption === "desc" ? "От Z до A"
    : sortOption === "popular" ? "Популярные"
    : "Новые";

  return (
    <div className={styles.controls}>
      <div className={styles.topControlsRow}>
        <div className={`${styles.searchBlock}`}>
          <span className={styles.searchIcon}></span>
          <input
            type="text"
            placeholder="Поиск"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              log.debug("Search updated", { op_id: opId, query: e.target.value });
            }}
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.bottomControlsRow}>
        <div className={styles.providersToggle}>
          <button
            onClick={() => {
              setShowSortMenu(!showSortMenu);
              log.debug("Sort menu toggled", { op_id: opId, opened: !showSortMenu });
            }}
            className={`${styles.filterButton} ${showSortMenu ? styles.active : ""}`}
          >
            {sortLabel}
          </button>
          {showSortMenu && (
            <div className={`${styles.sortMenu}`}>
              {(["new", "popular", "asc", "desc"] as const).map(option => (
                <div
                  key={option}
                  className={sortOption === option ? styles.activeOption : ""}
                  onClick={() => {
                    setSortOption(option);
                    setShowSortMenu(false);
                    log.info("Sort option changed", { op_id: opId, option });
                  }}
                >
                  {option === "new"
                    ? "Новые"
                    : option === "popular"
                    ? "Популярные"
                    : option === "asc"
                    ? "От A до Z"
                    : "От Z до A"}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.providersToggle}>
          <button
            onClick={() => {
              setShowProviderMenu(!showProviderMenu);
              log.debug("Provider menu toggled", { op_id: opId, opened: !showProviderMenu });
            }}
            className={`${styles.filterButton} ${showProviderMenu ? styles.active : ""}`}
          >
            Провайдеры
          </button>
          {showProviderMenu && (
            <div className={`${styles.sortMenu}`}>
              {sortedProviders.map(provider => (
                <label key={provider.provider} className={styles.providerItem}>
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes(provider.provider)}
                    onChange={() => toggleProvider(provider.provider)}
                  />
                  <span>{provider.label || provider.provider} ({provider.game_count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
