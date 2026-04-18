import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";

export type ReadingRow = {
  date: string;
  startPage: number;
  endPage: number;
  minutesRead: number;
  book: string;
};

function dedupeRowsByDate(rows: ReadingRow[]): ReadingRow[] {
  const byDate = new Map<string, ReadingRow>();
  for (const r of rows) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    if (!Number.isFinite(r.startPage) || !Number.isFinite(r.endPage) || !Number.isFinite(r.minutesRead)) {
      continue;
    }
    if (r.startPage < 0 || r.endPage < r.startPage || r.minutesRead < 0) continue;
    byDate.set(r.date, {
      date: r.date,
      startPage: Math.trunc(r.startPage),
      endPage: Math.trunc(r.endPage),
      minutesRead: Math.trunc(r.minutesRead),
      book: r.book ?? "",
    });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export async function loadReadingRows(): Promise<ReadingRow[]> {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data, error } = await supabase
    .from("reading_log_entries")
    .select("logged_date, start_page, end_page, minutes_read, book")
    .eq("user_id", userId)
    .order("logged_date", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    date: row.logged_date,
    startPage: Number(row.start_page),
    endPage: Number(row.end_page),
    minutesRead: Number(row.minutes_read),
    book: row.book ?? "",
  }));
}

export async function saveReadingRows(rows: ReadingRow[]): Promise<void> {
  const supabase = createClient();
  const userId = getSoloUserId();
  const cleaned = dedupeRowsByDate(rows);

  const { error: delErr } = await supabase.from("reading_log_entries").delete().eq("user_id", userId);
  if (delErr) throw new Error(delErr.message);

  if (!cleaned.length) return;

  const payload = cleaned.map((r) => ({
    user_id: userId,
    logged_date: r.date,
    start_page: r.startPage,
    end_page: r.endPage,
    minutes_read: r.minutesRead,
    book: (r.book ?? "").trim(),
  }));

  const { error: insErr } = await supabase.from("reading_log_entries").insert(payload);
  if (insErr) throw new Error(insErr.message);
}

/** Inclusive page count for a row (0 if end < start after clamp). */
export function pagesReadCount(r: Pick<ReadingRow, "startPage" | "endPage">): number {
  if (r.endPage < r.startPage) return 0;
  return r.endPage - r.startPage + 1;
}

export type BookDayEntry = { date: string; book: string };

/** Server rows overlaid by draft rows (same calendar date → draft wins). */
export function mergedBookDayEntries(
  serverRows: ReadingRow[],
  draftRows: { date: string; book: string }[]
): BookDayEntry[] {
  const map = new Map<string, string>();
  for (const r of serverRows) map.set(r.date, r.book);
  for (const d of draftRows) {
    const day = d.date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    map.set(day, d.book);
  }
  return [...map.entries()].map(([date, book]) => ({ date, book }));
}

/** Distinct non-empty titles, most recently logged first. */
export function distinctRecentBookTitles(entries: BookDayEntry[], limit = 16): string[] {
  const sorted = [...entries]
    .filter((e) => e.book.trim())
    .sort((a, b) => b.date.localeCompare(a.date));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of sorted) {
    const b = e.book.trim();
    if (seen.has(b)) continue;
    seen.add(b);
    out.push(b);
    if (out.length >= limit) break;
  }
  return out;
}

export function bookOnCalendarDate(entries: BookDayEntry[], iso: string): string | null {
  const row = entries.find((e) => e.date === iso && e.book.trim());
  return row?.book.trim() ?? null;
}
