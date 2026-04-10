/**
 * Parse GE / Lunar-style DEXA text exports (BCA table with Measured Date + Total Body Fat %).
 * Returns null if the expected row is not found.
 */

export type ParsedDexaBca = {
  scanDate: string;
  bodyFatPct: number;
  totalMassLb: number;
  fatMassLb: number;
  leanMassLb: number;
  bmcLb: number;
  fatFreeLb: number;
};

const BCA_ROW =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)(\s+lbs?)?\s*$/i;

function toIso(mm: string, dd: string, yyyy: string): string {
  const m = mm.padStart(2, "0");
  const d = dd.padStart(2, "0");
  return `${yyyy}-${m}-${d}`;
}

export function parseDexaReportText(text: string): ParsedDexaBca | null {
  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex(
    (l) =>
      l.includes("Measured Date") &&
      l.includes("Total Body Fat %") &&
      l.includes("Total Mass")
  );
  const start = headerIdx >= 0 ? headerIdx + 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(BCA_ROW);
    if (!m) continue;
    const [, mo, da, yr, bf, tm, fat, lean, bmc, ff] = m;
    return {
      scanDate: toIso(mo, da, yr),
      bodyFatPct: parseFloat(bf),
      totalMassLb: parseFloat(tm),
      fatMassLb: parseFloat(fat),
      leanMassLb: parseFloat(lean),
      bmcLb: parseFloat(bmc),
      fatFreeLb: parseFloat(ff),
    };
  }

  for (const line of lines) {
    const t = line.trim();
    const m = t.match(BCA_ROW);
    if (!m) continue;
    const [, mo, da, yr, bf, tm, fat, lean, bmc, ff] = m;
    return {
      scanDate: toIso(mo, da, yr),
      bodyFatPct: parseFloat(bf),
      totalMassLb: parseFloat(tm),
      fatMassLb: parseFloat(fat),
      leanMassLb: parseFloat(lean),
      bmcLb: parseFloat(bmc),
      fatFreeLb: parseFloat(ff),
    };
  }

  return null;
}
