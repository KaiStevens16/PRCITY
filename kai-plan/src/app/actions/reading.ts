"use server";

import { revalidatePath } from "next/cache";
import { saveReadingRows, type ReadingRow } from "@/lib/reading-data";

function isReadingRow(x: unknown): x is ReadingRow {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.date === "string" &&
    typeof r.startPage === "number" &&
    Number.isFinite(r.startPage) &&
    typeof r.endPage === "number" &&
    Number.isFinite(r.endPage) &&
    typeof r.minutesRead === "number" &&
    Number.isFinite(r.minutesRead) &&
    (r.book === undefined || typeof r.book === "string")
  );
}

export async function saveReadingAction(
  payload: unknown
): Promise<{ ok: true } | { error: string }> {
  if (!Array.isArray(payload)) return { error: "Invalid save payload." };
  const rows: ReadingRow[] = [];
  for (const item of payload) {
    if (!isReadingRow(item)) continue;
    rows.push({
      date: item.date,
      startPage: Math.trunc(item.startPage),
      endPage: Math.trunc(item.endPage),
      minutesRead: Math.trunc(item.minutesRead),
      book: typeof item.book === "string" ? item.book : "",
    });
  }
  try {
    await saveReadingRows(rows);
    revalidatePath("/reading");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Save failed." };
  }
}
