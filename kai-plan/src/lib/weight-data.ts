import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

export const DEFAULT_WEIGHT_FILENAME = "weight_state-2.csv";

export type WeightRow = {
  date: string;
  weight: number;
  notes: string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
    } else if ((c === "," && !q) || c === "\r") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function escapeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Where new data is written when `WEIGHT_CSV_PATH` is not set. */
export function resolveWeightCsvWritePath(): string {
  const env = process.env.WEIGHT_CSV_PATH?.trim();
  if (env) return env;
  return path.join(process.cwd(), "data", DEFAULT_WEIGHT_FILENAME);
}

/**
 * Prefer env override, then bundled `data/weight_state-2.csv`, then legacy paths
 * (including sibling Workout Website folder).
 */
export function resolveWeightCsvPath(): string | null {
  const env = process.env.WEIGHT_CSV_PATH?.trim();
  const candidates = [
    env,
    path.join(process.cwd(), "data", "weight_state-2.csv"),
    path.join(process.cwd(), "data", "weight_state.csv"),
    path.join(
      process.cwd(),
      "..",
      "Workout Website",
      "Weight Tracker",
      "data",
      "weight_state-2.csv"
    ),
    path.join(
      process.cwd(),
      "..",
      "Workout Website",
      "Weight Tracker",
      "data",
      "weight_state.csv"
    ),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** Path to existing file, or the path where saves will go (for UI). */
export function getWeightStoragePathForDisplay(): string {
  return resolveWeightCsvPath() ?? resolveWeightCsvWritePath();
}

/** Server-only: load rows from weight CSV (Date, Weight, Notes). */
export function loadWeightRows(): { rows: WeightRow[]; sourcePath: string } {
  const csvPath = resolveWeightCsvPath();
  const displayPath = getWeightStoragePathForDisplay();
  if (!csvPath) return { rows: [], sourcePath: displayPath };

  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], sourcePath: csvPath };

  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const di = header.findIndex((h) => h === "date");
  const wi = header.findIndex((h) => h === "weight");
  const ni = header.findIndex((h) => h === "notes");
  if (di < 0 || wi < 0) return { rows: [], sourcePath: csvPath };

  const rows: WeightRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const date = cols[di]?.slice(0, 10) ?? "";
    const w = parseFloat(cols[wi]?.replace(/,/g, "") ?? "");
    if (!date || Number.isNaN(w)) continue;
    rows.push({
      date,
      weight: w,
      notes: ni >= 0 ? (cols[ni] ?? "") : "",
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return { rows, sourcePath: csvPath };
}

/** Server-only: persist rows to the configured CSV path (creates `data/` if needed). */
export function saveWeightRows(rows: WeightRow[]): void {
  const csvPath = resolveWeightCsvWritePath();
  const dir = path.dirname(csvPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const lines = ["Date,Weight,Notes"];
  for (const r of sorted) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue;
    if (typeof r.weight !== "number" || Number.isNaN(r.weight)) continue;
    const notes = (r.notes ?? "").trim();
    lines.push(`${r.date},${r.weight},${escapeCsvField(notes)}`);
  }
  writeFileSync(csvPath, `${lines.join("\n")}\n`, "utf-8");
}
