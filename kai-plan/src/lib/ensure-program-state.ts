import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureProgramState(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from("program_state")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return;

  await supabase.from("program_state").insert({
    user_id: userId,
    active_program_id: "b0000000-0000-4000-8000-000000000002",
    current_rotation_index: 0,
    current_block_name: "Beastmodes Summer 26",
    current_objective: "Hypertrophy block",
    timeline_note: "Beastmodes Summer 26",
    program_metadata: {
      progress_measures: [
        "Weight Maintenance",
        "Body Recomposition",
        "Nutrition Maintenance",
      ],
    },
  });
}
