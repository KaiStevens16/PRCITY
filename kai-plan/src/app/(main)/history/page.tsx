import { createClient } from "@/lib/supabase/server";
import { HistoryView, type SessionRow } from "@/components/history/history-view";
import { startOfWeekMonday, toDateString } from "@/lib/date";
import { chartPhaseFromTemplate } from "@/lib/program-template-phase";
import { getCachedHistorySessions, getCachedProgramContext } from "@/lib/cached-queries";

export const revalidate = 30;

function embedTemplate(
  rel:
    | { name: string; phase: string }
    | { name: string; phase: string }[]
    | null
    | undefined
): { name: string; phase: string } | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function embedProgram(
  rel:
    | { name: string; era_label: string }
    | { name: string; era_label: string }[]
    | null
    | undefined
): { name: string; era_label: string } | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function toSessionRow(s: {
  id: string;
  date: string;
  status: string;
  template_id: string | null;
  split: string;
  phase: string;
  duration_minutes: number | null;
  session_notes: string | null;
  weird_day: boolean | null;
  weird_day_notes: string | null;
  workout_templates:
    | { name: string; phase: string }
    | { name: string; phase: string }[]
    | null;
  training_programs:
    | { name: string; era_label: string }
    | { name: string; era_label: string }[]
    | null;
}): SessionRow {
  const wt = embedTemplate(s.workout_templates);
  const prog = embedProgram(s.training_programs);
  return {
    id: s.id,
    date: s.date,
    status: s.status,
    template_id: s.template_id,
    split: s.split,
    sessionTitle: wt?.name ?? s.split,
    programEra: prog?.era_label || prog?.name || null,
    phase: chartPhaseFromTemplate(wt, s.phase),
    duration_minutes: s.duration_minutes,
    session_notes: s.session_notes,
    weird_day: s.weird_day,
    weird_day_notes: s.weird_day_notes,
  };
}

export default async function HistoryPage() {
  const supabase = createClient();

  const [rawSessions, ctx] = await Promise.all([
    getCachedHistorySessions(),
    getCachedProgramContext(),
  ]);

  const rows = rawSessions.map(toSessionRow);

  const today = new Date();
  const thisMonday = startOfWeekMonday(today);
  const thisMondayStr = toDateString(thisMonday);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisSunday.getDate() + 6);
  const thisSundayStr = toDateString(thisSunday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastMondayStr = toDateString(lastMonday);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  const lastSundayStr = toDateString(lastSunday);

  const thisWeek = rows.filter(
    (s) => s.date >= thisMondayStr && s.date <= thisSundayStr
  );
  const lastWeek = rows.filter(
    (s) => s.date >= lastMondayStr && s.date <= lastSundayStr
  );

  const templates = (ctx?.templates ?? []).map((t) => ({ id: t.id, name: t.name }));
  const workoutOptions = (templates ?? []).map((t) => ({ id: t.id, name: t.name }));
  const templateIds = workoutOptions.map((t) => t.id);
  const { data: templateExercises } = templateIds.length
    ? await supabase
        .from("template_exercises")
        .select("template_id, exercise_name, target_sets, order_index")
        .in("template_id", templateIds)
        .order("order_index", { ascending: true })
    : { data: [] as { template_id: string; exercise_name: string; target_sets: number; order_index: number }[] };

  const byTemplate = new Map<string, { exerciseName: string; targetSets: number }[]>();
  for (const row of templateExercises ?? []) {
    const list = byTemplate.get(row.template_id) ?? [];
    list.push({
      exerciseName: row.exercise_name,
      targetSets: row.target_sets,
    });
    byTemplate.set(row.template_id, list);
  }
  const workoutTemplates = workoutOptions.map((w) => ({
    ...w,
    exercises: byTemplate.get(w.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All history, this week, last week, and compare recent sessions by workout.
        </p>
      </div>
      <HistoryView
        thisWeek={thisWeek}
        lastWeek={lastWeek}
        allSessions={rows}
        workoutOptions={workoutOptions}
        workoutTemplates={workoutTemplates}
      />
    </div>
  );
}
