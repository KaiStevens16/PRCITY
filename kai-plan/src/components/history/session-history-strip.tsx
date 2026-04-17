"use client";

import Link from "next/link";
import type { SessionRow } from "@/components/history/history-view";
import { HistoryWorkoutSimple } from "@/components/history/history-workout-simple";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLongDate } from "@/lib/date";

function sessionEditable(s: SessionRow) {
  return (
    s.status === "completed" || s.status === "skipped" || s.status === "in_progress"
  );
}

export function SessionHistoryStrip({ sessions }: { sessions: SessionRow[] }) {
  if (!sessions.length) return null;

  return (
    <div className="flex flex-row gap-4 overflow-x-auto px-1 pb-2 pt-2">
      {sessions.map((s) => (
        <Card
          key={s.id}
          className="min-w-[min(100%,22rem)] max-w-[26rem] shrink-0 border-border/60 bg-card/90"
        >
          <CardHeader className="space-y-2 pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-base font-semibold leading-tight">
                {formatLongDate(s.date)}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 shrink-0 px-2 text-xs" asChild>
                <Link href={`/history/session/${s.id}`}>Open</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{s.sessionTitle}</p>
          </CardHeader>
          <CardContent className="border-t border-border/40 p-0">
            <div className="max-h-[min(70vh,720px)] overflow-y-auto px-2 py-3">
              <HistoryWorkoutSimple
                sessionId={s.id}
                editable={sessionEditable(s)}
                sessionNotes={s.session_notes}
                initialWeirdDay={s.weird_day === true}
                initialWeirdDayNotes={s.weird_day_notes ?? null}
                embedded
                showSessionPageLink={false}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
