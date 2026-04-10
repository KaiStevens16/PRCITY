import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { phaseBadgeVariant } from "@/lib/rotation";
import { formatLongDate } from "@/lib/date";
import { SessionWeirdDayControls } from "@/components/history/session-weird-day-controls";
import { HistoryWorkoutSimple } from "@/components/history/history-workout-simple";
import { CopySessionWorkoutButton } from "@/components/history/copy-session-workout-button";
import { HistoryDeleteSession } from "@/components/history/history-delete-session";
import { getHistorySessionWorkout } from "@/app/actions/history-workout";

type Props = { params: Promise<{ id: string }> };

export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: session } = await supabase
    .from("sessions")
    .select(
      `
      *,
      workout_templates ( name, phase )
    `
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (!session) notFound();

  const wtRel = session.workout_templates as
    | { name: string; phase: string }
    | { name: string; phase: string }[]
    | null;
  const template = wtRel
    ? Array.isArray(wtRel)
      ? wtRel[0] ?? null
      : wtRel
    : null;
  const sessionTitle = template?.name ?? session.split;
  const displayPhase = template?.phase ?? session.phase;

  const workout = await getHistorySessionWorkout(id);
  const blocks = workout.ok ? workout.blocks : null;

  const editable =
    session.status === "completed" ||
    session.status === "skipped" ||
    session.status === "in_progress";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/history">← History</Link>
      </Button>
      <div>
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {session.weird_day ? (
            <span className="text-[15px] leading-none" aria-hidden title="Weird day">
              ⚠️
            </span>
          ) : session.status === "completed" ? (
            <span className="text-[15px] leading-none" aria-hidden title="Normal session">
              ✅
            </span>
          ) : null}
          {formatLongDate(session.date)}
        </p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight">
            {sessionTitle}
          </h1>
          <HistoryDeleteSession
            sessionId={id}
            variant="button"
            deleteRedirectTo="/history"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant={phaseBadgeVariant(displayPhase)}>{displayPhase}</Badge>
          <Badge variant="secondary" className="capitalize">
            {session.status.replace("_", " ")}
          </Badge>
          {session.duration_minutes != null && (
            <Badge variant="outline">{session.duration_minutes} min</Badge>
          )}
          {session.weird_day && (
            <Badge className="border-amber-500/50 bg-amber-500/15 text-amber-100">
              Weird day
            </Badge>
          )}
        </div>
        {session.weird_day && session.weird_day_notes && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-50/95">
            {session.weird_day_notes}
          </p>
        )}
        <SessionWeirdDayControls
          sessionId={session.id}
          editable={session.status === "completed" || session.status === "skipped"}
          weirdDay={session.weird_day === true}
          weirdDayNotes={session.weird_day_notes}
        />
        {workout.ok && blocks?.length ? (
          <div className="mt-4">
            <CopySessionWorkoutButton blocks={blocks} />
          </div>
        ) : null}
      </div>

      {workout.ok ? (
        <Card className="overflow-hidden border-border/60 bg-card/90">
          <CardContent className="p-0">
            <HistoryWorkoutSimple
              sessionId={id}
              editable={editable}
              initialBlocks={blocks ?? undefined}
              showSessionPageLink={false}
              embedded
              sessionNotes={session.session_notes}
            />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-amber-200/90">{workout.error}</p>
      )}
    </div>
  );
}
