"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { HistorySessionTable } from "@/components/history/history-session-table";
import { QuickAddWorkoutForm } from "@/components/history/quick-add-workout-form";

export type SessionRow = {
  id: string;
  date: string;
  status: string;
  /** Denormalized from session row (fallback if no template link). */
  split: string;
  /** Same label as Protocol: `workout_templates.name` when `template_id` is set. */
  sessionTitle: string;
  phase: string;
  duration_minutes: number | null;
  session_notes: string | null;
  weird_day?: boolean | null;
};

type Props = {
  thisWeek: SessionRow[];
  lastWeek: SessionRow[];
  allSessions: SessionRow[];
  workoutOptions: { id: string; name: string }[];
  workoutTemplates: {
    id: string;
    name: string;
    exercises: { exerciseName: string; targetSets: number }[];
  }[];
};

export function HistoryView({
  thisWeek,
  lastWeek,
  allSessions,
  workoutOptions,
  workoutTemplates,
}: Props) {
  return (
    <div className="space-y-4">
      <QuickAddWorkoutForm workoutOptions={workoutOptions} workoutTemplates={workoutTemplates} />
      <Tabs defaultValue="all" className="w-full">
      <TabsList className="flex h-auto flex-wrap gap-1 rounded-xl border border-border/40 bg-muted/20 p-1">
        <TabsTrigger value="all" className="rounded-lg data-[state=active]:shadow-sm">
          All History
        </TabsTrigger>
        <TabsTrigger value="this" className="rounded-lg data-[state=active]:shadow-sm">
          This week
        </TabsTrigger>
        <TabsTrigger value="last" className="rounded-lg data-[state=active]:shadow-sm">
          Last week
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="pt-6">
            <HistorySessionTable rows={allSessions} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="this">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="pt-6">
            <HistorySessionTable rows={thisWeek} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="last">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="pt-6">
            <HistorySessionTable rows={lastWeek} />
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </div>
  );
}
