import { Fingerprint } from "@/types/api_client";

export const getClientIP = async (): Promise<string | null> => {
  try {
    const url = `${process.env.NEXT_PUBLIC_SKYLON_API_URL}/auth/ping/ip`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[getClientIP] Non-OK response: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.ip || null;
  } catch (error) {
    console.warn("[getClientIP] Failed to fetch IP:", error);
    return null;
  }
};

const parseDeviceInfo = (
  ua: string
): { os: string; browser: string; deviceType: "desktop" | "mobile" | "tablet" | "unknown" } => {
  const uaLower = ua.toLowerCase();

  let os = "unknown";
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os")) os = "macOS";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
  else if (uaLower.includes("linux")) os = "Linux";

  let browser = "unknown";
  if (uaLower.includes("edg")) browser = "Edge";
  else if (uaLower.includes("firefox")) browser = "Firefox";
  else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
  else if (uaLower.includes("chrome")) browser = "Chrome";

  let deviceType: "desktop" | "mobile" | "tablet" | "unknown" = "unknown";
  if (/mobi|android|iphone|ipad/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet/i.test(ua)) {
    deviceType = "tablet";
  } else {
    deviceType = "desktop";
  }

  return { os, browser, deviceType };
};


export const getClientFingerprint = (): Fingerprint => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      userAgent: "",
      language: "",
      platform: "",
      screenRes: "",
      timezone: "",
      os: "unknown",
      browser: "unknown",
      deviceType: "unknown",
    };
  }

  const ua = navigator.userAgent || "";
  const parsed = parseDeviceInfo(ua);

  return {
    userAgent: ua,
    language: navigator.language || "",
    platform: navigator.platform || "",
    screenRes: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    ...parsed,
  };
};
