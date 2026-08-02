-- Chesticles: split Incline/Flat/Decline push-ups into three 3-set slots

delete from public.template_exercises
where template_id = 'b1000000-0000-4000-8000-000000000011';

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
('b1000000-0000-4000-8000-000000000011', 'Reverse Tricep Pushdowns', 'Triceps', 4, 20, 20, 'Time permitting · ~8 min', 60, 9);
