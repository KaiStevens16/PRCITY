export type WarmupChecklistItem = {
  key: string;
  label: string;
  detail?: string;
};

export const UNIVERSAL_WARMUP_ITEMS: WarmupChecklistItem[] = [
  { key: "foam_roll", label: "Foam roll" },
  { key: "serratus_work", label: "Serratus work" },
  { key: "deadhangs", label: "Deadhangs" },
  { key: "scapular_depressions_circles", label: "Scapular Depressions & Circles" },
  { key: "internal_external_rotation", label: "Internal and External Rotation" },
  { key: "thoracic_mobility", label: "Thoracic Mobility" },
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
