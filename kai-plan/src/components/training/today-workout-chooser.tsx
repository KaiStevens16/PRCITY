"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { phaseBadgeVariant } from "@/lib/rotation";
import { cn } from "@/lib/utils";
import type { WorkoutTemplate } from "@/types/database";

export type WorkoutPickOption = Pick<
  WorkoutTemplate,
  "id" | "name" | "phase" | "split" | "rotation_order" | "estimated_duration_minutes"
>;

type Props = {
  pathname: string;
  options: WorkoutPickOption[];
  recommendedId: string;
  selectedId: string;
};

export function TodayWorkoutChooser({ pathname, options, recommendedId, selectedId }: Props) {
  const router = useRouter();
  const usingRecommended = selectedId === recommendedId;
  const recommended = options.find((o) => o.id === recommendedId);

  function onChange(templateId: string) {
    const next = new URLSearchParams();
    if (templateId !== recommendedId) next.set("workout", templateId);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="mb-6 rounded-xl border border-border/50 bg-card/40 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="today-workout-select" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Today&apos;s workout
            </Label>
            {usingRecommended ? (
              <Badge variant="outline" className="h-5 border-emerald-500/35 bg-emerald-500/10 text-[9px] font-medium text-emerald-100/95">
                Recommended
              </Badge>
            ) : (
              <Badge variant="outline" className="h-5 border-amber-500/35 bg-amber-500/10 text-[9px] font-medium text-amber-100/95">
                Custom pick
              </Badge>
            )}
          </div>
          <select
            id="today-workout-select"
            value={selectedId}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "h-11 w-full max-w-full rounded-lg border border-border/60 bg-background/80 px-3 py-2 text-sm font-medium text-foreground shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-50 sm:max-w-md"
            )}
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.rotation_order}. {o.name}
                {o.id === recommendedId ? " · scheduled" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      {!usingRecommended && recommended && (
        <p className="mt-2.5 text-xs leading-relaxed text-amber-100/85">
          Rotation is due for{" "}
          <span className="font-medium text-amber-50/95">{recommended.name}</span>
          <Badge variant={phaseBadgeVariant(recommended.phase)} className="ml-1.5 text-[8px] align-middle">
            {recommended.split}
          </Badge>
          . You&apos;ll still advance the cycle when you finish this session.
        </p>
      )}
    </div>
  );
}
