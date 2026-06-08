import { revalidateTag } from "next/cache";

export const CACHE_TAGS = {
  program: "kai-program",
  dashboard: "kai-dashboard",
  sessions: "kai-sessions",
  lifts: "kai-lifts",
  protocol: "kai-protocol",
} as const;

/** Invalidate cached reads used by Command Center, History, Lifts, and Protocol. */
export function revalidateTrainingCaches() {
  for (const tag of Object.values(CACHE_TAGS)) {
    revalidateTag(tag);
  }
}
