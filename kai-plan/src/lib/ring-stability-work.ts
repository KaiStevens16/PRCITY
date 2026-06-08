export const RING_STABILITY_WORK_NAME = "Ring Stability Work";

export const RING_STABILITY_INSTRUCTION =
  "Hold for 20 sec, 10 depressions, hold for 20 sec";

export function isRingStabilityWork(name: string): boolean {
  return name.trim().toLowerCase() === RING_STABILITY_WORK_NAME.toLowerCase();
}
