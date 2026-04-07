import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import {
  templateForIndex,
  upcomingTemplates,
  phaseBadgeVariant,
  phaseAccentClass,
} from "@/lib/rotation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RotationControls } from "@/components/dashboard/rotation-controls";
import {
  todayLocalDateString,
  startOfWeekMonday,
  toDateString,
  formatLongDate,
} from "@/lib/date";
import { epley1Rm, formatWeight } from "@/lib/e1rm";
import { loadWeightRows } from "@/lib/weight-data";
import { Activity, ArrowRight, Footprints, Quote, Scale, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { quoteOfDay } from "@/lib/quote-of-day";

export default async function CommandCenterPage() {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: state } = await supabase
    .from("program_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: templates } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("is_active", true)
    .order("rotation_order", { ascending: true });

  const idx = state?.current_rotation_index ?? 0;
  const todayTemplate = templateForIndex(templates ?? [], idx);
  const upcoming = upcomingTemplates(templates ?? [], idx, 3);

  const { data: inProgress } = await supabase
    .from("sessions")
    .select("id, template_id")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .limit(1)
    .maybeSingle();

  const monday = startOfWeekMonday(new Date());
  const weekStart = toDateString(monday);
  const weekEndDate = new Date(monday);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const weekEnd = toDateString(weekEndDate);

  const { data: weekSessions } = await supabase
    .from("sessions")
    .select("id, date, status, split, duration_minutes, bodyweight")
    .eq("user_id", userId)
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .order("date", { ascending: false });

  const completedThisWeek =
    weekSessions?.filter((s) => s.status === "completed").length ?? 0;

  const completedWeekIds =
    weekSessions?.filter((s) => s.status === "completed").map((s) => s.id) ?? [];
  let weekRunMiles = 0;
  if (completedWeekIds.length) {
    const { data: runEx } = await supabase
      .from("session_exercises")
      .select("id")
      .in("session_id", completedWeekIds)
      .or("planned_exercise_name.eq.Run,actual_exercise_name.eq.Run");
    const runSeIds = (runEx ?? []).map((x) => x.id);
    if (runSeIds.length) {
      const { data: mileLogs } = await supabase
        .from("set_logs")
        .select("weight")
        .in("session_exercise_id", runSeIds)
        .eq("completed", true)
        .not("weight", "is", null);
      weekRunMiles = (mileLogs ?? []).reduce((a, x) => a + Number(x.weight), 0);
    }
  }

  const { data: recent } = await supabase
    .from("sessions")
    .select(
      "id, date, status, split, phase, duration_minutes, session_notes, weird_day, weird_day_notes"
    )
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(6);

  const { data: recentSess } = await supabase
    .from("sessions")
    .select("id, date")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(40);

  const sessionIds = (recentSess ?? []).map((s) => s.id);
  let topLiftLines: [string, { e1: number; weight: number; reps: number }][] = [];

  if (sessionIds.length) {
    const { data: ses } = await supabase
      .from("session_exercises")
      .select("id, actual_exercise_name, session_id")
      .in("session_id", sessionIds);

    const seIds = (ses ?? []).map((s) => s.id);
    const seName = new Map((ses ?? []).map((s) => [s.id, s.actual_exercise_name]));

    if (seIds.length) {
      const { data: logs } = await supabase
        .from("set_logs")
        .select("session_exercise_id, weight, reps")
        .in("session_exercise_id", seIds)
        .not("weight", "is", null)
        .not("reps", "is", null);

      const byExercise = new Map<
        string,
        { e1: number; weight: number; reps: number }
      >();
      for (const row of logs ?? []) {
        const name = seName.get(row.session_exercise_id) ?? "Lift";
        if (name === "Run") continue;
        const e1 = epley1Rm(Number(row.weight), Number(row.reps));
        if (e1 == null) continue;
        const prev = byExercise.get(name);
        if (!prev || e1 > prev.e1) {
          byExercise.set(name, {
            e1,
            weight: Number(row.weight),
            reps: Number(row.reps),
          });
        }
      }
      topLiftLines = [...byExercise.entries()]
        .sort((a, b) => b[1].e1 - a[1].e1)
        .slice(0, 5);
    }
  }

  const weightRows = await loadWeightRows();
  const lastWeight = weightRows.length ? weightRows[weightRows.length - 1] : null;

  const phaseClass = todayTemplate ? phaseAccentClass(todayTemplate.phase) : "";

  const dailyQuote = quoteOfDay(todayLocalDateString());

  return (
    <div className="space-y-10">
      <Card className="border-border/50 bg-gradient-to-br from-muted/20 via-card/90 to-card/90 shadow-sm">
        <CardHeader className="pb-2 pt-5">
          <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <Quote className="h-3.5 w-3.5 text-[hsl(var(--phase-hypertrophy)/0.95)]" />
            Quote of the day
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-5 pt-0">
          <blockquote className="text-balance text-lg font-medium leading-snug tracking-tight text-foreground/95 md:text-xl">
            &ldquo;{dailyQuote.quote}&rdquo;
          </blockquote>
          <p className="mt-3 text-sm font-medium text-foreground/80">— {dailyQuote.author}</p>
          {dailyQuote.source ? (
            <p className="mt-1 text-xs text-muted-foreground">{dailyQuote.source}</p>
          ) : null}
        </CardContent>
      </Card>

      <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-[hsl(258_25%_8%)] p-6 shadow-card-lg md:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[hsl(var(--phase-hypertrophy)/0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[hsl(var(--phase-strength)/0.08)] blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Command center
            </p>
            <h1 className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
              Today&apos;s Protocol
            </h1>
            {todayTemplate && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className={`text-lg font-semibold md:text-xl ${phaseClass}`}>
                  {todayTemplate.name}
                </span>
                <Badge variant={phaseBadgeVariant(todayTemplate.phase)} className="text-[10px]">
                  {todayTemplate.phase}
                </Badge>
              </div>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {inProgress ? (
                <Button size="lg" className="gap-2 shadow-lg shadow-black/30" asChild>
                  <Link href="/today">
                    <Activity className="h-4 w-4" />
                    Continue session
                    <ArrowRight className="h-4 w-4 opacity-70" />
                  </Link>
                </Button>
              ) : (
                <Button size="lg" className="gap-2 shadow-lg shadow-black/30" asChild>
                  <Link href="/today">
                    Open Today
                    <ArrowRight className="h-4 w-4 opacity-70" />
                  </Link>
                </Button>
              )}
              <RotationControls />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60 bg-card/90 md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-[hsl(var(--phase-strength))]" />
              This week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-4xl font-bold tabular-nums tracking-tight">
              {completedThisWeek}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Completed sessions · {formatLongDate(weekStart)} →{" "}
              {formatLongDate(todayLocalDateString())}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Footprints className="h-4 w-4 text-[hsl(142_55%_52%)]" />
              Run volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-4xl font-bold tabular-nums tracking-tight">
              {weekRunMiles.toFixed(2)}
              <span className="ml-1.5 text-2xl font-semibold tracking-normal text-muted-foreground">
                MI
              </span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Scale className="h-4 w-4 text-[hsl(200_85%_58%)]" />
              Bodyweight
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lastWeight ? (
              <>
                <p className="font-mono text-3xl font-bold tabular-nums">{lastWeight.weight.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">
                  Last entry · {formatLongDate(lastWeight.date)}
                </p>
                <Button variant="outline" size="sm" className="w-full border-border/60" asChild>
                  <Link href="/weight">Weight trend</Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">No CSV linked yet.</p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/weight">Setup</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-border/60 bg-card/90 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Up next</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="divide-y divide-border/40">
              {upcoming.map((t, i) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 font-mono text-xs text-muted-foreground">
                    +{i + 1}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">{t.name}</span>
                  <Badge variant={phaseBadgeVariant(t.phase)} className="text-[9px]">
                    {t.phase}
                  </Badge>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {(recent ?? []).map((s) => {
                const weird = s.weird_day === true;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/history/session/${s.id}`}
                      className={cn(
                        "group flex justify-between gap-2 rounded-lg border px-2 py-1.5 text-sm transition-colors hover:border-border/60",
                        weird
                          ? "border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/15"
                          : "border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/12"
                      )}
                    >
                      <span
                        className={cn(
                          "flex min-w-0 items-center gap-1.5 text-xs font-medium transition-colors",
                          weird
                            ? "text-amber-100/95 group-hover:text-amber-50"
                            : "text-emerald-100/90 group-hover:text-emerald-50"
                        )}
                      >
                        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
                          {weird ? "⚠️" : "✅"}
                        </span>
                        <span className="truncate">{formatLongDate(s.date)}</span>
                      </span>
                      <span
                        className={cn(
                          "truncate text-right font-medium transition-colors",
                          weird
                            ? "text-amber-50/95 group-hover:text-amber-50"
                            : "text-emerald-50/95 group-hover:text-emerald-50"
                        )}
                      >
                        {s.split}
                      </span>
                    </Link>
                  </li>
                );
              })}
              {!recent?.length && (
                <li className="text-sm text-muted-foreground">Log a session on Today.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/90">
        <CardHeader>
          <CardTitle className="text-base">Top lift estimates (e1RM)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topLiftLines.map(([name, v]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/30 px-3 py-2.5"
              >
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  ~{formatWeight(v.e1)}{" "}
                  <span className="text-border">·</span> {formatWeight(v.weight)}×{v.reps}
                </span>
              </li>
            ))}
            {!topLiftLines.length && (
              <li className="col-span-full text-sm text-muted-foreground">More training data will populate this.</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
