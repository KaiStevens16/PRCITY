"use server";

import { revalidatePath } from "next/cache";
import { saveInbodyProxyRows, type InbodyProxyRow } from "@/lib/inbody-proxy-data";

function isInbodyProxyRow(x: unknown): x is InbodyProxyRow {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.date === "string" &&
    typeof r.skeletalMuscleMassLb === "number" &&
    Number.isFinite(r.skeletalMuscleMassLb) &&
    typeof r.bodyFatPct === "number" &&
    Number.isFinite(r.bodyFatPct) &&
    (r.notes === undefined || typeof r.notes === "string")
  );
}

export async function saveInbodyProxyAction(
  payload: unknown
): Promise<{ ok: true } | { error: string }> {
  if (!Array.isArray(payload)) return { error: "Invalid save payload." };
  const rows: InbodyProxyRow[] = [];
  for (const item of payload) {
    if (!isInbodyProxyRow(item)) continue;
    rows.push({
      date: item.date,
      skeletalMuscleMassLb: item.skeletalMuscleMassLb,
      bodyFatPct: item.bodyFatPct,
      notes: typeof item.notes === "string" ? item.notes : "",
    });
  }
  try {
    await saveInbodyProxyRows(rows);
    revalidatePath("/inbody-body-fat-proxy");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed." };
  }
}
