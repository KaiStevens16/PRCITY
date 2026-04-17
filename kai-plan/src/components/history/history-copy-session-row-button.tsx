"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { getHistorySessionWorkout } from "@/app/actions/history-workout";
import { buildSessionWorkoutExportText } from "@/lib/export-session-workout-text";

export function HistoryCopySessionRowButton({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const runCopy = () => {
    startTransition(async () => {
      const r = await getHistorySessionWorkout(sessionId);
      if (!r.ok) {
        window.alert(r.error);
        return;
      }
      const text = buildSessionWorkoutExportText(r.blocks, {
        weirdDay: r.weirdDay,
        weirdDayNotes: r.weirdDayNotes,
      });
      if (!text.trim()) {
        window.alert("No completed sets to copy yet.");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        window.alert("Could not copy — try again or copy manually.");
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={pending}
      className="h-7 w-7 shrink-0 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      title={copied ? "Copied" : "Copy workout text"}
      aria-label={copied ? "Copied workout to clipboard" : "Copy workout to clipboard"}
      onClick={(e) => {
        e.stopPropagation();
        void runCopy();
      }}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
