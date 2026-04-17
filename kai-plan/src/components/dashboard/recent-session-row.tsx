"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { getHistorySessionWorkout } from "@/app/actions/history-workout";
import { buildSessionWorkoutExportText } from "@/lib/export-session-workout-text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SWIPE_REVEAL_PX = 76;

function rowSurface(weird: boolean) {
  return weird
    ? "border-amber-500/35 bg-amber-500/10 hover:border-border/60 hover:bg-amber-500/15"
    : "border-emerald-500/30 bg-emerald-500/[0.08] hover:border-border/60 hover:bg-emerald-500/12";
}

type Props = {
  sessionId: string;
  href: string;
  weird: boolean;
  children: React.ReactNode;
};

async function copyWorkoutText(sessionId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const r = await getHistorySessionWorkout(sessionId);
  if (!r.ok) return { ok: false, message: r.error };
  const text = buildSessionWorkoutExportText(r.blocks, {
    weirdDay: r.weirdDay,
    weirdDayNotes: r.weirdDayNotes,
  });
  if (!text.trim()) return { ok: false, message: "No workout text to copy yet." };
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not copy — try again." };
  }
}

export function RecentSessionRow({ sessionId, href, weird, children }: Props) {
  const [pending, startTransition] = useTransition();
  const [dragX, setDragX] = useState(0);
  const dragXRef = useRef(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const horizontalRef = useRef(false);
  const draggingRef = useRef(false);
  const maxAbsDragRef = useRef(0);
  const suppressNextClickRef = useRef(false);

  const surface = rowSurface(weird);

  const runCopy = useCallback(() => {
    startTransition(async () => {
      const out = await copyWorkoutText(sessionId);
      if (!out.ok) window.alert(out.message);
      else {
        setDragX(0);
        dragXRef.current = 0;
      }
    });
  }, [sessionId]);

  const snapFromDrag = useCallback((x: number) => {
    const snapped = x > SWIPE_REVEAL_PX / 2 ? SWIPE_REVEAL_PX : 0;
    dragXRef.current = snapped;
    setDragX(snapped);
  }, []);

  const clearTouch = useCallback(() => {
    startRef.current = null;
    horizontalRef.current = false;
    draggingRef.current = false;
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    horizontalRef.current = false;
    draggingRef.current = false;
    maxAbsDragRef.current = 0;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!startRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - startRef.current.x;
    const dy = t.clientY - startRef.current.y;

    if (!horizontalRef.current && !draggingRef.current) {
      if (dx > 10 && dx > Math.abs(dy) + 4) {
        horizontalRef.current = true;
        draggingRef.current = true;
      } else if (Math.abs(dy) > 12) {
        startRef.current = null;
        return;
      }
    }
    if (!draggingRef.current) return;

    let next = dx;
    if (next < 0) next = 0;
    if (next > SWIPE_REVEAL_PX) next = SWIPE_REVEAL_PX;
    maxAbsDragRef.current = Math.max(maxAbsDragRef.current, Math.abs(next));
    dragXRef.current = next;
    setDragX(next);
  };

  const onTouchEnd = () => {
    if (draggingRef.current) {
      snapFromDrag(dragXRef.current);
      if (maxAbsDragRef.current > 8) suppressNextClickRef.current = true;
    }
    clearTouch();
  };

  const onTouchCancel = () => {
    setDragX(0);
    dragXRef.current = 0;
    clearTouch();
  };

  const onMobileLinkClick = (e: React.MouseEvent) => {
    if (suppressNextClickRef.current) {
      e.preventDefault();
      suppressNextClickRef.current = false;
      return;
    }
    if (dragXRef.current >= 12) {
      snapFromDrag(0);
      e.preventDefault();
    }
  };

  return (
    <>
      {/* Desktop: copy icon */}
      <div
        className={cn(
          "group hidden items-stretch overflow-hidden rounded-lg border px-2 py-1.5 text-sm transition-colors sm:flex",
          surface
        )}
      >
        <Link
          href={href}
          className="flex min-w-0 flex-1 touch-manipulation items-center justify-between gap-2"
        >
          {children}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pending}
          className="h-auto w-9 shrink-0 rounded-none border-l border-border/30 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
          aria-label="Copy workout"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            runCopy();
          }}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile: swipe right to reveal Copy */}
      <div className="relative overflow-hidden sm:hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-0 flex w-[76px] items-stretch border-r border-border/40 bg-muted/50 transition-opacity duration-150",
            dragX === 0 ? "pointer-events-none opacity-0" : "opacity-100"
          )}
        >
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            className="h-auto min-h-[2.75rem] w-full rounded-none px-1 text-xs font-semibold text-foreground hover:bg-muted/80"
            onClick={(e) => {
              e.stopPropagation();
              runCopy();
            }}
          >
            {pending ? "…" : "Copy"}
          </Button>
        </div>
        <div
          className={cn(
            "relative z-10 w-full touch-pan-y rounded-lg border px-2 py-1.5 text-sm transition-transform duration-200 ease-out",
            surface
          )}
          style={{ transform: `translateX(${dragX}px)` }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          <Link
            href={href}
            className="group flex touch-manipulation select-none justify-between gap-2"
            onClick={onMobileLinkClick}
          >
            {children}
          </Link>
        </div>
      </div>
    </>
  );
}
