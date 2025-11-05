import {
  VerifyResponse, RawUserInfo, BalanceInfo, ParsedUser, GamesResponse,
  GameDetails, BigWinsResponse, LuckyBetsResponse,
  TopPlayersTodayResponse, BigWin, LuckyBet, TopPlayerToday,
  GameProvider, TransactionEntry, Fingerprint, 
  SlotsAccessResponse
} from "@/types/api_client";

export type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export class SkylonAPIClient {
  private initData: string;

  constructor(initData: string) {
    this.initData = initData;
  }

  private async proxy<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, string | number | undefined | null>
  ): Promise<T>;
  private async proxy(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, string | number | undefined | null>
  ): Promise<void>;

  private async proxy<T>(
    method: string,
    path: string,
    data?: any,
    params?: Record<string, string | number | undefined | null>
  ): Promise<T | void> {
    const response = await fetch("/api/skylon-proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, method, params, data }),
    });

    if (response.status === 204 || response.status === 205) {
      return;
    }

    const ct = response.headers.get("content-type") || "";
    const body = ct.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      const detail =
        (body && (body.detail || body.message)) || `HTTP ${response.status}`;
      throw new Error(detail);
    }

    return body as T;
  }
  async verifyUser(
    clientIp?: string,
    fingerprint?: Fingerprint
  ): Promise<"ok" | "geo_block" | "invalid_data"> {
    try {
      const payload: any = {
        init_data: this.initData,
      };

      if (clientIp) payload.client_ip = clientIp;
      if (fingerprint) Object.assign(payload, fingerprint);

      const result = await this.proxy<VerifyResponse>(
        "POST",
        "/auth/verify_webapp_user",
        payload
      );

      return result.ok ? "ok" : (result.reason ?? "invalid_data");
    } catch (err: any) {
      return "invalid_data";
    }
  }
  async getUser(userId: number): Promise<ParsedUser> {
    const raw = await this.proxy<RawUserInfo>("GET", `/users/user_info/${userId}`);
    const balanceData = await this.proxy<BalanceInfo>("GET", `/users/balance/${userId}`);
    return {
      id: raw.user_id,
      name: raw.user_firstname?.trim() || "Аноним",
      is_hidden: raw.is_hidden === 1,
      block: raw.block,
      balance: balanceData.balance,
    };
  }

  async getUserBalance(userId: number): Promise<number> {
    const result = await this.proxy<BalanceInfo>("GET", `/users/balance/${userId}`);
    return result.balance;
  }

  async updateUserHiddenStatus(userId: number, isHidden: boolean): Promise<ParsedUser> {
    const raw = await this.proxy<RawUserInfo>("PATCH", `/users/user_update/${userId}`, { is_hidden: isHidden ? 1 : -1 });
    const balanceData = await this.proxy<BalanceInfo>("GET", `/users/balance/${userId}`);
    return {
      id: raw.user_id,
      name: raw.user_firstname?.trim() || "Аноним",
      is_hidden: raw.is_hidden === 1,
      block: raw.block,
      balance: balanceData.balance,
    };
  }

  async getGames(
    userId: number,
    search = "",
    providers: string[] = [],
    sortOrder: "asc" | "desc" | "popular" | "new" = "popular",
    onlyFavorites = false,
    limit = 12,
    lastName: string | null = null,
    lastUuid: string | null = null,
    lastTxCount: number | null = null,
    lastCreatedAt: string | null = null,
  ): Promise<GamesResponse> {
    const isPopular = sortOrder === "popular";
    const isNew = sortOrder === "new";

    const params = new URLSearchParams();
    params.set("search", search);
    params.set("sort_order", sortOrder);
    params.set("limit", limit.toString());
    params.set("user_id", userId.toString());

    if (onlyFavorites) params.set("only_favorites", "true");

    if ((sortOrder === "asc" || sortOrder === "desc") && lastName) {
      params.set("last_name", lastName);
    }
    if (lastUuid) params.set("last_uuid", lastUuid);
    if ((isPopular || isNew) && lastTxCount != null) {
      params.set("last_tx_count", lastTxCount.toString());
    }
    if (isNew && lastCreatedAt) {
      params.set("last_created_at", lastCreatedAt);
    }

    for (const provider of providers) {
      params.append("providers", provider);
    }

    return await this.proxy<GamesResponse>("GET", `/slotegrator/games?${params.toString()}`);
  }

  async toggleFavorite(gameUuid: string, userId: number, isFavorite: boolean): Promise<void> {
    const method = isFavorite ? "DELETE" : "POST";
    const path = `/slotegrator/games/favorite/${gameUuid}`;
    await this.proxy(method, path, null, { user_id: userId });
  }

  async initDemoSession(gameUuid: string): Promise<string> {
    const path = "/slotegrator/games/init-demo";
    const result = await this.proxy<{ url: string }>("POST", path, { game_uuid: gameUuid });
    return result.url;
  }

  async initGameSession(gameUuid: string, userId: number): Promise<string> {
    const path = "/slotegrator/games/init";
    const payload = { user_id: userId, game_uuid: gameUuid };
    const result = await this.proxy<{ url: string }>("POST", path, payload);
    return result.url;
  }

  async getGameInfo(gameUuid: string, userId?: number): Promise<GameDetails> {
    return await this.proxy<GameDetails>(
      "GET",
      `/slotegrator/games/info/${gameUuid}`,
      null,
      { user_id: userId }
    );
  }

  async getMyBets(userId: number, gameUuid?: string, limit = 10): Promise<TransactionEntry[]> {
    return await this.proxy("GET", "/slotegrator/statistics/my_bets_list", null, { user_id: userId, game_uuid: gameUuid, limit });
  }

  async getTotalBets(gameUuid?: string, limit = 10): Promise<TransactionEntry[]> {
    return await this.proxy("GET", "/slotegrator/statistics/total_bets_list", null, { game_uuid: gameUuid, limit });
  }

  async getHighBetPlayers(gameUuid?: string, limit = 10): Promise<TransactionEntry[]> {
    return await this.proxy("GET", "/slotegrator/statistics/high_bets_list", null, { game_uuid: gameUuid, limit });
  }

  async getBigWins(gameUuid: string, limit = 10): Promise<BigWin[]> {
    const result = await this.proxy<BigWinsResponse>("GET", "/slotegrator/statistics/game/big_wins", null, { game_uuid: gameUuid, limit });
    return result.big_wins;
  }

  async getLuckyBets(gameUuid: string, limit = 10): Promise<LuckyBet[]> {
    const result = await this.proxy<LuckyBetsResponse>("GET", "/slotegrator/statistics/game/lucky_bets", null, { game_uuid: gameUuid, limit });
    return result.lucky_bets;
  }

  async getTopPlayersToday(gameUuid: string, limit = 10): Promise<TopPlayerToday[]> {
    const result = await this.proxy<TopPlayersTodayResponse>("GET", "/slotegrator/statistics/game/top_players_today", null, { game_uuid: gameUuid, limit });
    return result.top_players_today;
  }

  async getProviders(userId?: number): Promise<GameProvider[]> {
    return await this.proxy<GameProvider[]>(
      "GET",
      "/slotegrator/providers",
      null,
      { user_id: userId }
    );
  }

  async sendLogsBatch(
    entries: Array<{ ts_ms: number; level: LogLevel; msg: string; ctx?: any }>,
    labels?: Record<string, string>
  ): Promise<void> {
    try {
      await this.proxy(
        "POST",
        "/webapp/logs",
        {
          labels: {
            app: "skylon_webapp",
            env: process.env.NODE_ENV || "dev",
            ...(labels || {}),
          },
          entries,
        }
      );
    } catch {
    }
  }

  async sendLog(level: LogLevel, msg: string, ctx?: any): Promise<void> {
    return this.sendLogsBatch([{ ts_ms: Date.now(), level, msg, ctx }]);
  }
  
  sendLogsBeacon(
    entries: Array<{ ts_ms: number; level: LogLevel; msg: string; ctx?: any }>,
    labels?: Record<string, string>
  ): boolean {
    try {
      if (!("sendBeacon" in navigator)) return false;

      const payload = {
        path: "/webapp/logs",
        method: "POST",
        data: {
          labels: {
            app: "skylon_webapp",
            env: process.env.NODE_ENV || "dev",
            ...(labels || {}),
          },
          entries,
        },
      };

      const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
      return navigator.sendBeacon("/api/skylon-proxy", blob);
    } catch {
      return false;
    }
  }

  async getSlotsAccess(userId: number): Promise<SlotsAccessResponse> {
    const raw = await this.proxy<{
      can_play: boolean;
      required_deposit: string;
      active_promo_total: string;
      promo_bonus: string;
      promo_freespins: string;
      freespin_allowed_game_uuids: string[];
    }>("GET", "/promos/slots_access", null, { user_id: userId });

    return {
      can_play: raw.can_play,
      required_deposit: Number(raw.required_deposit) || 0,
      active_promo_total: Number(raw.active_promo_total) || 0,
      promo_bonus: Number(raw.promo_bonus) || 0,
      promo_freespins: Number(raw.promo_freespins) || 0,
      freespin_allowed_game_uuids: Array.isArray(raw.freespin_allowed_game_uuids)
        ? raw.freespin_allowed_game_uuids
        : [],
    };
  }
}
