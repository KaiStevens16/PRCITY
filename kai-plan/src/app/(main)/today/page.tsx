import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { resolveTodayWorkoutPick, templateForIndex } from "@/lib/rotation";
import { todayLocalDateString } from "@/lib/date";
import { fetchLastSetPerformance } from "@/lib/last-time";
import { getCachedProgramContext, getProgramState } from "@/lib/cached-queries";
import { WorkoutHeader } from "@/components/training/workout-header";
import { TodayWorkoutChooser } from "@/components/training/today-workout-chooser";
import { ExerciseCard } from "@/components/training/exercise-card";
import { FinishSessionFooter } from "@/components/training/finish-session-footer";
import { PlannedExerciseCard } from "@/components/training/planned-exercise-card";
import type { LastSetPerformanceRow, WorkoutTemplate } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";

type TodayPageProps = { searchParams: Promise<{ workout?: string }> };

export default async function TodayPage({ searchParams }: TodayPageProps) {
  const sp = await searchParams;
  const supabase = createClient();
  const userId = getSoloUserId();

  const [state, ctx] = await Promise.all([getProgramState(), getCachedProgramContext()]);
  if (!ctx) {
    return (
      <p className="text-muted-foreground">
        No active program found. Run the latest Supabase migration.
      </p>
    );
  }

  const { program, rotationLength, templates } = ctx;
  const rotationIndex = state?.current_rotation_index ?? 0;
  const recommendedTemplate = templateForIndex(templates, rotationIndex, rotationLength);
  if (!recommendedTemplate) {
    return (
      <p className="text-muted-foreground">
        No template for current rotation. Seed the database.
      </p>
    );
  }

  const pickOptions = templates.map((t) => ({
    id: t.id,
    name: t.name,
    phase: t.phase,
    split: t.split,
    rotation_order: t.rotation_order,
    estimated_duration_minutes: t.estimated_duration_minutes,
  }));

  const { data: inProgress } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const session = inProgress;
  const beforeDate = session?.date ?? todayLocalDateString();
  const excludeId = session?.id ?? null;

  let headerTemplate: WorkoutTemplate = recommendedTemplate;
  if (session?.template_id) {
    const { data: st } = await supabase
      .from("workout_templates")
      .select("*")
      .eq("id", session.template_id)
      .single();
    if (st) headerTemplate = st;
  }

  if (session) {
    const isRestDay = headerTemplate.phase === "Rest";
    const { data: sessionExercises } = await supabase
      .from("session_exercises")
      .select("*")
      .eq("session_id", session.id)
      .order("order_index", { ascending: true });

    const rows = await Promise.all(
      (sessionExercises ?? []).map(async (se) => {
        const { data: logs } = await supabase
          .from("set_logs")
          .select("*")
          .eq("session_exercise_id", se.id)
          .order("set_number", { ascending: true });

        let te = null as {
          exercise_name: string;
          target_sets: number;
          rep_min: number;
          rep_max: number;
          intensity_note: string | null;
          rest_seconds: number;
        } | null;
        if (se.template_exercise_id) {
          const { data } = await supabase
            .from("template_exercises")
            .select(
              "target_sets, rep_min, rep_max, intensity_note, rest_seconds, exercise_name"
            )
            .eq("id", se.template_exercise_id)
            .single();
          te = data;
        }

        let lastTime: LastSetPerformanceRow[] = [];
        if (se.template_exercise_id) {
          lastTime = await fetchLastSetPerformance(
            supabase,
            userId,
            se.template_exercise_id,
            te?.exercise_name ?? se.planned_exercise_name,
            beforeDate,
            excludeId
          );
        }

        const targetLabel = te
          ? `${te.target_sets} × ${te.rep_min}–${te.rep_max}`
          : "—";
        const restLabel = te
          ? te.rest_seconds >= 60
            ? `${Math.round(te.rest_seconds / 60)} min`
            : `${te.rest_seconds}s`
          : "—";

        return {
          se,
          sets: logs ?? [],
          lastTime,
          targetLabel,
          restLabel,
          intensityNote: te?.intensity_note ?? null,
        };
      })
    );

    const mismatch = session.template_id !== recommendedTemplate.id;

    const doneCount = rows.filter((r) => r.se.completed).length;
    const sessionProgress = { done: doneCount, total: rows.length };

    return (
      <div>
        {mismatch && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            You have an in-progress session from another day in the rotation.
            Finish it to advance — rotation won&apos;t move until then.
          </div>
        )}
        <WorkoutHeader
          template={headerTemplate}
          session={session}
          isLightDay={isRestDay}
          programPreworkoutNote={program.preworkout_note}
          sessionProgress={sessionProgress}
        />
        {rows.length === 0 && (
          <Card className="border-dashed border-border/60 bg-card/40">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No exercises in this template. Finish to advance rotation.
            </CardContent>
          </Card>
        )}
        <div className="space-y-5">
          {rows.map((r, i) => (
            <ExerciseCard
              key={r.se.id}
              phase={headerTemplate.phase}
              index={i}
              sessionId={session.id}
              afterOrderIndex={r.se.order_index}
              sessionExercise={r.se}
              sets={r.sets}
              lastTime={r.lastTime}
              targetLabel={r.targetLabel}
              restLabel={r.restLabel}
              intensityNote={r.intensityNote}
            />
          ))}
        </div>
        <FinishSessionFooter sessionId={session.id} />
      </div>
    );
  }

  const { template } = resolveTodayWorkoutPick(
    templates,
    rotationIndex,
    sp.workout,
    rotationLength
  );
  if (!template) {
    return (
      <p className="text-muted-foreground">
        No template for current rotation. Seed the database.
      </p>
    );
  }

  const isRecovery = template.phase === "Recovery";

  const { data: templateExercises } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("template_id", template.id)
    .order("order_index", { ascending: true });

  const plannedRows = await Promise.all(
    (templateExercises ?? []).map(async (ex) => {
      const lastTime = await fetchLastSetPerformance(
        supabase,
        userId,
        ex.id,
        ex.exercise_name,
        beforeDate,
        null
      );
      return { ex, lastTime };
    })
  );

  if (template.phase === "Rest") {
    return (
      <div>
        <TodayWorkoutChooser
          pathname="/today"
          options={pickOptions}
          recommendedId={recommendedTemplate.id}
          selectedId={template.id}
        />
        <WorkoutHeader
          template={template}
          session={null}
          isLightDay
          programPreworkoutNote={program.preworkout_note}
        />
        <Card className="max-w-xl border-border/80 bg-card/80">
          <CardContent className="space-y-3 py-6 text-sm text-muted-foreground">
            <p className="text-foreground">
              Full rest day. Recovery drives progress.
            </p>
            <p>
              Mark done when you want to advance the rotation without logging
              lifts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <TodayWorkoutChooser
        pathname="/today"
        options={pickOptions}
        recommendedId={recommendedTemplate.id}
        selectedId={template.id}
      />
      <WorkoutHeader
        template={template}
        session={null}
        isLightDay={false}
        programPreworkoutNote={program.preworkout_note}
      />
      {isRecovery && (
        <p className="mb-4 text-sm text-[hsl(var(--phase-recovery))]">
          Recovery day — keep it light. Log optional if you want a paper trail.
        </p>
      )}
      <div className="space-y-5">
        {plannedRows.map(({ ex, lastTime }, i) => (
          <PlannedExerciseCard
            key={ex.id}
            exercise={ex}
            phase={template.phase}
            index={i}
            lastTime={lastTime}
          />
        ))}
      </div>
    </div>
  );
}
