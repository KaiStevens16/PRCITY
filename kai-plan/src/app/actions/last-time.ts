"use server";

import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { fetchLastSetPerformance } from "@/lib/last-time";
import type { LastSetPerformanceRow } from "@/types/database";

export async function getLastSetPerformanceAction(input: {
  templateExerciseId: string | null;
  exerciseName: string;
  beforeDate: string;
  excludeSessionId?: string | null;
}): Promise<LastSetPerformanceRow[]> {
  if (!input.templateExerciseId) return [];
  const supabase = createClient();
  const userId = getSoloUserId();
  return fetchLastSetPerformance(
    supabase,
    userId,
    input.templateExerciseId,
    input.exerciseName,
    input.beforeDate,
    input.excludeSessionId ?? null
  );
}
