import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { exerciseSlug } from "@/lib/slug";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  bodyGroupSortIndex,
  liftGroupCardClasses,
  liftGroupHeadingDotClass,
  resolveBodyGroupForExerciseName,
} from "@/lib/lift-browse";
import { fetchProtocolLiftCatalog } from "@/lib/protocol-lifts";

export default async function LiftsPage() {
  const supabase = createClient();
  getSoloUserId();

  let lifts: { name: string; group: string }[] = [];
  let loadError: string | null = null;
  try {
    const { lifts: protocolLifts, templateGroupByName } = await fetchProtocolLiftCatalog(supabase);
    lifts = protocolLifts.map((row) => ({
      name: row.name,
      group: resolveBodyGroupForExerciseName(row.name, templateGroupByName),
    }));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load protocol lifts.";
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lifts</h1>
          <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-muted-foreground">
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  const byGroup = new Map<string, typeof lifts>();
  for (const item of lifts) {
    const list = byGroup.get(item.group) ?? [];
    list.push(item);
    byGroup.set(item.group, list);
  }
  for (const list of byGroup.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }

  const sortedGroups = [...byGroup.keys()].sort(
    (a, b) => bodyGroupSortIndex(a) - bodyGroupSortIndex(b) || a.localeCompare(b)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lifts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One page per protocol exercise (active program). Substitution logs still roll into the
          planned lift&apos;s charts when marked as a substitution.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-8 pt-6">
          {sortedGroups.map((group) => (
            <section key={group} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${liftGroupHeadingDotClass(group)}`}
                  aria-hidden
                />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(byGroup.get(group) ?? []).map(({ name }) => (
                  <Link
                    key={name}
                    href={`/lifts/${exerciseSlug(name)}`}
                    className={`block px-3 py-3 text-sm font-medium text-foreground/95 ${liftGroupCardClasses(group)}`}
                  >
                    {name}
                  </Link>
                ))}
              </div>
            </section>
          ))}
          {!lifts.length && (
            <p className="text-sm text-muted-foreground">
              No exercises in the active program. Check Program / templates in Supabase.
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
