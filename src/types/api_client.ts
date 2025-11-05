// Ответы авторизации
export interface VerifyResponse {
  ok: boolean;
  reason?: "geo_block" | "invalid_data";
}

// Пользователь
export interface RawUserInfo {
  user_id: number;
  user_firstname?: string | null;
  user_name?: string | null;
  is_hidden: number;
  block: number;
}

export interface BalanceInfo {
  balance: number;
}

export interface ParsedUser {
  id: number;
  name: string;
  is_hidden: boolean;
  block: number;
  balance: number;
  avatar_url?: string | null;
}

// Игры
export interface GameInfo {
  uuid: string;
  name: string;
  provider: string;
  image: string | null;
  is_favorite: boolean;
  tx_count?: number | null;
  created_at?: string | null;
}

export interface GameProvider {
  provider: string;
  label?: string | null;
  image_url?: string | null;
  game_count: number;
  supports_demo: boolean;
}

export interface GamesResponse {
  games: GameInfo[];
  providers: GameProvider[];
}

export interface GameDetails {
  uuid: string;
  name: string;
  provider: GameProvider;
  image: string | null;
  rtp: number | null;
  volatility: string | null;
  is_mobile: boolean;
  has_freespins: boolean;
  is_favorite: boolean;
}

export interface BigWin {
  user_id: number;
  user_name: string;
  is_hidden: number;
  payout: number;
  date: number;
}

export interface BigWinsResponse {
  big_wins: BigWin[];
}

export interface LuckyBet {
  user_id: number;
  user_name: string;
  is_hidden: number;
  average_payout: number;
  bet_count: number;
  date: number;
}

export interface LuckyBetsResponse {
  lucky_bets: LuckyBet[];
}

export interface TopPlayerToday {
  user_id: number;
  user_name: string;
  is_hidden: number;
  total_bet: number;
  bet_count: number;
  date: number;
}

export interface TopPlayersTodayResponse {
  top_players_today: TopPlayerToday[];
}

export interface GameProvider {
  provider: string;
  label?: string | null;
  image_url?: string | null;
}

export interface TransactionEntry {
  id: number;
  user_id: number;
  user_name: string;
  amount: number;
  comment: string;
  create_date: number;
  game_uuid: string;
  source: string;
  type: string;
  slot_name: string;
}

export interface Fingerprint {
  userAgent?: string | null;
  language?: string | null;
  platform?: string | null;
  screenRes?: string | null;
  timezone?: string | null;
  os?: string | null;
  browser?: string | null;
  deviceType?: string | null;
}

export interface SlotsAccessResponse {
  can_play: boolean;
  required_deposit: number;
  active_promo_total: number;
  promo_bonus: number;
  promo_freespins: number;
  freespin_allowed_game_uuids: string[];
}