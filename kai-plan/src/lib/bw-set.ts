import { formatWeight } from "@/lib/e1rm";

/** Stored in set_logs.set_note when the set is bodyweight (weight is null). */
export const BW_SET_NOTE = "bw";

export function isBodyweightNote(note: string | null | undefined): boolean {
  return (note ?? "").trim().toLowerCase() === BW_SET_NOTE;
}

export function isBodyweightSet(
  weight: number | null | undefined,
  note: string | null | undefined
): boolean {
  return weight == null && isBodyweightNote(note);
}

/** Parse weight cell: "bw", "BW", "bW" → bodyweight; number string → numeric; empty → clear */
export function parseWeightInput(raw: string):
  | { kind: "bw" }
  | { kind: "number"; value: number | null }
  | { kind: "clear" } {
  const t = raw.trim();
  if (t === "") return { kind: "clear" };
  if (t.toLowerCase() === BW_SET_NOTE) return { kind: "bw" };
  const v = parseFloat(t);
  if (!Number.isNaN(v)) return { kind: "number", value: v };
  return { kind: "clear" };
}

/** Display line like "bw for 10" or "135 for 10" */
export function formatLiftLineForDisplay(
  weight: number | null,
  reps: number | null,
  setNote: string | null,
  completed: boolean
): string {
  if (!completed) return "—";
  if (
    reps != null &&
    (isBodyweightNote(setNote) || isBodyweightSet(weight, setNote))
  ) {
    return `bw for ${reps}`;
  }
  if (weight != null && reps != null && !isBodyweightNote(setNote)) {
    return `${formatWeight(Number(weight))} for ${reps}`;
  }
  return "—";
}

/** Draft weight field: show "bw" when `set_note` marks bodyweight (authoritative vs null weight). */
export function weightDraftFromSet(weight: number | null, setNote: string | null): string {
  if (isBodyweightNote(setNote)) return BW_SET_NOTE;
  if (weight != null) return String(weight);
  return "";
}

/** Note column draft: hide bw-only marker (shown in weight column) */
export function noteDraftFromSet(setNote: string | null): string {
  if (isBodyweightNote(setNote)) return "";
  return setNote ?? "";
}
