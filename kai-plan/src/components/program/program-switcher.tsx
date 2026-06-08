"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchActiveProgram } from "@/app/actions/program";
import type { TrainingProgram } from "@/types/database";
import { programDisplayTitle } from "@/lib/training-programs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  programs: TrainingProgram[];
  activeProgramId: string;
  viewingProgramId: string;
};

export function ProgramSwitcher({ programs, activeProgramId, viewingProgramId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function viewProgram(programId: string) {
    const params = new URLSearchParams(window.location.search);
    if (programId === activeProgramId) params.delete("view");
    else params.set("view", programId);
    const q = params.toString();
    router.push(q ? `/program?${q}` : "/program");
  }

  function activate(programId: string) {
    startTransition(async () => {
      await switchActiveProgram(programId);
      router.push("/program");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {programs.map((p) => {
        const isActive = p.id === activeProgramId;
        const isViewing = p.id === viewingProgramId;
        return (
          <div
            key={p.id}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              isViewing
                ? "border-foreground/20 bg-secondary/80 shadow-sm"
                : "border-border/60 bg-card/50"
            )}
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => viewProgram(p.id)}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold tracking-tight">{programDisplayTitle(p)}</span>
                {isActive ? (
                  <Badge variant="hypertrophy" className="text-[9px]">
                    Daily driver
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] text-muted-foreground">
                    Archive
                  </Badge>
                )}
              </div>
              {p.description ? (
                <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              ) : null}
            </button>
            {!isActive && isViewing ? (
              <Button
                type="button"
                size="sm"
                className="mt-3"
                disabled={pending}
                onClick={() => activate(p.id)}
              >
                Switch daily driver to this program
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
