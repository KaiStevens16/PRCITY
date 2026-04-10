-- Hypertrophy back day: Back Extensions + Seated Good Mornings → 8–12 reps (was 15–20 in seed).
-- Template: Back and Biceps (H) — id a0000000-0000-4000-8000-000000000002

update public.template_exercises
set rep_min = 8, rep_max = 12
where template_id = 'a0000000-0000-4000-8000-000000000002'
  and exercise_name in ('Back Extensions', 'Seated Good Mornings');
