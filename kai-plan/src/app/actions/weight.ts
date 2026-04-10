"use server";

import { revalidatePath } from "next/cache";
import { saveWeightRows, type WeightRow } from "@/lib/weight-data";

function isWeightRow(x: unknown): x is WeightRow {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.date === "string" &&
    typeof r.weight === "number" &&
    Number.isFinite(r.weight) &&
    (r.notes === undefined || typeof r.notes === "string")
  );
}

export async function saveWeightAction(
  payload: unknown
): Promise<{ ok: true } | { error: string }> {
  if (!Array.isArray(payload)) return { error: "Invalid save payload." };
  const rows: WeightRow[] = [];
  for (const item of payload) {
    if (!isWeightRow(item)) continue;
    rows.push({
      date: item.date,
      weight: item.weight,
      notes: typeof item.notes === "string" ? item.notes : "",
    });
  }
  try {
    await saveWeightRows(rows);
    revalidatePath("/weight");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed." };
  }
}
