import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { exerciseSlug } from "@/lib/slug";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function LiftsPage() {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: sessIds } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed");

  const ids = (sessIds ?? []).map((s) => s.id);
  let names: string[] = [];
  if (ids.length) {
    const { data: sex } = await supabase
      .from("session_exercises")
      .select("actual_exercise_name")
      .in("session_id", ids);
    names = [...new Set((sex ?? []).map((x) => x.actual_exercise_name))]
      .filter((n) => n !== "Run")
      .sort((a, b) => a.localeCompare(b));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lifts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Performance analytics per exercise (from logged sessions).
        </p>
      </div>
      <Card>
        <CardContent className="grid gap-2 pt-6 sm:grid-cols-2 lg:grid-cols-3">
          {names.map((n) => (
            <Link
              key={n}
              href={`/lifts/${exerciseSlug(n)}`}
              className="rounded-lg border border-border/80 bg-card/50 px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              {n}
            </Link>
          ))}
          {!names.length && (
            <p className="col-span-full text-sm text-muted-foreground">
              No exercises yet. Complete a workout first.
            </p>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-center pt-1">
        <Button variant="secondary" asChild>
          <Link href="/history">Add workout</Link>
        </Button>
      </div>
    </div>
  );
}
