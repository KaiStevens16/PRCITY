/** Oura Cloud API v2 (OAuth2 + usercollection). */

const OURA_AUTHORIZE = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN = "https://api.ouraring.com/oauth/token";
const OURA_DAILY_ACTIVITY =
  "https://api.ouraring.com/v2/usercollection/daily_activity";
const OURA_DAILY_READINESS = "https://api.ouraring.com/v2/usercollection/daily_readiness";
const OURA_DAILY_SLEEP = "https://api.ouraring.com/v2/usercollection/daily_sleep";
const OURA_SLEEP = "https://api.ouraring.com/v2/usercollection/sleep";
const OURA_HEARTRATE = "https://api.ouraring.com/v2/usercollection/heartrate";

export function ouraAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const p = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    /** `personal` + `daily` + `heartrate` per Oura Cloud API v2 (openapi heartrate route). */
    scope: "personal daily heartrate",
    state: input.state,
  });
  return `${OURA_AUTHORIZE}?${p.toString()}`;
}

export type OuraTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function ouraExchangeCode(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
}): Promise<OuraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const res = await fetch(OURA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Oura token exchange failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<OuraTokenResponse>;
}

export async function ouraRefreshToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<OuraTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  });
  const res = await fetch(OURA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Oura refresh failed (${res.status}): ${t.slice(0, 200)}`);
  }
  return res.json() as Promise<OuraTokenResponse>;
}

type DailyActivityRow = { id?: string; day?: string; steps?: number };

/** Full `daily_activity` document (PublicDailyActivity) for storage / export. */
export type OuraDailyActivityDocument = {
  day: string;
  oura_id: string | null;
  payload: Record<string, unknown>;
};

export async function ouraFetchDailyActivityDocuments(input: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<OuraDailyActivityDocument[]> {
  const out: OuraDailyActivityDocument[] = [];
  let nextToken: string | null = null;

  do {
    const u = new URL(OURA_DAILY_ACTIVITY);
    u.searchParams.set("start_date", input.startDate);
    u.searchParams.set("end_date", input.endDate);
    if (nextToken) u.searchParams.set("next_token", nextToken);

    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Oura daily_activity failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      next_token?: string | null;
    };
    for (const row of json.data ?? []) {
      const raw = String((row as DailyActivityRow).day ?? "").trim();
      const day = /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1];
      if (!day) continue;
      const idRaw = (row as DailyActivityRow).id;
      const oura_id = typeof idRaw === "string" && idRaw.length ? idRaw : null;
      out.push({ day, oura_id, payload: row });
    }
    nextToken = json.next_token ?? null;
  } while (nextToken);

  return out;
}

/** Step totals derived from `daily_activity` (backward compatible with `oura_daily_steps`). */
export async function ouraFetchDailyActivity(input: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<{ day: string; steps: number }[]> {
  const docs = await ouraFetchDailyActivityDocuments(input);
  return docs.map((d) => {
    const stepsRaw = d.payload.steps;
    const steps =
      typeof stepsRaw === "number" && Number.isFinite(stepsRaw) ? Math.max(0, Math.round(stepsRaw)) : 0;
    return { day: d.day, steps };
  });
}

/** Full `daily_readiness` document (PublicDailyReadiness). */
export type OuraDailyReadinessDocument = {
  day: string;
  oura_id: string | null;
  payload: Record<string, unknown>;
};

export async function ouraFetchDailyReadinessDocuments(input: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<OuraDailyReadinessDocument[]> {
  const out: OuraDailyReadinessDocument[] = [];
  let nextToken: string | null = null;

  do {
    const u = new URL(OURA_DAILY_READINESS);
    u.searchParams.set("start_date", input.startDate);
    u.searchParams.set("end_date", input.endDate);
    if (nextToken) u.searchParams.set("next_token", nextToken);

    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Oura daily_readiness failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      next_token?: string | null;
    };
    for (const row of json.data ?? []) {
      const raw = String(row.day ?? "").trim();
      const day = /^(\d{4}-\d{2}-\d{2})/.exec(raw)?.[1];
      if (!day) continue;
      const idRaw = row.id;
      const oura_id = typeof idRaw === "string" && idRaw.length ? idRaw : null;
      out.push({ day, oura_id, payload: row });
    }
    nextToken = json.next_token ?? null;
  } while (nextToken);

  return out;
}

export type OuraDailySleepRow = {
  day: string;
  score: number | null;
  contributors: Record<string, unknown> | null;
  /** Normalized to seconds when Oura includes them on the daily_sleep document. */
  total_sleep_seconds: number | null;
  deep_sleep_seconds: number | null;
  rem_sleep_seconds: number | null;
  light_sleep_seconds: number | null;
  awake_seconds: number | null;
  time_in_bed_seconds: number | null;
  efficiency: number | null;
  latency_seconds: number | null;
  bedtime_start: string | null;
  bedtime_end: string | null;
};

export type OuraSleepPeriodRow = {
  day: string;
  type: string | null;
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  light_sleep_duration: number | null;
  awake_time: number | null;
  time_in_bed: number | null;
  efficiency: number | null;
  latency: number | null;
  bedtime_start: string | null;
  bedtime_end: string | null;
  /** From sleep period document (PublicModifiedSleepModel) when present. */
  average_hrv: number | null;
  average_heart_rate: number | null;
  lowest_heart_rate: number | null;
  heart_rate: unknown | null;
  hrv: unknown | null;
};

export type MergedOuraSleepDay = {
  day: string;
  sleep_score: number | null;
  contributors_json: unknown | null;
  total_sleep_seconds: number | null;
  deep_sleep_seconds: number | null;
  rem_sleep_seconds: number | null;
  light_sleep_seconds: number | null;
  awake_seconds: number | null;
  time_in_bed_seconds: number | null;
  efficiency: number | null;
  latency_seconds: number | null;
  bedtime_start: string | null;
  bedtime_end: string | null;
  average_hrv: number | null;
  average_heart_rate: number | null;
  lowest_heart_rate: number | null;
  sleep_heart_rate_samples: unknown | null;
  sleep_hrv_samples: unknown | null;
};

function parseOuraDay(raw: string): string | null {
  const t = raw.trim();
  return /^(\d{4}-\d{2}-\d{2})/.exec(t)?.[1] ?? null;
}

function numberFromUnknown(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function intOrNull(v: unknown): number | null {
  const n = numberFromUnknown(v);
  return n == null ? null : Math.round(n);
}

function floatOrNull(v: unknown): number | null {
  const n = numberFromUnknown(v);
  return n == null ? null : n;
}

/** Discrete heart rate samples (PublicHeartRateRow). Requires `heartrate` OAuth scope. */
export type OuraHeartRateSample = {
  sample_at: string;
  bpm: number;
  source: string;
};

export async function ouraFetchHeartRateSamples(input: {
  accessToken: string;
  startDatetime: string;
  endDatetime: string;
}): Promise<OuraHeartRateSample[]> {
  const out: OuraHeartRateSample[] = [];
  let nextToken: string | null = null;

  do {
    const u = new URL(OURA_HEARTRATE);
    u.searchParams.set("start_datetime", input.startDatetime);
    u.searchParams.set("end_datetime", input.endDatetime);
    if (nextToken) u.searchParams.set("next_token", nextToken);

    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Oura heartrate failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      next_token?: string | null;
    };
    for (const row of json.data ?? []) {
      const ts = typeof row.timestamp === "string" ? row.timestamp : null;
      if (!ts) continue;
      const bpm = intOrNull(row.bpm);
      if (bpm == null) continue;
      const src = typeof row.source === "string" ? row.source : "unknown";
      out.push({ sample_at: ts, bpm, source: src });
    }
    nextToken = json.next_token ?? null;
  } while (nextToken);

  return out;
}

/**
 * Oura payloads sometimes use minutes (e.g. 420) and sometimes seconds (e.g. 25200).
 * Heuristic: mid-sized integers for whole-night totals are usually minutes; large values are seconds.
 */
function sleepDurationToSeconds(raw: unknown, kind: "stage" | "total" | "in_bed" | "awake"): number | null {
  const n = numberFromUnknown(raw);
  if (n == null || n < 0) return null;
  if (n >= 12_000) return Math.round(n);
  if (kind === "total" || kind === "in_bed") {
    if (n >= 120 && n <= 900) return Math.round(n * 60);
  }
  if (kind === "awake") {
    if (n >= 5 && n <= 120) return Math.round(n * 60);
  }
  if (kind === "stage") {
    if (n >= 5 && n <= 239) return Math.round(n * 60);
  }
  return Math.round(n);
}

function firstDefined<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) {
    if (v != null) return v;
  }
  return null;
}

function pickUnknown(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in row && row[k] != null) return row[k];
  }
  return undefined;
}

/** Calendar day for a sleep period: explicit `day`, else date part of `bedtime_end`. */
function sleepPeriodDayKey(row: Record<string, unknown>): string | null {
  const fromDay = parseOuraDay(String(row.day ?? row.date ?? ""));
  if (fromDay) return fromDay;
  const end = row.bedtime_end;
  if (typeof end === "string") return parseOuraDay(end);
  return null;
}

export async function ouraFetchDailySleep(input: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<OuraDailySleepRow[]> {
  const out: OuraDailySleepRow[] = [];
  let nextToken: string | null = null;

  do {
    const u = new URL(OURA_DAILY_SLEEP);
    u.searchParams.set("start_date", input.startDate);
    u.searchParams.set("end_date", input.endDate);
    if (nextToken) u.searchParams.set("next_token", nextToken);

    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Oura daily_sleep failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      next_token?: string | null;
    };
    for (const row of json.data ?? []) {
      const day = parseOuraDay(String(row.day ?? ""));
      if (!day) continue;
      const score =
        typeof row.score === "number" && Number.isFinite(row.score) ? Math.round(row.score) : null;
      const contributors =
        row.contributors && typeof row.contributors === "object" && !Array.isArray(row.contributors)
          ? (row.contributors as Record<string, unknown>)
          : null;
      out.push({
        day,
        score,
        contributors,
        total_sleep_seconds: sleepDurationToSeconds(
          pickUnknown(row, ["total_sleep_duration", "total_sleep", "total"]),
          "total"
        ),
        deep_sleep_seconds: sleepDurationToSeconds(
          pickUnknown(row, ["deep_sleep_duration", "deep_sleep", "deep"]),
          "stage"
        ),
        rem_sleep_seconds: sleepDurationToSeconds(
          pickUnknown(row, ["rem_sleep_duration", "rem_sleep", "rem"]),
          "stage"
        ),
        light_sleep_seconds: sleepDurationToSeconds(
          pickUnknown(row, ["light_sleep_duration", "light_sleep", "light"]),
          "stage"
        ),
        awake_seconds: sleepDurationToSeconds(
          pickUnknown(row, ["awake_time", "awake_duration", "awake"]),
          "awake"
        ),
        time_in_bed_seconds: sleepDurationToSeconds(pickUnknown(row, ["time_in_bed"]), "in_bed"),
        efficiency: intOrNull(row.efficiency),
        latency_seconds: intOrNull(row.latency),
        bedtime_start: typeof row.bedtime_start === "string" ? row.bedtime_start : null,
        bedtime_end: typeof row.bedtime_end === "string" ? row.bedtime_end : null,
      });
    }
    nextToken = json.next_token ?? null;
  } while (nextToken);

  return out;
}

export async function ouraFetchSleepPeriods(input: {
  accessToken: string;
  startDate: string;
  endDate: string;
}): Promise<OuraSleepPeriodRow[]> {
  const out: OuraSleepPeriodRow[] = [];
  let nextToken: string | null = null;

  do {
    const u = new URL(OURA_SLEEP);
    u.searchParams.set("start_date", input.startDate);
    u.searchParams.set("end_date", input.endDate);
    if (nextToken) u.searchParams.set("next_token", nextToken);

    const res = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${input.accessToken}` },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Oura sleep failed (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      next_token?: string | null;
    };
    for (const row of json.data ?? []) {
      const day = sleepPeriodDayKey(row);
      if (!day) continue;
      const type = typeof row.type === "string" ? row.type : null;
      out.push({
        day,
        type,
        total_sleep_duration: sleepDurationToSeconds(
          pickUnknown(row, ["total_sleep_duration", "total_sleep", "total"]),
          "total"
        ),
        deep_sleep_duration: sleepDurationToSeconds(
          pickUnknown(row, ["deep_sleep_duration", "deep_sleep", "deep"]),
          "stage"
        ),
        rem_sleep_duration: sleepDurationToSeconds(
          pickUnknown(row, ["rem_sleep_duration", "rem_sleep", "rem"]),
          "stage"
        ),
        light_sleep_duration: sleepDurationToSeconds(
          pickUnknown(row, ["light_sleep_duration", "light_sleep", "light"]),
          "stage"
        ),
        awake_time: sleepDurationToSeconds(
          pickUnknown(row, ["awake_time", "awake_duration", "awake"]),
          "awake"
        ),
        time_in_bed: sleepDurationToSeconds(
          pickUnknown(row, ["time_in_bed", "period"]),
          "in_bed"
        ),
        efficiency: intOrNull(row.efficiency),
        latency: intOrNull(row.latency),
        bedtime_start: typeof row.bedtime_start === "string" ? row.bedtime_start : null,
        bedtime_end: typeof row.bedtime_end === "string" ? row.bedtime_end : null,
        average_hrv: intOrNull(row.average_hrv),
        average_heart_rate: floatOrNull(row.average_heart_rate),
        lowest_heart_rate: intOrNull(row.lowest_heart_rate),
        heart_rate:
          row.heart_rate && typeof row.heart_rate === "object" && !Array.isArray(row.heart_rate)
            ? row.heart_rate
            : null,
        hrv:
          row.hrv && typeof row.hrv === "object" && !Array.isArray(row.hrv) ? row.hrv : null,
      });
    }
    nextToken = json.next_token ?? null;
  } while (nextToken);

  return out;
}

/** Prefer main-night sleep for a calendar day when multiple periods exist. */
export function pickBestSleepForDay(
  periods: OuraSleepPeriodRow[],
  day: string
): OuraSleepPeriodRow | null {
  const dayRows = periods.filter((r) => r.day === day && r.type !== "deleted");
  if (!dayRows.length) return null;
  const preferOrder = ["long_sleep", "sleep", "late_nap", "rest"];
  for (const t of preferOrder) {
    const hit = dayRows.find((r) => r.type === t);
    if (hit) return hit;
  }
  return dayRows.reduce((a, b) =>
    (a.total_sleep_duration ?? 0) >= (b.total_sleep_duration ?? 0) ? a : b
  );
}

export function mergeOuraSleepByDay(
  daily: OuraDailySleepRow[],
  periods: OuraSleepPeriodRow[]
): MergedOuraSleepDay[] {
  const byDayDaily = new Map(daily.map((d) => [d.day, d]));
  const daySet = new Set<string>([...byDayDaily.keys(), ...periods.map((p) => p.day)]);
  const sorted = [...daySet].sort((a, b) => a.localeCompare(b));
  const merged: MergedOuraSleepDay[] = [];
  for (const day of sorted) {
    const dRow = byDayDaily.get(day);
    const best = pickBestSleepForDay(periods, day);
    merged.push({
      day,
      sleep_score: dRow?.score ?? null,
      contributors_json: dRow?.contributors ?? null,
      total_sleep_seconds: firstDefined(best?.total_sleep_duration, dRow?.total_sleep_seconds),
      deep_sleep_seconds: firstDefined(best?.deep_sleep_duration, dRow?.deep_sleep_seconds),
      rem_sleep_seconds: firstDefined(best?.rem_sleep_duration, dRow?.rem_sleep_seconds),
      light_sleep_seconds: firstDefined(best?.light_sleep_duration, dRow?.light_sleep_seconds),
      awake_seconds: firstDefined(best?.awake_time, dRow?.awake_seconds),
      time_in_bed_seconds: firstDefined(best?.time_in_bed, dRow?.time_in_bed_seconds),
      efficiency: firstDefined(best?.efficiency, dRow?.efficiency),
      latency_seconds: firstDefined(best?.latency, dRow?.latency_seconds),
      bedtime_start: firstDefined(best?.bedtime_start, dRow?.bedtime_start),
      bedtime_end: firstDefined(best?.bedtime_end, dRow?.bedtime_end),
      average_hrv: best?.average_hrv ?? null,
      average_heart_rate: best?.average_heart_rate ?? null,
      lowest_heart_rate: best?.lowest_heart_rate ?? null,
      sleep_heart_rate_samples: best?.heart_rate ?? null,
      sleep_hrv_samples: best?.hrv ?? null,
    });
  }
  return merged;
}
