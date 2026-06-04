const SESSION_KEY = "ol_waitlist_session";
const UTM_KEY = "ol_waitlist_utm";

export type WaitlistUtm = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  ref: string | null;
};

function readParam(params: URLSearchParams, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = params.get(key);
    if (v?.trim()) return v.trim();
  }
  return null;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function captureUtmFromUrl(search?: string): WaitlistUtm {
  if (typeof window === "undefined") {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      ref: null,
    };
  }
  const params = new URLSearchParams(search ?? window.location.search);
  const utm: WaitlistUtm = {
    utmSource: readParam(params, "utm_source", "utmSource"),
    utmMedium: readParam(params, "utm_medium", "utmMedium"),
    utmCampaign: readParam(params, "utm_campaign", "utmCampaign"),
    utmContent: readParam(params, "utm_content", "utmContent"),
    ref: readParam(params, "ref", "r"),
  };
  sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
  return utm;
}

export function getStoredUtm(): WaitlistUtm {
  if (typeof window === "undefined") {
    return {
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      ref: null,
    };
  }
  try {
    const raw = sessionStorage.getItem(UTM_KEY);
    if (raw) return JSON.parse(raw) as WaitlistUtm;
  } catch {
    /* ignore */
  }
  return captureUtmFromUrl();
}

export function redditShareUrl(baseUrl: string, subreddit?: string): string {
  const url = new URL("/join", baseUrl.replace(/\/$/, ""));
  url.searchParams.set("utm_source", "reddit");
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", subreddit ? `r_${subreddit}` : "reddit_launch");
  if (subreddit) url.searchParams.set("ref", `r/${subreddit}`);
  return url.toString();
}
