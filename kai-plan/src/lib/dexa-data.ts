import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import type { DexaScan } from "@/types/database";

/** Server-only: DEXA rows newest first. */
export async function loadDexaScans(): Promise<DexaScan[]> {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data, error } = await supabase
    .from("dexa_scans")
    .select("*")
    .eq("user_id", userId)
    .order("scan_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DexaScan[];
}
