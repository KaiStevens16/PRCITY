import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";

export type WeightRow = {
  date: string;
  weight: number;
  notes: string;
};

function dedupeRowsByDate(rows: WeightRow[]): WeightRow[] {
  const byDate = new Map<string, WeightRow>();
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    if (typeof r.weight !== "number" || Number.isNaN(r.weight)) continue;
    byDate.set(r.date, {
      date: r.date,
      weight: r.weight,
      notes: r.notes ?? "",
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Server-only: load weight rows from Supabase (newest last). */
export async function loadWeightRows(): Promise<WeightRow[]> {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data, error } = await supabase
    .from("body_weight_entries")
    .select("logged_date, weight, notes")
    .eq("user_id", userId)
    .order("logged_date", { ascending: true });

  if (error) throw new Error(error.message);

  const rows: WeightRow[] = (data ?? []).map((row) => ({
    date: row.logged_date,
    weight: Number(row.weight),
    notes: row.notes ?? "",
  }));

  return rows;
}

/** Server-only: replace all weight rows for the solo user (atomic). */
export async function saveWeightRows(rows: WeightRow[]): Promise<void> {
  const supabase = createClient();
  const userId = getSoloUserId();
  const cleaned = dedupeRowsByDate(rows);

  const { error: delErr } = await supabase
    .from("body_weight_entries")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw new Error(delErr.message);

  if (!cleaned.length) return;

  const payload = cleaned.map((r) => ({
    user_id: userId,
    logged_date: r.date,
    weight: r.weight,
    notes: (r.notes ?? "").trim(),
  }));

  const { error: insErr } = await supabase.from("body_weight_entries").insert(payload);
  if (insErr) throw new Error(insErr.message);
}
