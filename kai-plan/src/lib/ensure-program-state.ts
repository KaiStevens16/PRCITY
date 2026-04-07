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
    current_rotation_index: 0,
    current_block_name: "PR CITY",
    current_objective: "PR CITY block",
    timeline_note: "4–8 weeks",
    program_metadata: {
      progress_measures: [
        "Weight Maintenance",
        "Body Recomposition",
        "Nutrition Maintenance",
      ],
    },
  });
}
