import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";

export function normalizeOuraDayColumn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim())?.[1] ?? null;
}

export type OuraStepDayRow = { date: string; steps: number };

export type OuraSleepNightRow = {
  date: string;
  sleepScore: number | null;
  totalSleepSeconds: number | null;
  deepSeconds: number | null;
  remSeconds: number | null;
  lightSeconds: number | null;
  awakeSeconds: number | null;
  timeInBedSeconds: number | null;
  efficiency: number | null;
  latencySeconds: number | null;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  contributors: Record<string, unknown> | null;
};

export async function loadOuraStepsSeries(): Promise<OuraStepDayRow[]> {
  const supabase = createClient();
  const userId = getSoloUserId();
  const { data, error } = await supabase
    .from("oura_daily_steps")
    .select("day, steps")
    .eq("user_id", userId)
    .order("day", { ascending: true });
  if (error) throw new Error(error.message);
  const out: OuraStepDayRow[] = [];
  for (const row of data ?? []) {
    const date = normalizeOuraDayColumn(row.day);
    if (!date) continue;
    out.push({ date, steps: Number(row.steps) });
  }
  return out;
}

export type OuraConnectionRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

export async function loadOuraConnection(): Promise<OuraConnectionRow | null> {
  const supabase = createClient();
  const userId = getSoloUserId();
  const { data, error } = await supabase
    .from("oura_connection")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as OuraConnectionRow | null;
}

export async function loadOuraStepsRange(
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const supabase = createClient();
  const userId = getSoloUserId();
  const { data, error } = await supabase
    .from("oura_daily_steps")
    .select("day, steps")
    .eq("user_id", userId)
    .gte("day", startDate)
    .lte("day", endDate);
  if (error) throw new Error(error.message);
  const m = new Map<string, number>();
  for (const row of data ?? []) {
    const dayKey = normalizeOuraDayColumn(row.day);
    if (!dayKey) continue;
    m.set(dayKey, Number(row.steps));
  }
  return m;
}

export async function loadOuraSleepSeries(): Promise<OuraSleepNightRow[]> {
  const supabase = createClient();
  const userId = getSoloUserId();
  const { data, error } = await supabase
    .from("oura_daily_sleep")
    .select(
      "day, sleep_score, total_sleep_seconds, deep_sleep_seconds, rem_sleep_seconds, light_sleep_seconds, awake_seconds, time_in_bed_seconds, efficiency, latency_seconds, bedtime_start, bedtime_end, contributors_json"
    )
    .eq("user_id", userId)
    .order("day", { ascending: true });
  if (error) throw new Error(error.message);
  const out: OuraSleepNightRow[] = [];
  for (const row of data ?? []) {
    const date = normalizeOuraDayColumn(row.day);
    if (!date) continue;
    const cj = row.contributors_json;
    const contributors =
      cj && typeof cj === "object" && !Array.isArray(cj) ? (cj as Record<string, unknown>) : null;
    out.push({
      date,
      sleepScore: row.sleep_score != null ? Number(row.sleep_score) : null,
      totalSleepSeconds: row.total_sleep_seconds != null ? Number(row.total_sleep_seconds) : null,
      deepSeconds: row.deep_sleep_seconds != null ? Number(row.deep_sleep_seconds) : null,
      remSeconds: row.rem_sleep_seconds != null ? Number(row.rem_sleep_seconds) : null,
      lightSeconds: row.light_sleep_seconds != null ? Number(row.light_sleep_seconds) : null,
      awakeSeconds: row.awake_seconds != null ? Number(row.awake_seconds) : null,
      timeInBedSeconds: row.time_in_bed_seconds != null ? Number(row.time_in_bed_seconds) : null,
      efficiency: row.efficiency != null ? Number(row.efficiency) : null,
      latencySeconds: row.latency_seconds != null ? Number(row.latency_seconds) : null,
      bedtimeStart: typeof row.bedtime_start === "string" ? row.bedtime_start : null,
      bedtimeEnd: typeof row.bedtime_end === "string" ? row.bedtime_end : null,
      contributors,
    });
  }
  return out;
}
