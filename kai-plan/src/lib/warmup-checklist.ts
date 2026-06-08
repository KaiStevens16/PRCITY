export type WarmupChecklistItem = {
  key: string;
  label: string;
  detail?: string;
};

export const UNIVERSAL_WARMUP_ITEMS: WarmupChecklistItem[] = [
  { key: "foam_roll", label: "Foam roll all the usual stuff" },
  { key: "serratus_hold", label: "Serratus wall/floor hold (activation)" },
  {
    key: "external_rotation",
    label: "External rotation w yellow band",
    detail: "Parallel palm · 20 sec hold · 20 reps · 20 sec hold",
  },
  {
    key: "internal_rotation",
    label: "Internal rotation w yellow band",
    detail: "Parallel palm · 20 sec hold · 20 reps · 20 sec hold",
  },
  { key: "banded_elbow_rotations", label: "Banded external and internal (on elbow)" },
  { key: "inchworm", label: "Inchworm w foam roller × 2" },
  {
    key: "hanging_scap_depressions",
    label: "Hanging scapular depressions w yoga block between knees",
    detail: "2 × 10",
  },
  {
    key: "hanging_pullover",
    label: "Hanging bar pullover w knees in front",
    detail: "10 reps",
  },
  {
    key: "shoulder_car",
    label: "Shoulder CAR against wall",
    detail: "Closest knee up against wall · 2 × 4 each side",
  },
];

export type WarmupChecklistState = Record<string, boolean>;

export function emptyWarmupChecklist(): WarmupChecklistState {
  return Object.fromEntries(UNIVERSAL_WARMUP_ITEMS.map((i) => [i.key, false]));
}

export function parseWarmupChecklist(raw: unknown): WarmupChecklistState {
  const base = emptyWarmupChecklist();
  if (!raw || typeof raw !== "object") return base;
  for (const item of UNIVERSAL_WARMUP_ITEMS) {
    const v = (raw as Record<string, unknown>)[item.key];
    if (v === true) base[item.key] = true;
  }
  return base;
}

export function warmupProgress(state: WarmupChecklistState): { done: number; total: number } {
  const total = UNIVERSAL_WARMUP_ITEMS.length;
  const done = UNIVERSAL_WARMUP_ITEMS.filter((i) => state[i.key]).length;
  return { done, total };
}
