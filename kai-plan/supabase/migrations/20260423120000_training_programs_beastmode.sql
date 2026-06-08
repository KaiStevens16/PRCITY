-- Multi-program support + Kai Beastmode Summer protocol

create table if not exists public.training_programs (
  id uuid primary key,
  slug text not null unique,
  name text not null,
  era_label text not null default '',
  description text,
  rotation_length integer not null default 8 check (rotation_length > 0 and rotation_length <= 32),
  preworkout_note text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.training_programs (id, slug, name, era_label, description, rotation_length, preworkout_note, is_archived)
values
  (
    'b0000000-0000-4000-8000-000000000001',
    'pr-city',
    'Animal Spring 26',
    'Animal Spring 26',
    'Original 8-slot hypertrophy / strength / recovery rotation.',
    8,
    null,
    true
  ),
  (
    'b0000000-0000-4000-8000-000000000002',
    'kai-beastmode-summer',
    'Kai Beastmode Summer',
    'Beastmodes Summer 26',
    '5-day hypertrophy block. Restart at chest or rest as needed.',
    5,
    'Hypertrophy — not fasted. Eat ~40–80g carbs & 15–30g protein (keep fat <15g) roughly 1h before.',
    false
  )
on conflict (id) do update set
  name = excluded.name,
  era_label = excluded.era_label,
  description = excluded.description,
  rotation_length = excluded.rotation_length,
  preworkout_note = excluded.preworkout_note,
  is_archived = excluded.is_archived;

alter table public.workout_templates
  add column if not exists program_id uuid references public.training_programs (id) on delete cascade;

update public.workout_templates
set program_id = 'b0000000-0000-4000-8000-000000000001'
where program_id is null;

alter table public.workout_templates
  drop constraint if exists workout_templates_rotation_order_key;

alter table public.workout_templates
  alter column program_id set not null;

alter table public.workout_templates
  add constraint workout_templates_program_rotation_unique unique (program_id, rotation_order);

alter table public.program_state
  drop constraint if exists program_state_current_rotation_index_check;

alter table public.program_state
  add constraint program_state_current_rotation_index_check
  check (current_rotation_index >= 0 and current_rotation_index < 32);

alter table public.program_state
  add column if not exists active_program_id uuid references public.training_programs (id);

update public.program_state
set
  active_program_id = coalesce(active_program_id, 'b0000000-0000-4000-8000-000000000002'),
  current_rotation_index = 0,
  current_block_name = 'Beastmodes Summer 26',
  current_objective = 'Hypertrophy block',
  timeline_note = 'Beastmodes Summer 26';

alter table public.sessions
  add column if not exists program_id uuid references public.training_programs (id);

alter table public.sessions
  add column if not exists warmup_checklist jsonb not null default '{}'::jsonb;

update public.sessions s
set program_id = wt.program_id
from public.workout_templates wt
where s.template_id = wt.id
  and s.program_id is null;

-- Older sessions without a template link → Animal Spring 26 block
update public.sessions
set program_id = 'b0000000-0000-4000-8000-000000000001'
where program_id is null;

-- Kai Beastmode Summer templates
insert into public.workout_templates (
  id, program_id, name, phase, split, estimated_duration_minutes, preworkout_note, warmup_note, rotation_order, is_active
) values
(
  'b1000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'Chest, Triceps',
  'Hypertrophy',
  'Chest, Triceps',
  56,
  null,
  'WARM UP DEAR GOD',
  1,
  true
),
(
  'b1000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  'Shoulders, Arms',
  'Hypertrophy',
  'Shoulders, Arms',
  54,
  null,
  'WARM UP DEAR GOD',
  2,
  true
),
(
  'b1000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000002',
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
  'b1000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000002',
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
  'b1000000-0000-4000-8000-000000000005',
  'b0000000-0000-4000-8000-000000000002',
  'Shoulders, Arms (B)',
  'Hypertrophy',
  'Shoulders, Arms',
  54,
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

-- Chest, Triceps
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000001', 'Incline / Flat / Decline Push-ups (Bodyweight)', 'Chest', 3, 10, 12, '~15 min', 90, 0),
('b1000000-0000-4000-8000-000000000001', 'Ancestral Press (Flat)', 'Chest', 3, 10, 12, '~5 min', 90, 1),
('b1000000-0000-4000-8000-000000000001', 'Hex Press (db Incline)', 'Chest', 3, 10, 12, '~5 min', 90, 2),
('b1000000-0000-4000-8000-000000000001', 'High-to-low Cable Flies', 'Chest', 2, 20, 20, '~5 min', 60, 3),
('b1000000-0000-4000-8000-000000000001', 'Mid Cable Flies', 'Chest', 2, 20, 20, '~5 min', 60, 4),
('b1000000-0000-4000-8000-000000000001', 'Low Cable Flies', 'Chest', 2, 20, 20, '~5 min', 60, 5),
('b1000000-0000-4000-8000-000000000001', 'Tricep Pulldowns', 'Triceps', 4, 20, 20, '~8 min', 60, 6),
('b1000000-0000-4000-8000-000000000001', 'Reverse Tricep Pushdowns', 'Triceps', 4, 20, 20, 'Time permitting · ~8 min', 60, 7)
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;

-- Shoulders, Arms (slot 2)
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000002', 'Chin Tucks', 'Shoulders', 2, 10, 12, '~2 min', 60, 0),
('b1000000-0000-4000-8000-000000000002', 'Landmine Press (Each Arm)', 'Shoulders', 3, 10, 12, '~10 min', 90, 1),
('b1000000-0000-4000-8000-000000000002', 'L-Raises', 'Shoulders', 2, 10, 12, '~4 min', 60, 2),
('b1000000-0000-4000-8000-000000000002', 'V-Raises', 'Shoulders', 2, 10, 12, '~4 min', 60, 3),
('b1000000-0000-4000-8000-000000000002', 'Side Raises', 'Shoulders', 2, 10, 10, 'Each shoulder · ~8 min', 60, 4),
('b1000000-0000-4000-8000-000000000002', 'Face Pulls', 'Shoulders', 3, 10, 12, '~5 min', 60, 5),
('b1000000-0000-4000-8000-000000000002', 'Bicep Curls', 'Biceps', 3, 10, 12, '~8 min', 60, 6),
('b1000000-0000-4000-8000-000000000002', 'Diamond Push-ups', 'Triceps', 3, 6, 12, '~5 min', 90, 7),
('b1000000-0000-4000-8000-000000000002', 'Hammer Curls', 'Biceps', 3, 10, 12, '~8 min', 60, 8),
('b1000000-0000-4000-8000-000000000002', 'Burnout Tricep Pulldowns', 'Triceps', 3, 8, 25, 'Burnout · ~5–8 min', 45, 9)
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
('b1000000-0000-4000-8000-000000000003', 'Bulgy Split Squats', 'Legs', 3, 10, 12, '40–75% ORM · ~8 min rest / ~4 min work', 120, 0),
('b1000000-0000-4000-8000-000000000003', 'Walking Lunges', 'Legs', 3, 10, 12, '40–75% ORM · ~8 min rest / ~4 min work', 120, 1),
('b1000000-0000-4000-8000-000000000003', 'Back Squats', 'Legs', 3, 10, 12, '~5 min', 120, 2),
('b1000000-0000-4000-8000-000000000003', 'Hack Squats', 'Legs', 3, 10, 12, '40–75% ORM · ~8 min rest / ~4 min work', 120, 3),
('b1000000-0000-4000-8000-000000000003', 'Bodyweight Bulgy Split Squats', 'Legs', 2, 10, 10, '~5 min', 60, 4)
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
('b1000000-0000-4000-8000-000000000004', 'Ring Stability Work', 'Warm-up', 1, 0, 0, 'Hold for 20 sec, 10 depressions, hold for 20 sec', 60, 0),
('b1000000-0000-4000-8000-000000000004', 'Deadlifts', 'Back', 2, 10, 12, '40–75% ORM · ~4 min rest / ~2 min work', 120, 1),
('b1000000-0000-4000-8000-000000000004', 'Pull Ups', 'Back', 4, 10, 12, 'Bodyweight · straight bar · ~8 min rest / ~4 min work', 120, 2),
('b1000000-0000-4000-8000-000000000004', 'Landmine', 'Back', 2, 10, 12, '~5 min', 90, 3),
('b1000000-0000-4000-8000-000000000004', 'Low Rows', 'Back', 2, 10, 12, '40–75% ORM · narrow parallel · ~4 min rest / ~2 min work', 90, 4),
('b1000000-0000-4000-8000-000000000004', 'Back Extensions', 'Back', 2, 15, 20, '~4 min rest / ~2 min work', 60, 5),
('b1000000-0000-4000-8000-000000000004', 'X-Pull Parallel', 'Back', 2, 10, 12, '~6 min', 60, 6),
('b1000000-0000-4000-8000-000000000004', 'X-Pull Down', 'Back', 2, 10, 12, '~6 min', 60, 7)
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;

-- Shoulders, Arms (slot 5 — same as slot 2)
insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
)
select
  'b1000000-0000-4000-8000-000000000005',
  exercise_name,
  exercise_group,
  target_sets,
  rep_min,
  rep_max,
  intensity_note,
  rest_seconds,
  order_index
from public.template_exercises
where template_id = 'b1000000-0000-4000-8000-000000000002'
on conflict (template_id, order_index) do update set
  exercise_name = excluded.exercise_name,
  exercise_group = excluded.exercise_group,
  target_sets = excluded.target_sets,
  rep_min = excluded.rep_min,
  rep_max = excluded.rep_max,
  intensity_note = excluded.intensity_note,
  rest_seconds = excluded.rest_seconds;
