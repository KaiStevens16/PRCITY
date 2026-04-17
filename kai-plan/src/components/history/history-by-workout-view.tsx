"use client";

import { useMemo, useState } from "react";
import type { SessionRow } from "@/components/history/history-view";
import { SessionHistoryStrip } from "@/components/history/session-history-strip";
import { Button } from "@/components/ui/button";

type Props = {
  allSessions: SessionRow[];
  workoutOptions: { id: string; name: string }[];
};

export function HistoryByWorkoutView({ allSessions, workoutOptions }: Props) {
  const [templateId, setTemplateId] = useState<string | null>(null);

  const templateFromLatestSession = useMemo(() => {
    return allSessions.find((s) => s.template_id)?.template_id ?? null;
  }, [allSessions]);

  const threeSessions = useMemo(() => {
    if (!templateId) return [];
    return allSessions
      .filter(
        (s) =>
          s.template_id === templateId &&
          (s.status === "completed" ||
            s.status === "skipped" ||
            s.status === "in_progress")
      )
      .slice(0, 3);
  }, [allSessions, templateId]);

  const latestName = useMemo(() => {
    if (!templateFromLatestSession) return null;
    return workoutOptions.find((t) => t.id === templateFromLatestSession)?.name ?? null;
  }, [templateFromLatestSession, workoutOptions]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          Pick a workout, then scroll sideways: three most recent sessions for that template,{" "}
          <span className="font-medium text-foreground/80">newest on the left</span>.
        </p>
        {templateFromLatestSession && latestName ? (
          <Button
            type="button"
            variant="link"
            className="h-auto px-0 pt-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground"
            onClick={() => setTemplateId(templateFromLatestSession)}
          >
            Jump to your latest: {latestName}
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {workoutOptions.map((t) => (
          <Button
            key={t.id}
            type="button"
            variant={templateId === t.id ? "secondary" : "outline"}
            size="sm"
            className="rounded-lg"
            onClick={() => setTemplateId(t.id)}
          >
            {t.name}
          </Button>
        ))}
      </div>

      {!templateId ? (
        <p className="text-sm text-muted-foreground">Select a workout above.</p>
      ) : threeSessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No sessions with this template in your history yet.
        </p>
      ) : (
        <SessionHistoryStrip sessions={threeSessions} />
      )}
    </div>
  );
}
