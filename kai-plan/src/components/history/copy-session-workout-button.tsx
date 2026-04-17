"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { HistoryWorkoutBlock } from "@/app/actions/history-workout";
import {
  buildSessionWorkoutExportText,
  type SessionWorkoutExportMeta,
} from "@/lib/export-session-workout-text";

type Props = {
  blocks: HistoryWorkoutBlock[];
} & SessionWorkoutExportMeta;

export function CopySessionWorkoutButton({
  blocks,
  weirdDay,
  weirdDayNotes,
}: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const text = buildSessionWorkoutExportText(blocks, { weirdDay, weirdDayNotes });

  if (!text.trim()) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={async () => {
          setMsg(null);
          try {
            await navigator.clipboard.writeText(text);
            setMsg("Copied");
            setTimeout(() => setMsg(null), 2000);
          } catch {
            setMsg("Copy failed — select text manually");
          }
        }}
      >
        Copy workout
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
