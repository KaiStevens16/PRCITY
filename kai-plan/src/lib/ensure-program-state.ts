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
    active_program_id: "b0000000-0000-4000-8000-000000000003",
    current_rotation_index: 0,
    current_block_name: "Awaken the beast August",
    current_objective: "178 → 190 lb · 5 weeks",
    timeline_note: "Awaken the beast August",
    program_metadata: {
      progress_measures: [
        "Weight Maintenance",
        "Body Recomposition",
        "Nutrition Maintenance",
      ],
      nutrition_targets: {
        calories: 3250,
        protein_g: 230,
        carbs_g: 312,
        fat_g: 72,
      },
    },
  });
}
