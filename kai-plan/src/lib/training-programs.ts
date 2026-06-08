import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrainingProgram, WorkoutTemplate } from "@/types/database";

export const BEASTMODE_PROGRAM_ID = "b0000000-0000-4000-8000-000000000002";
export const PR_CITY_PROGRAM_ID = "b0000000-0000-4000-8000-000000000001";

/** User-facing block title on Protocol / History (era label preferred). */
export function programDisplayTitle(program: Pick<TrainingProgram, "name" | "era_label">): string {
  const era = program.era_label?.trim();
  return era || program.name;
}

export type ProgramContext = {
  program: TrainingProgram;
  rotationLength: number;
  templates: WorkoutTemplate[];
};

export async function fetchTrainingPrograms(
  supabase: SupabaseClient
): Promise<TrainingProgram[]> {
  const { data, error } = await supabase
    .from("training_programs")
    .select("*")
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TrainingProgram[];
}

export async function fetchActiveProgramContext(
  supabase: SupabaseClient,
  activeProgramId: string | null | undefined
): Promise<ProgramContext | null> {
  const programId = activeProgramId ?? BEASTMODE_PROGRAM_ID;
  const { data: program, error: pe } = await supabase
    .from("training_programs")
    .select("*")
    .eq("id", programId)
    .maybeSingle();
  if (pe) throw new Error(pe.message);
  if (!program) return null;

  const { data: templates, error: te } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("program_id", programId)
    .eq("is_active", true)
    .order("rotation_order", { ascending: true });
  if (te) throw new Error(te.message);

  return {
    program: program as TrainingProgram,
    rotationLength: program.rotation_length,
    templates: (templates ?? []) as WorkoutTemplate[],
  };
}

export async function fetchProgramTemplates(
  supabase: SupabaseClient,
  programId: string
): Promise<WorkoutTemplate[]> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("program_id", programId)
    .order("rotation_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as WorkoutTemplate[];
}
