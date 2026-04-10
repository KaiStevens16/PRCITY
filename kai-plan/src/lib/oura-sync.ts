import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { todayLocalDateString, toDateString } from "@/lib/date";
import { ouraFetchDailyActivity, ouraRefreshToken } from "@/lib/oura-api";

export function getOuraOAuthEnv():
  | { clientId: string; clientSecret: string; redirectUri: string }
  | null {
  const clientId = process.env.OURA_CLIENT_ID?.trim();
  const clientSecret = process.env.OURA_CLIENT_SECRET?.trim();
  const redirectUri = process.env.OURA_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

/**
 * Refresh token if needed, pull daily_activity in [startDate, endDate], upsert oura_daily_steps.
 */
export async function syncOuraSteps(
  startDate: string,
  endDate: string
): Promise<{ ok: true; count: number } | { error: string }> {
  const env = getOuraOAuthEnv();
  if (!env) {
    return { error: "Oura OAuth is not configured (set OURA_CLIENT_ID, OURA_CLIENT_SECRET, OURA_REDIRECT_URI)." };
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
  const start = isoDaysAgo(56);
  return syncOuraSteps(start, end);
}
