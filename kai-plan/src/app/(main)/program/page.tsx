import { rotationOrderFromIndex } from "@/lib/rotation";
import { ProgramTemplateCard } from "@/components/program/template-card";
import { ProgramSwitcher } from "@/components/program/program-switcher";
import {
  BEASTMODE_PROGRAM_ID,
  programDisplayTitle,
} from "@/lib/training-programs";
import { getCachedProgramPageData, getCachedProgramState } from "@/lib/cached-queries";

export const revalidate = 60;

type ProgramPageProps = { searchParams: Promise<{ view?: string }> };

export default async function ProgramPage({ searchParams }: ProgramPageProps) {
  const sp = await searchParams;

  const programState = await getCachedProgramState();
  const activeProgramId = programState?.active_program_id ?? BEASTMODE_PROGRAM_ID;
  const viewingProgramId = sp.view ?? activeProgramId;

  const { programs, state, templates, exercisesByTemplate } =
    await getCachedProgramPageData(viewingProgramId);

  const viewingProgram = programs.find((p) => p.id === viewingProgramId) ?? programs[0];
  const isArchiveView = viewingProgramId !== activeProgramId;

  const rotationLength = viewingProgram?.rotation_length ?? 8;
  const currentIdx =
    viewingProgramId === activeProgramId ? (state?.current_rotation_index ?? 0) : 0;
  const currentOrder = rotationOrderFromIndex(currentIdx, rotationLength);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Protocol</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Your daily driver is what Today and rotation use. Archived programs keep all history —
          switch back anytime to view logs and the old template.
        </p>
      </div>

      <ProgramSwitcher
        programs={programs}
        activeProgramId={activeProgramId}
        viewingProgramId={viewingProgramId}
      />

      {isArchiveView ? (
        <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Viewing <strong className="text-foreground">{viewingProgram ? programDisplayTitle(viewingProgram) : "archive"}</strong>{" "}
          (archive).
          History and lift charts from this block are unchanged. Use Today only when this program is
          your daily driver.
        </div>
      ) : null}

      {viewingProgram?.preworkout_note ? (
        <div className="rounded-xl border border-violet-500/25 bg-violet-50/80 px-4 py-3 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Block pre-workout note
          </p>
          <p className="mt-2 text-foreground/90">{viewingProgram.preworkout_note}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {templates.map((t) => (
          <ProgramTemplateCard
            key={t.id}
            template={t}
            exercises={exercisesByTemplate[t.id] ?? []}
            isCurrent={!isArchiveView && t.rotation_order === currentOrder}
            readOnly={isArchiveView}
          />
        ))}
      </div>
    </div>
  );
}
