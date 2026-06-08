"use client";

import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { updateSessionFields } from "@/app/actions/training";
import {
  UNIVERSAL_WARMUP_ITEMS,
  type WarmupChecklistState,
  warmupProgress,
} from "@/lib/warmup-checklist";
import { cn } from "@/lib/utils";

type Props = {
  sessionId: string;
  checklist: WarmupChecklistState;
  className?: string;
};

export function WarmupChecklistPanel({ sessionId, checklist, className }: Props) {
  const [localChecklist, setLocalChecklist] = useState(checklist);

  useEffect(() => {
    setLocalChecklist(checklist);
  }, [sessionId, checklist]);

  const { done, total } = warmupProgress(localChecklist);

  function toggle(key: string, checked: boolean) {
    const next = { ...localChecklist, [key]: checked };
    setLocalChecklist(next);
    void updateSessionFields({ sessionId, warmupChecklist: next });
  }

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card/40 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Pre-workout warmup
        </p>
        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
          {done}/{total} done
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {UNIVERSAL_WARMUP_ITEMS.map((item) => (
          <li key={item.key}>
            <Label className="flex cursor-pointer items-start gap-3 text-sm font-normal leading-snug">
              <Checkbox
                className="mt-0.5 border-border/80"
                checked={localChecklist[item.key] ?? false}
                onCheckedChange={(c) => toggle(item.key, c === true)}
              />
              <span>
                <span className="text-foreground">{item.label}</span>
                {item.detail ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
                ) : null}
              </span>
            </Label>
          </li>
        ))}
      </ul>
    </div>
  );
}
