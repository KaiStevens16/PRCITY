import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { todayLocalDateString } from "@/lib/date";
import {
  mergeOuraSleepByDay,
  ouraFetchDailyActivity,
  ouraFetchDailySleep,
  ouraFetchSleepPeriods,
  ouraRefreshToken,
} from "@/lib/oura-api";

export function getOuraOAuthEnv():
  | { clientId: string; clientSecret: string; redirectUri: string }
  | null {
  const clientId = process.env.OURA_CLIENT_ID?.trim();
  const clientSecret = process.env.OURA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.OURA_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/**
 * Earliest calendar day we send to Oura for UI sync + post-OAuth pulls.
 * Oura returns from the account’s first available data; there is no “first wear” date in our sync path, so this is a fixed lower bound before any consumer ring shipped.
 */
export const OURA_SYNC_EARLIEST_DAY = "2015-01-01";

function ouraDefaultSyncStartDate(end: string): string {
  return OURA_SYNC_EARLIEST_DAY.localeCompare(end) <= 0 ? OURA_SYNC_EARLIEST_DAY : end;
}

type FreshTokenOk = {
  ok: true;
  accessToken: string;
  userId: string;
};

type FreshTokenErr = { error: string };

async function ensureOuraAccessToken(): Promise<FreshTokenOk | FreshTokenErr> {
  const env = getOuraOAuthEnv();
  if (!env) {
    return {
      error: "Oura OAuth is not configured (set OURA_CLIENT_ID, OURA_CLIENT_SECRET, OURA_REDIRECT_URI).",
    };
  }

  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: row, error: readErr } = await supabase
    .from("oura_connection")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) return { error: readErr.message };
  if (!row) return { error: "Oura is not connected." };

  let accessToken = row.access_token as string;
  let refreshToken = row.refresh_token as string;
  const expiresMs = new Date(row.expires_at as string).getTime();

  if (Number.isNaN(expiresMs) || Date.now() > expiresMs - 60_000) {
    try {
      const tok = await ouraRefreshToken({
        clientId: env.clientId,
        clientSecret: env.clientSecret,
        refreshToken,
      });
      accessToken = tok.access_token;
      refreshToken = tok.refresh_token;
      const expiresAt = new Date(Date.now() + tok.expires_in * 1000).toISOString();
      const { error: upErr } = await supabase
        .from("oura_connection")
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
        })
        .eq("user_id", userId);
      if (upErr) return { error: upErr.message };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Token refresh failed." };
    }
  }

  return { ok: true, accessToken, userId };
}

/**
 * Refresh token if needed, pull daily_activity in [startDate, endDate], upsert oura_daily_steps.
 */
export async function syncOuraSteps(
  startDate: string,
  endDate: string
): Promise<{ ok: true; count: number } | { error: string }> {
  const t = await ensureOuraAccessToken();
  if ("error" in t) return t;
  const { accessToken, userId } = t;

  const supabase = createClient();
  try {
    const fetched = await ouraFetchDailyActivity({
      accessToken,
      startDate,
      endDate,
    });
    if (!fetched.length) {
      return { ok: true, count: 0 };
    }
    const payload = fetched.map((r) => ({
      user_id: userId,
      day: r.day,
      steps: r.steps,
    }));
    const { error: upErr } = await supabase.from("oura_daily_steps").upsert(payload, {
      onConflict: "user_id,day",
    });
    if (upErr) return { error: upErr.message };
    return { ok: true, count: fetched.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sync failed." };
  }
}

/** Default backfill window when syncing from the UI or after OAuth. */
export async function syncOuraStepsDefaultWindow(): Promise<
  { ok: true; count: number } | { error: string }
> {
  const end = todayLocalDateString();
  const start = ouraDefaultSyncStartDate(end);
  return syncOuraSteps(start, end);
}

/**
 * Pull daily_sleep + sleep for [startDate, endDate], merge per calendar day, upsert oura_daily_sleep.
 */
export async function syncOuraSleep(
  startDate: string,
  endDate: string
): Promise<{ ok: true; count: number } | { error: string }> {
  const t = await ensureOuraAccessToken();
  if ("error" in t) return t;
  const { accessToken, userId } = t;

  const supabase = createClient();
  try {
    const [dailyRows, periodRows] = await Promise.all([
      ouraFetchDailySleep({ accessToken, startDate, endDate }),
      ouraFetchSleepPeriods({ accessToken, startDate, endDate }),
    ]);
    const merged = mergeOuraSleepByDay(dailyRows, periodRows);
    if (!merged.length) {
      return { ok: true, count: 0 };
    }
    const payload = merged.map((r) => ({
      user_id: userId,
      day: r.day,
      sleep_score: r.sleep_score,
      total_sleep_seconds: r.total_sleep_seconds,
      deep_sleep_seconds: r.deep_sleep_seconds,
      rem_sleep_seconds: r.rem_sleep_seconds,
      light_sleep_seconds: r.light_sleep_seconds,
      awake_seconds: r.awake_seconds,
      time_in_bed_seconds: r.time_in_bed_seconds,
      efficiency: r.efficiency,
      latency_seconds: r.latency_seconds,
      bedtime_start: r.bedtime_start,
      bedtime_end: r.bedtime_end,
      contributors_json: r.contributors_json,
    }));
    const { error: upErr } = await supabase.from("oura_daily_sleep").upsert(payload, {
      onConflict: "user_id,day",
    });
    if (upErr) return { error: upErr.message };
    return { ok: true, count: merged.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sleep sync failed." };
  }
}

export async function syncOuraSleepDefaultWindow(): Promise<
  { ok: true; count: number } | { error: string }
> {
  const end = todayLocalDateString();
  const start = ouraDefaultSyncStartDate(end);
  return syncOuraSleep(start, end);
}
