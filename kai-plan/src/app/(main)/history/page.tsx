import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { HistoryView, type SessionRow } from "@/components/history/history-view";
import { startOfWeekMonday, toDateString } from "@/lib/date";

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

function toSessionRow(s: {
  id: string;
  date: string;
  status: string;
  split: string;
  phase: string;
  duration_minutes: number | null;
  session_notes: string | null;
  weird_day: boolean | null;
  workout_templates:
    | { name: string; phase: string }
    | { name: string; phase: string }[]
    | null;
}): SessionRow {
  const wt = embedTemplate(s.workout_templates);
  return {
    id: s.id,
    date: s.date,
    status: s.status,
    split: s.split,
    sessionTitle: wt?.name ?? s.split,
    phase: wt?.phase ?? s.phase,
    duration_minutes: s.duration_minutes,
    session_notes: s.session_notes,
    weird_day: s.weird_day,
  };
}

export default async function HistoryPage() {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: rawSessions } = await supabase
    .from("sessions")
    .select(
      `
      id,
      date,
      status,
      split,
      phase,
      duration_minutes,
      session_notes,
      weird_day,
      workout_templates ( name, phase )
    `
    )
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(200);

  const rows = (rawSessions ?? []).map(toSessionRow);

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

  const { data: sessIds } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId);

  const ids = (sessIds ?? []).map((s) => s.id);
  let exerciseNames: string[] = [];
  if (ids.length) {
    const { data: sex } = await supabase
      .from("session_exercises")
      .select("actual_exercise_name")
      .in("session_id", ids);
    exerciseNames = [
      ...new Set((sex ?? []).map((x) => x.actual_exercise_name)),
    ].sort((a, b) => a.localeCompare(b));
  }

  const { data: templates } = await supabase
    .from("workout_templates")
    .select("id, name")
    .eq("is_active", true)
    .order("rotation_order", { ascending: true });
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
          All History, this week, last week, and exercise shortcuts.
        </p>
      </div>
      <HistoryView
        thisWeek={thisWeek}
        lastWeek={lastWeek}
        allSessions={rows}
        exerciseNames={exerciseNames}
        workoutOptions={workoutOptions}
        workoutTemplates={workoutTemplates}
      />
    </div>
  );
}
