-- PR CITY seed: 8 rotation templates + exercises
-- Run after migrations. Requires at least one auth user for program_state (auto via trigger on signup).

-- Fixed template IDs for stable references
insert into public.workout_templates (
  id, name, phase, split, estimated_duration_minutes, preworkout_note, warmup_note, rotation_order, is_active
) values
(
  'a0000000-0000-4000-8000-000000000001',
  'Chest and Triceps (H)',
  'Hypertrophy',
  'Chest, Triceps',
  90,
  'YOU ARE NOT DOING THIS SHIT FASTED. Eat roughly 40–80g carbs and 15–30g protein about 1 hour before. Keep fat under 15g.',
  'WARM UP DEAR GOD',
  1,
  true
),
(
  'a0000000-0000-4000-8000-000000000002',
  'Back and Biceps (H)',
  'Hypertrophy',
  'Back, Biceps',
  90,
  null,
  'WARM UP DEAR GOD',
  2,
  true
),
(
  'a0000000-0000-4000-8000-000000000003',
  'Legs (H)',
  'Hypertrophy',
  'Legs',
  90,
  null,
  'WARM UP DEAR GOD',
  3,
  true
),
(
  'a0000000-0000-4000-8000-000000000004',
  'Active Recovery',
  'Recovery',
  'Active Recovery',
  20,
  'Rest / kind of rest. If you feel like you''re going to die, take it seriously. Running 2 miles on rest day means no run before next workout.',
  null,
  4,
  true
),
(
  'a0000000-0000-4000-8000-000000000005',
  'Chest and Triceps (S)',
  'Strength',
  'Chest, Triceps',
  90,
  null,
  'WARM UP DEAR GOD',
  5,
  true
),
(
  'a0000000-0000-4000-8000-000000000006',
  'Back and Biceps (S)',
  'Strength',
  'Back, Biceps',
  90,
  null,
  'WARM UP DEAR GOD',
  6,
  true
),
(
  'a0000000-0000-4000-8000-000000000007',
  'Legs (S)',
  'Strength',
  'Legs',
  90,
  null,
  'WARM UP DEAR GOD',
  7,
  true
),
(
  'a0000000-0000-4000-8000-000000000008',
  'Active Recovery',
  'Recovery',
  'Active Recovery',
  20,
  'Rest / kind of rest. If you feel like you''re going to die, take it seriously. Running 2 miles on rest day means no run before next workout.',
  null,
  8,
  true
)
on conflict (rotation_order) do nothing;

-- Template exercises (order_index 0-based)
-- Hypertrophy Chest (1)
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000001', 'Run', 'Warm-up', 1, 1, 1, 'Easy jog — log mi, min, and avg mph in the session card.', 60, 0),
('a0000000-0000-4000-8000-000000000001', 'Flat Bench', 'Chest', 4, 10, 12, '40–75% 1RM', 120, 1),
('a0000000-0000-4000-8000-000000000001', 'Incline Bench', 'Chest', 4, 10, 12, '40–75% 1RM', 120, 2),
('a0000000-0000-4000-8000-000000000001', 'Tricep Rope Pulldowns', 'Triceps', 4, 10, 12, null, 90, 3),
('a0000000-0000-4000-8000-000000000001', 'Flat Dumbbell Press', 'Chest', 2, 15, 20, '40–75% 1RM', 90, 4),
('a0000000-0000-4000-8000-000000000001', 'Incline Dumbbell Press', 'Chest', 2, 15, 20, '40–75% 1RM', 90, 5),
('a0000000-0000-4000-8000-000000000001', 'Pec Deck OR Down Cables', 'Chest', 2, 15, 20, null, 75, 6),
('a0000000-0000-4000-8000-000000000001', 'Incline Cables', 'Chest', 2, 15, 20, null, 75, 7),
('a0000000-0000-4000-8000-000000000001', 'Tricep Bar Pressdowns', 'Triceps', 4, 10, 12, null, 90, 8);

-- Hypertrophy Back (2)
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000002', 'Run', 'Warm-up', 1, 1, 1, 'Easy jog — log mi, min, and avg mph in the session card.', 60, 0),
('a0000000-0000-4000-8000-000000000002', 'Pull Ups', 'Back', 4, 10, 12, 'Bodyweight — Straight Bar', 120, 1),
('a0000000-0000-4000-8000-000000000002', 'Deadlifts', 'Back', 4, 10, 12, '40–75% 1RM', 150, 2),
('a0000000-0000-4000-8000-000000000002', 'Mid Rows OR Landmine', 'Back', 4, 10, 12, null, 90, 3),
('a0000000-0000-4000-8000-000000000002', 'Low Rows', 'Back', 4, 10, 12, 'Narrow Parallel — 40–75% 1RM', 90, 4),
('a0000000-0000-4000-8000-000000000002', 'Dumbbell Rows Each Arm', 'Back', 2, 15, 20, '40–75% 1RM', 90, 5),
('a0000000-0000-4000-8000-000000000002', 'Back Extensions', 'Back', 2, 15, 20, null, 75, 6),
('a0000000-0000-4000-8000-000000000002', 'Seated Good Mornings', 'Back', 2, 15, 20, null, 75, 7),
('a0000000-0000-4000-8000-000000000002', 'Bicep Curls', 'Biceps', 4, 10, 12, null, 75, 8),
('a0000000-0000-4000-8000-000000000002', 'Hammer Curls', 'Biceps', 4, 10, 12, null, 75, 9);

-- Hypertrophy Legs (3)
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000003', 'Bulgarian Split Squats', 'Legs', 3, 10, 12, '40–75% 1RM', 120, 0),
('a0000000-0000-4000-8000-000000000003', 'Walking Lunges', 'Legs', 3, 10, 12, '40–75% 1RM', 120, 1),
('a0000000-0000-4000-8000-000000000003', 'Back Squats OR Front Squats', 'Legs', 3, 10, 12, null, 150, 2),
('a0000000-0000-4000-8000-000000000003', 'Hamstring Curls', 'Legs', 3, 10, 12, '40–75% 1RM', 90, 3),
('a0000000-0000-4000-8000-000000000003', 'Leg Extensions', 'Legs', 3, 10, 12, '40–75% 1RM', 90, 4),
('a0000000-0000-4000-8000-000000000003', 'Calves', 'Legs', 4, 10, 12, null, 60, 5);

-- Active Recovery (4) — minimal rows; mostly notes on template
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000004', 'Light movement / walk', 'Recovery', 1, 10, 20, 'Easy — follow how you feel', 0, 0);

-- Strength Chest (5)
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000005', 'Run', 'Warm-up', 1, 1, 1, 'Easy jog — log mi, min, and avg mph in the session card.', 60, 0),
('a0000000-0000-4000-8000-000000000005', 'Flat Bench', 'Chest', 6, 4, 6, '75–80% 1RM — POWER / less TUT', 180, 1),
('a0000000-0000-4000-8000-000000000005', 'Incline Bench', 'Chest', 6, 4, 6, '75–80% 1RM — POWER / less TUT', 180, 2),
('a0000000-0000-4000-8000-000000000005', 'Flat Dumbbell Press', 'Chest', 6, 4, 6, '60–80% 1RM', 150, 3),
('a0000000-0000-4000-8000-000000000005', 'Incline Dumbbell Press', 'Chest', 6, 4, 6, '60–80% 1RM', 150, 4),
('a0000000-0000-4000-8000-000000000005', 'Tricep Rope Pulldowns', 'Triceps', 4, 10, 12, null, 90, 5),
('a0000000-0000-4000-8000-000000000005', 'Tricep Bar Pressdowns', 'Triceps', 4, 10, 12, null, 90, 6);

-- Strength Back (6)
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000006', 'Run', 'Warm-up', 1, 1, 1, 'Easy jog — log mi, min, and avg mph in the session card.', 60, 0),
('a0000000-0000-4000-8000-000000000006', 'Pull Ups', 'Back', 6, 4, 6, 'Weighted — 60–80% 1RM', 180, 1),
('a0000000-0000-4000-8000-000000000006', 'Deadlifts', 'Back', 6, 4, 6, '60–80% 1RM', 180, 2),
('a0000000-0000-4000-8000-000000000006', 'Back Extensions', 'Back', 2, 8, 12, null, 90, 3),
('a0000000-0000-4000-8000-000000000006', 'Seated Good Mornings', 'Back', 2, 8, 12, null, 90, 4),
('a0000000-0000-4000-8000-000000000006', 'Bicep Curls', 'Biceps', 6, 4, 6, null, 120, 5),
('a0000000-0000-4000-8000-000000000006', 'Hammer Curls', 'Biceps', 6, 4, 6, null, 120, 6);

-- Strength Legs (7)
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000007', 'Back Squats', 'Legs', 6, 4, 6, null, 180, 0),
('a0000000-0000-4000-8000-000000000007', 'Leg Press', 'Legs', 6, 4, 6, null, 150, 1),
('a0000000-0000-4000-8000-000000000007', 'Goblet Squats', 'Legs', 6, 4, 6, null, 120, 2),
('a0000000-0000-4000-8000-000000000007', 'Hamstring Curls', 'Legs', 3, 10, 12, '40–75% 1RM', 90, 3),
('a0000000-0000-4000-8000-000000000007', 'Leg Extensions', 'Legs', 3, 10, 12, '40–75% 1RM', 90, 4),
('a0000000-0000-4000-8000-000000000007', 'Calves', 'Legs', 4, 10, 12, null, 60, 5);

-- Active Recovery slot 8 — same day intent as rotation slot 4
insert into public.template_exercises (template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index) values
('a0000000-0000-4000-8000-000000000008', 'Light movement / walk', 'Recovery', 1, 10, 20, 'Easy — follow how you feel', 0, 0);
