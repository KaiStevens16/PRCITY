/**
 * Parse GE / Lunar-style DEXA text exports (BCA table with Measured Date + Total Body Fat %).
 * Reports may include multiple historical rows; we keep the **latest** scan by measured date.
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

/** One-line BCA data row (after whitespace normalization). */
const BCA_ROW_ONE_LINE =
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)(?:\s+lbs?)?$/i;

/** Same columns, searched inside a flattened block (multiple rows, e.g. history + latest). */
const BCA_ROW_GLOBAL =
  /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)(?:\s+lbs)?/gi;

function toIso(mm: string, dd: string, yyyy: string): string {
  const m = mm.padStart(2, "0");
  const d = dd.padStart(2, "0");
  return `${yyyy}-${m}-${d}`;
}

function rowFromGroups(m: string[]): ParsedDexaBca | null {
  const [, mo, da, yr, bf, tm, fat, lean, bmc, ff] = m;
  const bodyFatPct = parseFloat(bf);
  const totalMassLb = parseFloat(tm);
  const fatMassLb = parseFloat(fat);
  const leanMassLb = parseFloat(lean);
  const bmcLb = parseFloat(bmc);
  const fatFreeLb = parseFloat(ff);
  if (
    !Number.isFinite(bodyFatPct) ||
    !Number.isFinite(totalMassLb) ||
    !Number.isFinite(fatMassLb) ||
    !Number.isFinite(leanMassLb) ||
    !Number.isFinite(bmcLb) ||
    !Number.isFinite(fatFreeLb)
  ) {
    return null;
  }
  if (bodyFatPct < 0 || bodyFatPct > 60) return null;
  if (totalMassLb < 40 || totalMassLb > 600) return null;
  if (fatMassLb < 0 || leanMassLb < 0 || bmcLb < 0 || fatFreeLb < 0) return null;
  return {
    scanDate: toIso(mo, da, yr),
    bodyFatPct,
    totalMassLb,
    fatMassLb,
    leanMassLb,
    bmcLb,
    fatFreeLb,
  };
}

function sliceLikelyBcaBlock(text: string): string {
  const t = text.replace(/\u00a0/g, " ");
  const startPat = /body composition analysis\s*\(\s*bca\s*\)|body composition analysis/gi;
  const sm = startPat.exec(t);
  const from = sm?.index ?? 0;
  let chunk = t.slice(from);
  const endPat = /body composition history\s*\(|regional body composition analysis/gi;
  const em = endPat.exec(chunk);
  if (em?.index != null && em.index > 40) {
    chunk = chunk.slice(0, em.index);
  }
  return chunk;
}

function collectRowsFromFlatBlock(flat: string): ParsedDexaBca[] {
  const rows: ParsedDexaBca[] = [];
  BCA_ROW_GLOBAL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BCA_ROW_GLOBAL.exec(flat)) !== null) {
    const row = rowFromGroups(m);
    if (row) rows.push(row);
  }
  return rows;
}

function latestByScanDate(rows: ParsedDexaBca[]): ParsedDexaBca | null {
  if (!rows.length) return null;
  return rows.reduce((a, b) => (a.scanDate >= b.scanDate ? a : b));
}

export function parseDexaReportText(text: string): ParsedDexaBca | null {
  const block = sliceLikelyBcaBlock(text);
  const flat = block.replace(/\s+/g, " ").trim();
  const fromGlobal = latestByScanDate(collectRowsFromFlatBlock(flat));
  if (fromGlobal) return fromGlobal;

  const lines = text.split(/\r?\n/);
  const headerIdx = lines.findIndex(
    (l) =>
      l.includes("Measured Date") &&
      l.includes("Total Body Fat") &&
      l.includes("Total Mass")
  );
  const start = headerIdx >= 0 ? headerIdx + 1 : 0;
  const lineRows: ParsedDexaBca[] = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i].replace(/\s+/g, " ").trim();
    const m = line.match(BCA_ROW_ONE_LINE);
    if (!m) continue;
    const row = rowFromGroups(m);
    if (row) lineRows.push(row);
  }
  const fromLines = latestByScanDate(lineRows);
  if (fromLines) return fromLines;

  const scanAll: ParsedDexaBca[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, " ").trim();
    const m = line.match(BCA_ROW_ONE_LINE);
    if (!m) continue;
    const row = rowFromGroups(m);
    if (row) scanAll.push(row);
  }
  return latestByScanDate(scanAll);
}
