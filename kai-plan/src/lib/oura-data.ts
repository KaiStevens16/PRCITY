import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";

export function normalizeOuraDayColumn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim())?.[1] ?? null;
}

export type OuraStepDayRow = { date: string; steps: number };

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
