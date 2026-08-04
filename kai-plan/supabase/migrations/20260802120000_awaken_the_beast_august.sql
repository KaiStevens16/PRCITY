-- Awaken the beast August — new daily driver (archives Beastmodes Summer 26)

insert into public.training_programs (id, slug, name, era_label, description, rotation_length, preworkout_note, is_archived)
values
  (
    'b0000000-0000-4000-8000-000000000003',
    'awaken-the-beast-august',
    'Awaken the beast August',
    'Awaken the beast August',
    '5-week hypertrophy block. Shoot for the moon: 178 → 190 lb. Restart at chest or rest as needed.',
    5,
    'Hypertrophy — not fasted. Eat ~40–80g carbs & 15–30g protein (keep fat <15g) roughly 1h before. Daily: 3250 cal · P230±20 · C312±20 · F72.',
    false
  )
on conflict (id) do update set
  name = excluded.name,
  era_label = excluded.era_label,
  description = excluded.description,
  rotation_length = excluded.rotation_length,
  preworkout_note = excluded.preworkout_note,
  is_archived = excluded.is_archived;

-- Archive Summer block
update public.training_programs
set is_archived = true
where id = 'b0000000-0000-4000-8000-000000000002';

update public.program_state
set
  active_program_id = 'b0000000-0000-4000-8000-000000000003',
  current_rotation_index = 0,
  current_block_name = 'Awaken the beast August',
  current_objective = '178 → 190 lb · 5 weeks',
  timeline_note = 'Awaken the beast August',
  program_metadata = coalesce(program_metadata, '{}'::jsonb) || jsonb_build_object(
    'progress_measures', jsonb_build_array(
      'Weight Maintenance',
      'Body Recomposition',
      'Nutrition Maintenance'
    ),
    'nutrition_targets', jsonb_build_object(
      'calories', 3250,
      'protein_g', 230,
      'carbs_g', 312,
      'fat_g', 72
    )
  );

-- August templates
insert into public.workout_templates (
  id, program_id, name, phase, split, estimated_duration_minutes, preworkout_note, warmup_note, rotation_order, is_active
) values
(
  'b1000000-0000-4000-8000-000000000011',
  'b0000000-0000-4000-8000-000000000003',
  'Chesticles',
  'Hypertrophy',
  'Chesticles',
  56,
  null,
  'WARM UP DEAR GOD',
  1,
  true
),
(
  'b1000000-0000-4000-8000-000000000012',
  'b0000000-0000-4000-8000-000000000003',
  'Summer O'' Arms',
  'Hypertrophy',
  'Summer O'' Arms',
  60,
  null,
  'WARM UP DEAR GOD',
  2,
  true
),
(
  'b1000000-0000-4000-8000-000000000013',
  'b0000000-0000-4000-8000-000000000003',
  'Drumstick Day 🍗',
  'Hypertrophy',
  'Drumstick Day 🍗',
  50,
  null,
  'WARM UP DEAR GOD',
  3,
  true
),
(
  'b1000000-0000-4000-8000-000000000014',
  'b0000000-0000-4000-8000-000000000003',
  'Tug Day',
  'Hypertrophy',
  'Tug Day',
  50,
  null,
  'WARM UP DEAR GOD',
  4,
  true
),
(
  'b1000000-0000-4000-8000-000000000015',
  'b0000000-0000-4000-8000-000000000003',
  'Summer O'' Arms (B)',
  'Hypertrophy',
  'Summer O'' Arms',
  60,
  null,
  'WARM UP DEAR GOD',
  5,
  true
)
on conflict (id) do update set
  program_id = excluded.program_id,
  name = excluded.name,
  phase = excluded.phase,
  split = excluded.split,
  estimated_duration_minutes = excluded.estimated_duration_minutes,
  warmup_note = excluded.warmup_note,
  rotation_order = excluded.rotation_order,
  is_active = excluded.is_active;

-- Chesticles
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000011', 'Incline Push-ups (Bodyweight)', 'Chest', 3, 10, 12, '~5 min', 90, 0),
('b1000000-0000-4000-8000-000000000011', 'Flat Push-ups (Bodyweight)', 'Chest', 3, 10, 12, '~5 min', 90, 1),
('b1000000-0000-4000-8000-000000000011', 'Decline Push-ups (Bodyweight)', 'Chest', 3, 10, 12, '~5 min', 90, 2),
('b1000000-0000-4000-8000-000000000011', 'Ancestral Press (Flat)', 'Chest', 3, 10, 12, '~5 min', 90, 3),
('b1000000-0000-4000-8000-000000000011', 'Incline DB Bench', 'Chest', 3, 10, 12, '~5 min', 90, 4),
('b1000000-0000-4000-8000-000000000011', 'High-to-low Cable Flies', 'Chest', 2, 20, 20, '~5 min', 60, 5),
('b1000000-0000-4000-8000-000000000011', 'Mid Cable Flies', 'Chest', 2, 20, 20, '~5 min', 60, 6),
('b1000000-0000-4000-8000-000000000011', 'Low Cable Flies', 'Chest', 2, 20, 20, '~5 min', 60, 7),
('b1000000-0000-4000-8000-000000000011', 'Tricep Pulldowns', 'Triceps', 4, 20, 20, '~8 min', 60, 8),
('b1000000-0000-4000-8000-000000000011', 'Reverse Tricep Pushdowns', 'Triceps', 4, 20, 20, 'Time permitting · ~8 min', 60, 9)
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;

-- Arms (slot 2)
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000012', 'Bicep Curls', 'Biceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 0),
('b1000000-0000-4000-8000-000000000012', 'Hammer Curls', 'Biceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 1),
('b1000000-0000-4000-8000-000000000012', 'Preacher EZ Curls', 'Biceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 2),
('b1000000-0000-4000-8000-000000000012', 'Skullcrushers', 'Triceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 3),
('b1000000-0000-4000-8000-000000000012', 'Tricep Rope Pulldowns', 'Triceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 4),
('b1000000-0000-4000-8000-000000000012', 'Tricep Bar Pressdowns', 'Triceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 5)
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;

-- Legs
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000013', 'Back Squats', 'Legs', 4, 20, 20, 'Pyramid 20/20/20/20 · ~25 min', 120, 0),
('b1000000-0000-4000-8000-000000000013', 'Bulgy Split Squats', 'Legs', 4, 10, 20, 'BW · 10/10/10/20 · ~15 min rest / ~4 min work', 120, 1),
('b1000000-0000-4000-8000-000000000013', 'Walking Lunges', 'Legs', 4, 10, 12, '50% ORM · really light · ~8 min rest / ~4 min work', 120, 2),
('b1000000-0000-4000-8000-000000000013', 'Hack Squats', 'Legs', 4, 10, 12, '50% ORM · really light · ~8 min rest / ~4 min work', 120, 3),
('b1000000-0000-4000-8000-000000000013', 'Leg Extensions', 'Legs', 2, 20, 20, '20 reps', 60, 4),
('b1000000-0000-4000-8000-000000000013', 'Leg Curls', 'Legs', 2, 20, 20, '20 reps', 60, 5)
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;

-- Back, Biceps
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000014', 'Deadlifts', 'Back', 4, 20, 20, 'Pyramid 20/20/20/20 · ~4 min rest / ~2 min work', 120, 0),
('b1000000-0000-4000-8000-000000000014', 'Pull Ups', 'Back', 4, 1, 30, 'AMRAP · bodyweight', 90, 1),
('b1000000-0000-4000-8000-000000000014', 'Landmine', 'Back', 2, 10, 12, '~5 min', 90, 2),
('b1000000-0000-4000-8000-000000000014', 'Low Rows', 'Back', 2, 10, 12, '40–75% ORM · narrow parallel · ~4 min rest / ~2 min work', 90, 3),
('b1000000-0000-4000-8000-000000000014', 'Back Extensions', 'Back', 2, 15, 20, '~4 min rest / ~2 min work', 60, 4),
('b1000000-0000-4000-8000-000000000014', 'X-Pull Parallel', 'Back', 2, 10, 12, '~6 min', 60, 5),
('b1000000-0000-4000-8000-000000000014', 'X-Pull Down', 'Back', 2, 10, 12, '~6 min', 60, 6)
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;

-- Arms (B) — PDF order differs from slot 2
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000015', 'Bicep Curls', 'Biceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 0),
('b1000000-0000-4000-8000-000000000015', 'Skullcrushers', 'Triceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 1),
('b1000000-0000-4000-8000-000000000015', 'Hammer Curls', 'Biceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 2),
('b1000000-0000-4000-8000-000000000015', 'Tricep Rope Pulldowns', 'Triceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 3),
('b1000000-0000-4000-8000-000000000015', 'Preacher EZ Curls', 'Biceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 4),
('b1000000-0000-4000-8000-000000000015', 'Tricep Bar Pressdowns', 'Triceps', 4, 20, 20, 'Pyramid 20/20/20/20 · ~8 min', 60, 5)
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;
