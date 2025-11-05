import { NextRequest, NextResponse } from "next/server";

type Rule = {
  methods: ("GET" | "POST" | "DELETE" | "PATCH")[];
  requireSession?: boolean;
  overrideUserIdParam?: boolean;
  overrideUserIdBody?: boolean;
  bodyAllowedKeys?: string[];
};

const ALLOWLIST: Record<string, Rule> = {
  "^/auth/verify_webapp_user$": { methods: ["POST"], requireSession: false },
  "^/slotegrator/providers$": { methods: ["GET"], requireSession: true },
  "^/slotegrator/games$": { methods: ["GET"], requireSession: true, overrideUserIdParam: true },
  "^/slotegrator/games/info/[^/]+$": { methods: ["GET"], requireSession: true, overrideUserIdParam: true },
  "^/slotegrator/games/init-demo$": { methods: ["POST"], requireSession: true },
  "^/slotegrator/games/init$": { methods: ["POST"], requireSession: true, overrideUserIdBody: true },
  "^/slotegrator/games/favorite/[^/]+$": { methods: ["POST","DELETE"], requireSession: true, overrideUserIdParam: true },
  "^/slotegrator/statistics/my_bets_list$": { methods: ["GET"], requireSession: true, overrideUserIdParam: true },
  "^/slotegrator/statistics/total_bets_list$": { methods: ["GET"], requireSession: true },
  "^/slotegrator/statistics/high_bets_list$": { methods: ["GET"], requireSession: true },
  "^/slotegrator/statistics/game/big_wins$": { methods: ["GET"], requireSession: true },
  "^/slotegrator/statistics/game/lucky_bets$": { methods: ["GET"], requireSession: true },
  "^/slotegrator/statistics/game/top_players_today$": { methods: ["GET"], requireSession: true },
  "^/promos/slots_access$": { methods: ["GET"], requireSession: true, overrideUserIdParam: true },
  "^/users/user_info/\\d+$": { methods: ["GET"], requireSession: true },
  "^/users/balance/\\d+$": { methods: ["GET"], requireSession: true },
  "^/webapp/logs$": { methods: ["POST"], requireSession: false },
  "^/users/user_update/\\d+$": {
    methods: ["PATCH"],
    requireSession: true,
    bodyAllowedKeys: ["is_hidden"]
  },
};

function matchRule(pathOnly: string): Rule | null {
  for (const [pattern, rule] of Object.entries(ALLOWLIST)) {
    if (new RegExp(pattern).test(pathOnly)) return rule;
  }
  return null;
}

function extractClientIp(req: NextRequest): string | null {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xr = req.headers.get("x-real-ip");
  if (xr) return xr.trim();
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { path, method = "GET", params, data } = await req.json();
    if (!path) return NextResponse.json({ detail: "Missing `path`" }, { status: 400 });

    const pathOnly = String(path).split("?")[0];
    const rule = matchRule(pathOnly);
    if (!rule || !rule.methods.includes(method as any)) {
      return NextResponse.json({ detail: "Forbidden route" }, { status: 403 });
    }

    const apiSessionCookie = req.cookies.get("wx")?.value || "";
    if (rule.requireSession && !apiSessionCookie) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const query = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === "None" || v === "") continue;
        query.append(k, String(v));
      }
    }

    let outgoingData: any = data ? { ...(data as any) } : undefined;
    if (pathOnly === "/auth/verify_webapp_user") {
      const ip = extractClientIp(req);
      if (!outgoingData) outgoingData = {};
      if (ip && !outgoingData.client_ip) outgoingData.client_ip = ip;
    }

    let body: string | undefined = undefined;
    if (method !== "GET" && method !== "HEAD") {
      const incoming = outgoingData || {};
      if (rule.bodyAllowedKeys) {
        for (const key of Object.keys(incoming)) {
          if (!rule.bodyAllowedKeys.includes(key)) {
            return NextResponse.json({ detail: "Forbidden field" }, { status: 403 });
          }
        }
      }
      body = JSON.stringify(incoming);
    }

    const base = process.env.SKYLON_API_URL!;
    const extraQuery = query.toString();
    const hasQueryInPath = String(path).includes("?");
    const url =
      `${base}${path}` + (extraQuery ? (hasQueryInPath ? `&${extraQuery}` : `?${extraQuery}`) : "");

    const serviceToken = process.env.SKYLON_API_TOKEN!;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-From-Service": "skylon_webapp",
      Authorization: serviceToken,
      ...(apiSessionCookie ? { Cookie: `wx=${apiSessionCookie}` } : {}),
    };

    const xffIn = req.headers.get("x-forwarded-for");
    const clientIp = extractClientIp(req);
    if (clientIp) {
      headers["X-Forwarded-For"] = xffIn ? `${xffIn}, ${clientIp}` : clientIp;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" && method !== "HEAD" ? body : undefined,
    });

    const resHeaders = new Headers();
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) resHeaders.append("set-cookie", setCookie);

    if (response.status === 204 || response.status === 205) {
      return new Response(null, { status: response.status, headers: resHeaders });
    }

    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const json = await response.json().catch(() => null);
      resHeaders.set("Content-Type", "application/json");
      return new Response(JSON.stringify(json), { status: response.status, headers: resHeaders });
    } else {
      const text = await response.text().catch(() => "");
      resHeaders.set("Content-Type", "text/plain");
      return new Response(text, { status: response.status, headers: resHeaders });
    }
  } catch (error: any) {
    const msg = String(error?.message || "");
    const isSyntax = msg.toLowerCase().includes("json");
    return NextResponse.json(
      { detail: isSyntax ? "Bad JSON" : (msg || "Proxy error") },
      { status: isSyntax ? 400 : 500 }
    );
  }
}
