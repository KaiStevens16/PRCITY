"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { phaseBadgeVariant } from "@/lib/rotation";
import { formatLongDate } from "@/lib/date";
import type { SessionRow } from "@/components/history/history-view";
import { HistoryWorkoutSimple } from "@/components/history/history-workout-simple";
import { SessionHistoryStrip } from "@/components/history/session-history-strip";
import {
  HistoryDeleteSessionDialog,
  HistorySessionDeleteIcon,
} from "@/components/history/history-delete-session-dialog";
import { HistoryCopySessionRowButton } from "@/components/history/history-copy-session-row-button";
import { cn } from "@/lib/utils";

const SWIPE_REVEAL_PX = 80;

/** Same filter as Sort by workout: newest-first list, same template, logged-ish statuses. */
function sameTemplateRecentSessions(
  source: SessionRow[],
  templateId: string | null
): SessionRow[] {
  if (!templateId) return [];
  return source
    .filter(
      (row) =>
        row.template_id === templateId &&
        (row.status === "completed" ||
          row.status === "skipped" ||
          row.status === "in_progress")
    )
    .slice(0, 3);
}

function ignoreRowToggle(target: EventTarget | null) {
  return (target as HTMLElement | null)?.closest("[data-row-toggle-ignore]") != null;
}

function HistorySessionMobileRow({
  s,
  isOpen,
  editable,
  onToggle,
  onRequestDelete,
  weirdDay,
  weirdDayNotes,
}: {
  s: SessionRow;
  isOpen: boolean;
  editable: boolean;
  onToggle: () => void;
  onRequestDelete: (sessionId: string) => void;
  weirdDay: boolean;
  weirdDayNotes: string | null | undefined;
}) {
  const [dragX, setDragX] = useState(0);
  const dragXRef = useRef(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const horizontalRef = useRef(false);
  const draggingRef = useRef(false);
  const maxAbsDragRef = useRef(0);
  /** Avoid `click` toggling expand right after a horizontal swipe (mobile synthesizes click). */
  const suppressRowClickRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setDragX(0);
      dragXRef.current = 0;
    }
  }, [isOpen]);

  const snapFromDrag = (x: number) => {
    const snapped = x < -SWIPE_REVEAL_PX / 2 ? -SWIPE_REVEAL_PX : 0;
    dragXRef.current = snapped;
    setDragX(snapped);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (isOpen) return;
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    horizontalRef.current = false;
    draggingRef.current = false;
    maxAbsDragRef.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isOpen || !startRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;

    if (!horizontalRef.current && !draggingRef.current) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) + 4) {
        horizontalRef.current = true;
        draggingRef.current = true;
      } else if (Math.abs(dy) > 12) {
        startRef.current = null;
        return;
      }
    }
    if (!draggingRef.current) return;

    let next = dx;
    if (next > 0) next = 0;
    if (next < -SWIPE_REVEAL_PX) next = -SWIPE_REVEAL_PX;
    maxAbsDragRef.current = Math.max(maxAbsDragRef.current, Math.abs(next));
    dragXRef.current = next;
    setDragX(next);
  };

  const onTouchEnd = () => {
    if (draggingRef.current) {
      snapFromDrag(dragXRef.current);
      if (maxAbsDragRef.current > 8) suppressRowClickRef.current = true;
    }
    startRef.current = null;
    horizontalRef.current = false;
    draggingRef.current = false;
  };

  const onTouchCancel = () => {
    setDragX(0);
    dragXRef.current = 0;
    startRef.current = null;
    horizontalRef.current = false;
    draggingRef.current = false;
  };

  const handleForegroundClick = (e: React.MouseEvent) => {
    if (suppressRowClickRef.current) {
      suppressRowClickRef.current = false;
      return;
    }
    if (ignoreRowToggle(e.target)) return;
    if (dragXRef.current <= -12) {
      snapFromDrag(0);
      return;
    }
    onToggle();
  };

  const handleForegroundKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (dragXRef.current <= -12) {
      snapFromDrag(0);
      return;
    }
    onToggle();
  };

  return (
    <div className="border-b border-border/30 last:border-b-0">
      <div className="relative overflow-hidden bg-background">
        {/* Solid row fills the width; delete strip stays hidden until swipe (no bleed-through). */}
        <div
          className={cn(
            "absolute inset-y-0 right-0 z-0 flex w-[80px] items-stretch justify-center bg-destructive transition-opacity duration-150",
            dragX === 0 ? "pointer-events-none opacity-0" : "opacity-100"
          )}
          aria-hidden={dragX === 0}
        >
          <div className="flex flex-1 items-center justify-center py-2">
            <HistorySessionDeleteIcon onPress={() => onRequestDelete(s.id)} />
          </div>
        </div>
        <div
          role="button"
          tabIndex={0}
          aria-expanded={isOpen}
          className="relative z-10 w-full touch-pan-y bg-background outline-none transition-transform duration-200 ease-out"
          style={{ transform: `translateX(${dragX}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
          onClick={handleForegroundClick}
          onKeyDown={handleForegroundKeyDown}
        >
          <div className="grid gap-2 px-3 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {s.weird_day ? (
                <span className="text-[15px] leading-none" aria-hidden title="Weird day">
                  ⚠️
                </span>
              ) : s.status === "completed" ? (
                <span className="text-[15px] leading-none" aria-hidden title="Normal session">
                  ✅
                </span>
              ) : null}
              <span className="tabular-nums text-foreground/90">{formatLongDate(s.date)}</span>
            </div>
            <p className="font-medium leading-snug text-foreground">{s.sessionTitle}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge
                variant={phaseBadgeVariant(s.phase)}
                className="text-[9px] font-semibold tracking-wide"
              >
                {s.phase}
              </Badge>
              <div data-row-toggle-ignore onClick={(e) => e.stopPropagation()}>
                <HistoryCopySessionRowButton sessionId={s.id} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="border-t border-border/30 bg-background/15 px-2 py-3">
          <HistoryWorkoutSimple
            sessionId={s.id}
            editable={editable}
            sessionNotes={s.session_notes}
            initialWeirdDay={weirdDay}
            initialWeirdDayNotes={weirdDayNotes ?? null}
          />
        </div>
      )}
    </div>
  );
}

export function HistorySessionTable({
  rows,
  /** Full history (newest first) for same-template strip on the top row; not the tab slice. */
  stripSourceSessions,
}: {
  rows: SessionRow[];
  stripSourceSessions: SessionRow[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Nothing here yet.</p>;
  }

  const onDeleted = () => {
    setOpenId(null);
    setDeleteTargetId(null);
    router.refresh();
  };

  return (
    <>
      {/* Mobile: tap row to expand; swipe left to reveal delete */}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-background sm:hidden">
        {rows.map((s) => {
          const isOpen = openId === s.id;
          const editable =
            s.status === "completed" ||
            s.status === "skipped" ||
            s.status === "in_progress";
          return (
            <HistorySessionMobileRow
              key={s.id}
              s={s}
              isOpen={isOpen}
              editable={editable}
              onToggle={() => setOpenId(isOpen ? null : s.id)}
              onRequestDelete={setDeleteTargetId}
              weirdDay={s.weird_day === true}
              weirdDayNotes={s.weird_day_notes}
            />
          );
        })}
      </div>

      {/* sm+: table; tap row to expand (copy/delete ignored) */}
      <div className="hidden overflow-x-auto rounded-xl border border-border/50 bg-background/25 sm:block">
        <table className="w-full min-w-[300px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-2 py-2 sm:px-2.5">Date</th>
              <th className="px-1.5 py-2 sm:px-2">Session</th>
              <th className="px-1.5 py-2 sm:px-2">Type</th>
              <th className="w-7 px-0 py-2 text-center" aria-label="Copy workout">
                <span className="sr-only">Copy</span>
              </th>
              <th className="w-7 px-0 py-2 text-center" aria-label="Delete">
                <span className="sr-only">Delete</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const isOpen = openId === s.id;
              const editable =
                s.status === "completed" ||
                s.status === "skipped" ||
                s.status === "in_progress";
              const sameTemplateStrip = sameTemplateRecentSessions(
                stripSourceSessions,
                s.template_id
              );

              const rowToggle = (e: React.MouseEvent<HTMLTableRowElement>) => {
                if (ignoreRowToggle(e.target)) return;
                setOpenId(isOpen ? null : s.id);
              };

              const rowKeyToggle = (e: React.KeyboardEvent<HTMLTableRowElement>) => {
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                if (ignoreRowToggle(e.target)) return;
                setOpenId(isOpen ? null : s.id);
              };

              return (
                <Fragment key={s.id}>
                  <tr
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Collapse session row" : "Expand session row"}
                    className={cn(
                      "cursor-pointer border-b border-border/30 outline-none transition-colors hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      isOpen && "bg-muted/15"
                    )}
                    onClick={rowToggle}
                    onKeyDown={rowKeyToggle}
                  >
                    <td className="px-2 py-2 text-xs text-muted-foreground sm:px-2.5">
                      <div className="flex items-center gap-2 text-left text-foreground/90">
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
                      </div>
                    </td>
                    <td className="max-w-[42vw] px-1.5 py-2 sm:max-w-none sm:px-2">
                      <span className="block truncate font-medium sm:overflow-visible sm:whitespace-normal">
                        {s.sessionTitle}
                      </span>
                    </td>
                    <td className="px-1.5 py-2 sm:px-2">
                      <Badge
                        variant={phaseBadgeVariant(s.phase)}
                        className="text-[9px] font-semibold tracking-wide sm:text-[10px]"
                      >
                        {s.phase}
                      </Badge>
                    </td>
                    <td className="px-0 py-2 text-center">
                      <div
                        className="flex justify-center"
                        data-row-toggle-ignore
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HistoryCopySessionRowButton sessionId={s.id} />
                      </div>
                    </td>
                    <td className="px-0 py-2 text-center">
                      <div
                        className="flex justify-center"
                        data-row-toggle-ignore
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HistorySessionDeleteIcon onPress={() => setDeleteTargetId(s.id)} />
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border/30 bg-background/15">
                      <td colSpan={5} className="min-w-0 p-0">
                        {sameTemplateStrip.length > 0 ? (
                          <SessionHistoryStrip sessions={sameTemplateStrip} />
                        ) : (
                          <HistoryWorkoutSimple
                            sessionId={s.id}
                            editable={editable}
                            sessionNotes={s.session_notes}
                            initialWeirdDay={s.weird_day === true}
                            initialWeirdDayNotes={s.weird_day_notes ?? null}
                          />
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <HistoryDeleteSessionDialog
        sessionId={deleteTargetId ?? ""}
        open={deleteTargetId !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteTargetId(null);
        }}
        onDeleted={onDeleted}
      />
    </>
  );
}
