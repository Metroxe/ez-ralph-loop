/**
 * Anthropic OAuth usage fetching, caching, and throttle checking.
 *
 * Reads the OAuth token from ~/.claude/.credentials.json and fetches
 * utilization data from the undocumented Anthropic usage endpoint.
 */

import type { UsageBucket, UsageData, ThrottleConfig } from "./types.js";

// ─── Credential Reading ─────────────────────────────────────────────────

let cachedToken: string | null | undefined; // undefined = not yet read

async function readOAuthToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken;

  try {
    const home = process.env.HOME || "~";
    const file = Bun.file(`${home}/.claude/.credentials.json`);
    if (!(await file.exists())) {
      cachedToken = null;
      return null;
    }
    const content = await file.json();
    const token = content?.claudeAiOauth?.accessToken;
    cachedToken = typeof token === "string" ? token : null;
    return cachedToken;
  } catch {
    cachedToken = null;
    return null;
  }
}

// ─── API Fetch with Cache ───────────────────────────────────────────────

let cachedUsage: UsageData | null = null;
let fetchInProgress: Promise<UsageData | null> | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * Fetch usage data from the Anthropic OAuth usage endpoint.
 * Returns cached data if fresh (within 60s), deduplicates concurrent calls.
 * Never throws — returns stale cached data or null on error.
 */
export async function fetchUsage(forceRefresh = false): Promise<UsageData | null> {
  // Return cached data if still fresh
  if (!forceRefresh && cachedUsage && Date.now() - cachedUsage.fetchedAt < CACHE_TTL_MS) {
    return cachedUsage;
  }

  // Deduplicate concurrent fetches
  if (fetchInProgress) return fetchInProgress;

  fetchInProgress = doFetch();
  try {
    return await fetchInProgress;
  } finally {
    fetchInProgress = null;
  }
}

async function doFetch(): Promise<UsageData | null> {
  const token = await readOAuthToken();
  if (!token) return null;

  try {
    const response = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return cachedUsage; // return stale data
    }

    const data = await response.json();
    const usage = parseUsageResponse(data);
    cachedUsage = usage;
    return usage;
  } catch {
    return cachedUsage; // return stale data on network error
  }
}

function parseBucket(raw: unknown): UsageBucket | null {
  const b = raw as { utilization?: number; resets_at?: string } | null;
  if (!b || typeof b.utilization !== "number") return null;
  return {
    utilization: Math.round(b.utilization),
    resetsAt: b.resets_at || "",
  };
}

function parseUsageResponse(data: unknown): UsageData {
  const d = data as Record<string, unknown>;
  return {
    fiveHour: parseBucket(d.five_hour),
    sevenDay: parseBucket(d.seven_day),
    sevenDaySonnet: parseBucket(d.seven_day_sonnet),
    sevenDayOpus: parseBucket(d.seven_day_opus),
    fetchedAt: Date.now(),
  };
}

// ─── Throttle Check ─────────────────────────────────────────────────────

export interface ThrottleHit {
  bucket: string;
  utilization: number;
  threshold: number;
  resetsAt: string;
}

/**
 * Check whether any usage bucket exceeds its configured threshold.
 * Returns the first bucket that exceeds, or null if all OK.
 */
export function checkThrottle(
  usage: UsageData,
  model: string | undefined,
  thresholds: ThrottleConfig,
): ThrottleHit | null {
  // Check 5h bucket
  if (thresholds.fiveHour > 0 && usage.fiveHour && usage.fiveHour.utilization >= thresholds.fiveHour) {
    return {
      bucket: "5h",
      utilization: usage.fiveHour.utilization,
      threshold: thresholds.fiveHour,
      resetsAt: usage.fiveHour.resetsAt,
    };
  }

  // Check 7d bucket
  if (thresholds.sevenDay > 0 && usage.sevenDay && usage.sevenDay.utilization >= thresholds.sevenDay) {
    return {
      bucket: "7d",
      utilization: usage.sevenDay.utilization,
      threshold: thresholds.sevenDay,
      resetsAt: usage.sevenDay.resetsAt,
    };
  }

  // Check model-specific bucket
  if (thresholds.sonnet > 0) {
    const isOpus = model && model.toLowerCase().includes("opus");
    if (isOpus) {
      if (usage.sevenDayOpus && usage.sevenDayOpus.utilization >= thresholds.sonnet) {
        return {
          bucket: "opus",
          utilization: usage.sevenDayOpus.utilization,
          threshold: thresholds.sonnet,
          resetsAt: usage.sevenDayOpus.resetsAt,
        };
      }
    } else {
      // Default to sonnet bucket (covers sonnet + unspecified model)
      if (usage.sevenDaySonnet && usage.sevenDaySonnet.utilization >= thresholds.sonnet) {
        return {
          bucket: "sonnet",
          utilization: usage.sevenDaySonnet.utilization,
          threshold: thresholds.sonnet,
          resetsAt: usage.sevenDaySonnet.resetsAt,
        };
      }
    }
  }

  return null;
}

// ─── Display Helper ─────────────────────────────────────────────────────

/**
 * Format an ISO 8601 reset timestamp as a human-readable countdown.
 * e.g. "4h 12m", "5d 3h", "< 1m"
 */
export function formatResetTime(resetsAt: string): string {
  if (!resetsAt) return "?";

  const now = Date.now();
  const reset = new Date(resetsAt).getTime();
  let diffMs = reset - now;

  if (isNaN(diffMs) || diffMs <= 0) return "< 1m";

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  diffMs %= 24 * 60 * 60 * 1000;
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  diffMs %= 60 * 60 * 1000;
  const minutes = Math.floor(diffMs / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "< 1m";
}
