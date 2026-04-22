import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";

export type InbodyProxyRow = {
  date: string;
  skeletalMuscleMassLb: number;
  bodyFatPct: number;
  notes: string;
};

function dedupeRowsByDate(rows: InbodyProxyRow[]): InbodyProxyRow[] {
  const byDate = new Map<string, InbodyProxyRow>();
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    if (!Number.isFinite(r.skeletalMuscleMassLb) || !Number.isFinite(r.bodyFatPct)) continue;
    byDate.set(r.date, {
      date: r.date,
      skeletalMuscleMassLb: r.skeletalMuscleMassLb,
      bodyFatPct: r.bodyFatPct,
      notes: r.notes ?? "",
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadInbodyProxyRows(): Promise<InbodyProxyRow[]> {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data, error } = await supabase
    .from("inbody_body_fat_proxy_entries")
    .select("logged_date, skeletal_muscle_mass_lb, body_fat_pct, notes")
    .eq("user_id", userId)
    .order("logged_date", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    date: row.logged_date,
    skeletalMuscleMassLb: Number(row.skeletal_muscle_mass_lb),
    bodyFatPct: Number(row.body_fat_pct),
    notes: row.notes ?? "",
  }));
}

export async function saveInbodyProxyRows(rows: InbodyProxyRow[]): Promise<void> {
  const supabase = createClient();
  const userId = getSoloUserId();
  const cleaned = dedupeRowsByDate(rows);

  const { error: delErr } = await supabase
    .from("inbody_body_fat_proxy_entries")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw new Error(delErr.message);

  if (!cleaned.length) return;

  const payload = cleaned.map((r) => ({
    user_id: userId,
    logged_date: r.date,
    skeletal_muscle_mass_lb: r.skeletalMuscleMassLb,
    body_fat_pct: r.bodyFatPct,
    notes: (r.notes ?? "").trim(),
  }));

  const { error: insErr } = await supabase.from("inbody_body_fat_proxy_entries").insert(payload);
  if (insErr) throw new Error(insErr.message);
}
