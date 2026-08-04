-- Drumstick Day: split Leg Extensions & Curls Superset into separate slots

delete from public.template_exercises
where template_id = 'b1000000-0000-4000-8000-000000000013';

insert into public.template_exercises (
  template_id, exercise_name, exercise_group, target_sets, rep_min, rep_max, intensity_note, rest_seconds, order_index
) values
('b1000000-0000-4000-8000-000000000013', 'Back Squats', 'Legs', 4, 20, 20, 'Pyramid 20/20/20/20 · ~25 min', 120, 0),
('b1000000-0000-4000-8000-000000000013', 'Bulgy Split Squats', 'Legs', 4, 10, 20, 'BW · 10/10/10/20 · ~15 min rest / ~4 min work', 120, 1),
('b1000000-0000-4000-8000-000000000013', 'Walking Lunges', 'Legs', 4, 10, 12, '50% ORM · really light · ~8 min rest / ~4 min work', 120, 2),
('b1000000-0000-4000-8000-000000000013', 'Hack Squats', 'Legs', 4, 10, 12, '50% ORM · really light · ~8 min rest / ~4 min work', 120, 3),
('b1000000-0000-4000-8000-000000000013', 'Leg Extensions', 'Legs', 2, 20, 20, '20 reps', 60, 4),
('b1000000-0000-4000-8000-000000000013', 'Leg Curls', 'Legs', 2, 20, 20, '20 reps', 60, 5);
