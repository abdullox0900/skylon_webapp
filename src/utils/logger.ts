import { SkylonAPIClient } from "@/utils/skylon_api_client";

type Level = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";
type LogItem = { ts_ms: number; level: Level; msg: string; ctx?: any; context?: string };

let clientRef: SkylonAPIClient | null = null;
let currentUserId: number | null = null;
let initSent = false;

const QUEUE: LogItem[] = [];
const MAX_QUEUE = 1000;
const FLUSH_INTERVAL_MS = 300;
const SEND_TIMEOUT_MS = 4000;

let timer: number | null = null;
let inFlush = false;              // защита от реентрантности/пере‑flush
let suppressAuto = false;         // защита от рекурсий при перехвате console.*

const APP_LABEL = "skylon_webapp";
const ENV_LABEL = process.env.NODE_ENV || "dev";

function safeStringify(v: any) {
  try { return JSON.stringify(v, replacer, 1000); } catch { return String(v); }
  function replacer(_k: string, val: any) {
    if (typeof val === "string" && val.length > 10_000) return val.slice(0, 10_000) + "…";
    return val;
  }
}

function labels() {
  const L: Record<string, string> = { app: APP_LABEL, env: ENV_LABEL };
  if (currentUserId != null) L.user_id = String(currentUserId);
  return L;
}

function enqueue(item: LogItem) {
  try {
    // drop-oldest при переполнении — не даём расти памяти
    if (QUEUE.length >= MAX_QUEUE) QUEUE.splice(0, QUEUE.length - MAX_QUEUE + 1);
    QUEUE.push(item);
    if (timer == null) timer = window.setTimeout(() => { timer = null; flush(); }, FLUSH_INTERVAL_MS);
  } catch { /* глушим любые неожиданные ошибки */ }
}

async function sendWithTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise((_r, rej) => setTimeout(() => rej(new Error("log_send_timeout")), ms)) as Promise<never>,
  ]);
}

async function flush() {
  if (inFlush || !clientRef || !QUEUE.length) return;
  inFlush = true;
  const batch = QUEUE.splice(0, QUEUE.length).map(e => ({
    ts_ms: e.ts_ms,
    level: e.level,
    msg: e.msg,
    ctx: { ...(e.ctx || {}), user_id: currentUserId, context: e.context },
  }));

  try {
    suppressAuto = true; // не перехватывать наши же console.* во время отправки
    await sendWithTimeout(clientRef.sendLogsBatch(batch, labels()), SEND_TIMEOUT_MS);
  } catch {
    // глушим, чтобы не падал UI; можно добавить бэк‑офф, если хочется
  } finally {
    suppressAuto = false;
    inFlush = false;
  }
}

export function bindClient(client: SkylonAPIClient) {
  clientRef = client;
  // мягко пытаемся слить накопленное
  try { flush(); } catch { /* no-op */ }
}

export function setUserId(id: number | null) { currentUserId = id ?? null; }

export async function sendInitOnce(init_data: string, extra?: Record<string, unknown>) {
  if (!clientRef || initSent) return;
  initSent = true;
  const batch = [{
    ts_ms: Date.now(),
    level: "INFO" as const,
    msg: "webapp_verified",
    ctx: { ...(extra || {}), init_data, user_id: currentUserId },
  }];
  try {
    suppressAuto = true;
    await sendWithTimeout(clientRef.sendLogsBatch(batch, labels()), SEND_TIMEOUT_MS);
  } catch { /* игнорируем */ }
  finally { suppressAuto = false; }
}

function emit(level: Level, message: string, ctx?: any, context?: string) {
  try {
    enqueue({ ts_ms: Date.now(), level, msg: message, ctx, context });
  } catch { /* no-op */ }
}

export function createLogger(context?: string) {
  const ctxName = context;
  return {
    setUserId: (id: number | null) => setUserId(id),
    debug: (m: string, c?: any) => emit("DEBUG", m, c, ctxName),
    info:  (m: string, c?: any) => emit("INFO", m, c, ctxName),
    warn:  (m: string, c?: any) => emit("WARNING", m, c, ctxName),
    error: (m: string, c?: any) => emit("ERROR", m, c, ctxName),
    critical: (m: string, c?: any) => emit("CRITICAL", m, c, ctxName),
  };
}

export function setupAutoLogger() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__skylonAutoLoggerAttached) return;
  w.__skylonAutoLoggerAttached = true;

  const orig = { log: console.log, warn: console.warn, error: console.error };

  try {
    const isProd = process.env.NODE_ENV === "production";
    const wrap: Array<"log"|"warn"|"error"> = isProd ? ["log","warn","error"] : ["warn","error"];
    wrap.forEach((level) => {
      console[level] = (...args: any[]) => {
        try {
          if (suppressAuto) return orig[level](...args);
          const msg = args.map(a => (typeof a === "string" ? a : safeStringify(a))).join(" ");
          // не логируем свои служебные сообщения и не допускаем рекурсии
          if (msg.startsWith("[Logger]")) return orig[level](...args);
          const lvl = (level === "log" ? "INFO" : level.toUpperCase()) as Level;
          emit(lvl, msg, { source: "console" }, "auto");
        } catch { /* no-op */ }
        return orig[level](...args);
      };
    });
  } catch { /* если консоль запатчить нельзя — просто пропустим */ }

  try {
    const prevOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      try {
        emit("ERROR", String(message), {
          source, lineno, colno,
          stack: (error as any)?.stack,
          kind: "window.onerror",
        }, "auto");
      } catch { /* no-op */ }
      return typeof prevOnError === "function"
        ? (prevOnError as any)(message, source, lineno, colno, error)
        : false;
    };

    window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
      try {
        const r: any = event.reason;
        emit("ERROR", "Unhandled promise rejection", {
          reason: typeof r === "string" ? r : r?.message ?? String(r),
          stack: r?.stack,
          kind: "unhandledrejection",
        }, "auto");
      } catch { /* no-op */ }
    });

    // На выгрузке — дожимаем очередь Beacon’ом (не блокирует навигацию)
    const drain = () => {
      try {
        if (!QUEUE.length) return;
        const payload = {
          batch: QUEUE.splice(0, QUEUE.length).map(e => ({
            ts_ms: e.ts_ms, level: e.level, msg: e.msg,
            ctx: { ...(e.ctx || {}), user_id: currentUserId, context: e.context },
          })),
          labels: labels(),
        };
        if (clientRef?.sendLogsBeacon?.(payload.batch, payload.labels)) {
          // отправили Beacon'ом, ок
        } else {
          // fallback — не ждём ответа и не бросаем ошибок
          void clientRef?.sendLogsBatch(payload.batch, payload.labels);
        }
      } catch { /* no-op */ }
    };
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") drain();
    });
    window.addEventListener("pagehide", drain);
    window.addEventListener("beforeunload", drain);
  } catch { /* no-op */ }
}
