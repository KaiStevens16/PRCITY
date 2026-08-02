"use client";

import { useEffect, useState } from "react";
import { getLastSetPerformanceAction } from "@/app/actions/last-time";
import { LastTimePanel } from "@/components/training/last-time-panel";
import type { LastSetPerformanceRow } from "@/types/database";

type Props = {
  templateExerciseId: string | null;
  exerciseName: string;
  beforeDate: string;
  excludeSessionId?: string | null;
  mode?: "default" | "run";
  className?: string;
};

const cache = new Map<string, Promise<LastSetPerformanceRow[]>>();

function cacheKey(
  templateExerciseId: string,
  beforeDate: string,
  excludeSessionId: string | null | undefined,
  exerciseName: string
) {
  return `${templateExerciseId}|${beforeDate}|${excludeSessionId ?? ""}|${exerciseName}`;
}

function getCachedLastTime(input: {
  templateExerciseId: string;
  exerciseName: string;
  beforeDate: string;
  excludeSessionId?: string | null;
}): Promise<LastSetPerformanceRow[]> {
  const key = cacheKey(
    input.templateExerciseId,
    input.beforeDate,
    input.excludeSessionId,
    input.exerciseName
  );
  let pending = cache.get(key);
  if (!pending) {
    pending = getLastSetPerformanceAction(input).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, pending);
  }
  return pending;
}

/** Loads last-time off the critical path; caches so remounts after refresh stay instant. */
export function LastTimeLazy({
  templateExerciseId,
  exerciseName,
  beforeDate,
  excludeSessionId,
  mode = "default",
  className,
}: Props) {
  const [rows, setRows] = useState<LastSetPerformanceRow[] | null>(() => {
    if (!templateExerciseId) return [];
    return null;
  });

  useEffect(() => {
    if (!templateExerciseId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void getCachedLastTime({
      templateExerciseId,
      exerciseName,
      beforeDate,
      excludeSessionId,
    }).then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [templateExerciseId, exerciseName, beforeDate, excludeSessionId]);

  if (rows == null) {
    return (
      <div
        className={`rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-2.5 text-[11px] text-muted-foreground ${className ?? ""}`}
      >
        Loading last time…
      </div>
    );
  }

  return <LastTimePanel rows={rows} mode={mode} className={className} />;
}
