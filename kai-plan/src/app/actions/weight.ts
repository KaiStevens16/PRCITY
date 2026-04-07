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

export async function saveWeightCsvAction(payload: unknown): Promise<void> {
  if (!Array.isArray(payload)) {
    throw new Error("Invalid save payload.");
  }
  const rows: WeightRow[] = [];
  for (const item of payload) {
    if (!isWeightRow(item)) continue;
    rows.push({
      date: item.date,
      weight: item.weight,
      notes: typeof item.notes === "string" ? item.notes : "",
    });
  }
  saveWeightRows(rows);
  revalidatePath("/weight");
  revalidatePath("/");
}
