"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateSessionExercise } from "@/app/actions/training";
import { RING_STABILITY_INSTRUCTION } from "@/lib/ring-stability-work";

type Props = {
  sessionExerciseId: string;
  completed: boolean;
};

export function RingStabilityWorkLog({ sessionExerciseId, completed }: Props) {
  const [done, setDone] = useState(completed);

  useEffect(() => {
    setDone(completed);
  }, [sessionExerciseId, completed]);

  return (
    <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <Checkbox
        className="mt-0.5 border-border/80"
        checked={done}
        onCheckedChange={(c) => {
          const next = c === true;
          setDone(next);
          void updateSessionExercise({
            id: sessionExerciseId,
            completed: next,
          });
        }}
      />
      <span>
        <span className="text-sm font-medium text-foreground">Completed</span>
        <span className="mt-1 block text-sm leading-snug text-muted-foreground">
          {RING_STABILITY_INSTRUCTION}
        </span>
      </span>
    </Label>
  );
}
