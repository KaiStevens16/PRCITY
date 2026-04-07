"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { exerciseSlug } from "@/lib/slug";
import { HistorySessionTable } from "@/components/history/history-session-table";

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
  exerciseNames: string[];
};

export function HistoryView({
  thisWeek,
  lastWeek,
  allSessions,
  exerciseNames,
}: Props) {
  return (
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
        <TabsTrigger value="exercises" className="rounded-lg data-[state=active]:shadow-sm">
          By exercise
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
      <TabsContent value="exercises">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="pt-6">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {exerciseNames.map((n) => (
                <li key={n}>
                  <Link
                    href={`/lifts/${exerciseSlug(n)}`}
                    className="block rounded-xl border border-border/50 bg-background/30 px-3 py-2.5 text-sm font-medium shadow-sm transition-colors hover:border-border hover:bg-muted/30"
                  >
                    {n}
                  </Link>
                </li>
              ))}
            </ul>
            {!exerciseNames.length && (
              <p className="text-sm text-muted-foreground">
                Complete sessions to populate exercises.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
