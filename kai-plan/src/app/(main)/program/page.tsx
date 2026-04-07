import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSoloUserId } from "@/lib/solo-user";
import { rotationOrderFromIndex } from "@/lib/rotation";
import { ProgramTemplateCard } from "@/components/program/template-card";

export default async function ProgramPage() {
  const supabase = createClient();
  const userId = getSoloUserId();

  const { data: state } = await supabase
    .from("program_state")
    .select("current_rotation_index")
    .eq("user_id", userId)
    .single();

  const { data: templates } = await supabase
    .from("workout_templates")
    .select("*")
    .order("rotation_order", { ascending: true });

  const currentIdx = state?.current_rotation_index ?? 0;
  const currentOrder = rotationOrderFromIndex(currentIdx);

  const tpls = templates ?? [];
  const loaded = await Promise.all(
    tpls.map(async (t) => [t.id, await loadExercises(supabase, t.id)] as const)
  );
  const exercisesByTemplate = new Map(loaded);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Protocol</h1>
        </div>
      </div>

      <div className="space-y-4">
        {(templates ?? []).map((t) => (
          <ProgramTemplateCard
            key={t.id}
            template={t}
            exercises={exercisesByTemplate.get(t.id) ?? []}
            isCurrent={t.rotation_order === currentOrder}
          />
        ))}
      </div>
    </div>
  );
}

async function loadExercises(supabase: SupabaseClient, templateId: string) {
  const { data } = await supabase
    .from("template_exercises")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index", { ascending: true });
  return data ?? [];
}
