"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { phaseBadgeVariant } from "@/lib/rotation";
import { formatLongDate } from "@/lib/date";
import type { SessionRow } from "@/components/history/history-view";
import { HistoryWorkoutSimple } from "@/components/history/history-workout-simple";
import { HistoryDeleteSession } from "@/components/history/history-delete-session";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function HistorySessionTable({ rows }: { rows: SessionRow[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50 bg-background/25">
      <table className="w-full min-w-[300px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2 sm:px-2.5">Date</th>
            <th className="px-1.5 py-2 sm:px-2">Session</th>
            <th className="px-1.5 py-2 sm:px-2">Type</th>
            <th className="w-7 px-0 py-2 text-center" aria-label="Delete">
              <span className="sr-only">Delete</span>
            </th>
            <th className="w-7 px-0 py-2 sm:pr-1" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const isOpen = openId === s.id;
            const editable =
              s.status === "completed" ||
              s.status === "skipped" ||
              s.status === "in_progress";
            return (
              <Fragment key={s.id}>
                <tr
                  className={cn(
                    "border-b border-border/30 transition-colors hover:bg-muted/20",
                    isOpen && "bg-muted/15"
                  )}
                >
                  <td className="px-2 py-2 text-xs text-muted-foreground sm:px-2.5">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 text-left text-foreground/90 hover:text-[hsl(var(--phase-hypertrophy))]"
                      onClick={() => setOpenId(isOpen ? null : s.id)}
                    >
                      {s.weird_day ? (
                        <span
                          className="shrink-0 text-[15px] leading-none"
                          aria-hidden
                          title="Weird day"
                        >
                          ⚠️
                        </span>
                      ) : s.status === "completed" ? (
                        <span
                          className="shrink-0 text-[15px] leading-none"
                          aria-hidden
                          title="Normal session"
                        >
                          ✅
                        </span>
                      ) : null}
                      <span className="tabular-nums">{formatLongDate(s.date)}</span>
                    </button>
                  </td>
                  <td className="max-w-[42vw] px-1.5 py-2 sm:max-w-none sm:px-2">
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => setOpenId(isOpen ? null : s.id)}
                    >
                      <span className="block truncate font-medium sm:overflow-visible sm:whitespace-normal">
                        {s.sessionTitle}
                      </span>
                    </button>
                  </td>
                  <td className="px-1.5 py-2 sm:px-2">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => setOpenId(isOpen ? null : s.id)}
                    >
                      <Badge
                        variant={phaseBadgeVariant(s.phase)}
                        className="text-[9px] font-semibold tracking-wide sm:text-[10px]"
                      >
                        {s.phase}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-0 py-2 text-center">
                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <HistoryDeleteSession
                        sessionId={s.id}
                        variant="icon"
                        onDeleted={() => {
                          setOpenId(null);
                          router.refresh();
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-0 py-2 pr-1 sm:pr-1.5">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground sm:h-8 sm:w-8"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Collapse workout" : "Expand workout"}
                      onClick={() => setOpenId(isOpen ? null : s.id)}
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 transition-transform duration-200 sm:h-4 sm:w-4",
                          isOpen && "rotate-180"
                        )}
                      />
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-border/30 bg-background/15">
                    <td colSpan={5} className="min-w-0 p-0">
                      <HistoryWorkoutSimple
                        sessionId={s.id}
                        editable={editable}
                        sessionNotes={s.session_notes}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
