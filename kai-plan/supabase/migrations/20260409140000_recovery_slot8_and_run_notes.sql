-- Rotation slot 8 matches slot 4 (same Active Recovery day). Refresh Run warm-up copy.

update public.workout_templates
set
  name = 'Active Recovery',
  phase = 'Recovery',
  split = 'Active Recovery',
  estimated_duration_minutes = 20,
  preworkout_note = 'Rest / kind of rest. If you feel like you''re going to die, take it seriously. Running 2 miles on rest day means no run before next workout.',
  warmup_note = null,
  updated_at = now()
where id = 'a0000000-0000-4000-8000-000000000008';

delete from public.template_exercises
where template_id = 'a0000000-0000-4000-8000-000000000008';

insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
)
values (
  'a0000000-0000-4000-8000-000000000008',
  'Light movement / walk',
  'Recovery',
  1,
  10,
  20,
  'Easy — follow how you feel',
  0,
  0
);

update public.template_exercises
set
  intensity_note = 'Easy jog — log mi, min, and avg mph in the session card.',
  updated_at = now()
where exercise_name = 'Run'
  and coalesce(exercise_group, '') = 'Warm-up';

update public.program_state
set current_objective = 'PR CITY block', updated_at = now()
where current_objective = 'Adjust to new training rotation';

-- New signups: match updated default objective
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.program_state (user_id, current_block_name, current_objective, timeline_note, program_metadata)
  values (
    new.id,
    'PR CITY',
    'PR CITY block',
    '4–8 weeks',
    jsonb_build_object(
      'progress_measures', jsonb_build_array(
        'Weight Maintenance',
        'Body Recomposition',
        'Nutrition Maintenance'
      )
    )
  );
  return new;
end;
$$;
