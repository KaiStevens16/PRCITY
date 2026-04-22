import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { addCalendarDays, todayLocalDateString } from "@/lib/date";
import {
  mergeOuraSleepByDay,
  ouraFetchDailyActivityDocuments,
  ouraFetchDailyReadinessDocuments,
  ouraFetchDailySleep,
  ouraFetchHeartRateSamples,
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

function minIsoDate(a: string, b: string): string {
  return a.localeCompare(b) <= 0 ? a : b;
}

const HEARTRATE_CHUNK_DAYS = 14;

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
 * Refresh token if needed, pull daily_activity in [startDate, endDate], upsert oura_daily_steps
 * (steps only) + oura_daily_activity (full PublicDailyActivity JSON).
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
    const docs = await ouraFetchDailyActivityDocuments({
      accessToken,
      startDate,
      endDate,
    });
    if (!docs.length) {
      return { ok: true, count: 0 };
    }
    const stepsPayload = docs.map((r) => {
      const stepsRaw = r.payload.steps;
      const steps =
        typeof stepsRaw === "number" && Number.isFinite(stepsRaw) ? Math.max(0, Math.round(stepsRaw)) : 0;
      return {
        user_id: userId,
        day: r.day,
        steps,
      };
    });
    const activityPayload = docs.map((r) => ({
      user_id: userId,
      day: r.day,
      oura_id: r.oura_id,
      payload: r.payload,
    }));
    const { error: stepErr } = await supabase.from("oura_daily_steps").upsert(stepsPayload, {
      onConflict: "user_id,day",
    });
    if (stepErr) return { error: stepErr.message };
    const { error: actErr } = await supabase.from("oura_daily_activity").upsert(activityPayload, {
      onConflict: "user_id,day",
    });
    if (actErr) return { error: actErr.message };
    return { ok: true, count: docs.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sync failed." };
  }
}

/**
 * Pull daily_readiness in [startDate, endDate], upsert oura_daily_readiness.
 */
export async function syncOuraReadiness(
  startDate: string,
  endDate: string
): Promise<{ ok: true; count: number } | { error: string }> {
  const t = await ensureOuraAccessToken();
  if ("error" in t) return t;
  const { accessToken, userId } = t;

  const supabase = createClient();
  try {
    const docs = await ouraFetchDailyReadinessDocuments({
      accessToken,
      startDate,
      endDate,
    });
    if (!docs.length) {
      return { ok: true, count: 0 };
    }
    const payload = docs.map((r) => ({
      user_id: userId,
      day: r.day,
      oura_id: r.oura_id,
      payload: r.payload,
    }));
    const { error: upErr } = await supabase.from("oura_daily_readiness").upsert(payload, {
      onConflict: "user_id,day",
    });
    if (upErr) return { error: upErr.message };
    return { ok: true, count: docs.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Readiness sync failed." };
  }
}

/**
 * Pull heartrate samples in [startDate, endDate] (calendar days, UTC window), upsert oura_heart_rate_samples.
 * Requires OAuth scope `heartrate` on the stored token (re-connect Oura if upgrading from older scopes).
 */
export async function syncOuraHeartRate(
  startDate: string,
  endDate: string
): Promise<{ ok: true; count: number } | { error: string }> {
  const t = await ensureOuraAccessToken();
  if ("error" in t) return t;
  const { accessToken, userId } = t;

  const supabase = createClient();
  let total = 0;
  try {
    let chunkStart = startDate;
    while (chunkStart.localeCompare(endDate) <= 0) {
      const chunkLast = minIsoDate(endDate, addCalendarDays(chunkStart, HEARTRATE_CHUNK_DAYS - 1));
      const nextStart = addCalendarDays(chunkLast, 1);
      const startDatetime = `${chunkStart}T00:00:00.000Z`;
      const endDatetime = `${nextStart}T00:00:00.000Z`;

      const samples = await ouraFetchHeartRateSamples({
        accessToken,
        startDatetime,
        endDatetime,
      });
      const batchSize = 800;
      for (let i = 0; i < samples.length; i += batchSize) {
        const batch = samples.slice(i, i + batchSize).map((s) => ({
          user_id: userId,
          sample_at: s.sample_at,
          bpm: s.bpm,
          source: s.source,
        }));
        if (!batch.length) continue;
        const { error: upErr } = await supabase.from("oura_heart_rate_samples").upsert(batch, {
          onConflict: "user_id,sample_at,source",
        });
        if (upErr) return { error: upErr.message };
        total += batch.length;
      }

      chunkStart = nextStart;
    }
    return { ok: true, count: total };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Heart rate sync failed." };
  }
}

export async function syncOuraReadinessDefaultWindow(): Promise<
  { ok: true; count: number } | { error: string }
> {
  const end = todayLocalDateString();
  const start = ouraDefaultSyncStartDate(end);
  return syncOuraReadiness(start, end);
}

export async function syncOuraHeartRateDefaultWindow(): Promise<
  { ok: true; count: number } | { error: string }
> {
  const end = todayLocalDateString();
  const start = ouraDefaultSyncStartDate(end);
  return syncOuraHeartRate(start, end);
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
      average_hrv: r.average_hrv,
      average_heart_rate: r.average_heart_rate,
      lowest_heart_rate: r.lowest_heart_rate,
      sleep_heart_rate_samples: r.sleep_heart_rate_samples,
      sleep_hrv_samples: r.sleep_hrv_samples,
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

export type OuraFullSyncResult = {
  steps_days: number;
  sleep_days: number;
  readiness_days: number;
  heart_rate_samples: number;
  readiness_error: string | null;
  heart_rate_error: string | null;
  sleep_error: string | null;
};

/**
 * Pull activity (full JSON + steps), readiness, heart rate, and sleep for the default backfill window.
 * Heart rate / readiness errors are non-fatal (e.g. missing `heartrate` scope on an old token).
 */
export async function syncOuraAllDefaultWindow(): Promise<
  { ok: true; detail: OuraFullSyncResult } | { error: string }
> {
  const [stepsRes, readinessRes, hrRes, sleepRes] = await Promise.all([
    syncOuraStepsDefaultWindow(),
    syncOuraReadinessDefaultWindow(),
    syncOuraHeartRateDefaultWindow(),
    syncOuraSleepDefaultWindow(),
  ]);

  if ("error" in stepsRes) {
    return { error: stepsRes.error };
  }

  const detail: OuraFullSyncResult = {
    steps_days: stepsRes.count,
    sleep_days: "error" in sleepRes ? 0 : sleepRes.count,
    readiness_days: "error" in readinessRes ? 0 : readinessRes.count,
    heart_rate_samples: "error" in hrRes ? 0 : hrRes.count,
    readiness_error: "error" in readinessRes ? readinessRes.error : null,
    heart_rate_error: "error" in hrRes ? hrRes.error : null,
    sleep_error: "error" in sleepRes ? sleepRes.error : null,
  };

  return { ok: true, detail };
}
