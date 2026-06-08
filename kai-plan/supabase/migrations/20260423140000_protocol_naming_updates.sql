-- Bulgy split squats + Beastmodes day renames

-- Exercise names (all programs + logged history)
update public.template_exercises
set exercise_name = 'Bulgy Split Squats'
where exercise_name = 'Bulgarian Split Squats';

update public.template_exercises
set exercise_name = 'Bodyweight Bulgy Split Squats'
where exercise_name = 'Bodyweight Bulgarian Split Squats';

update public.session_exercises
set planned_exercise_name = 'Bulgy Split Squats'
where planned_exercise_name = 'Bulgarian Split Squats';

update public.session_exercises
set actual_exercise_name = 'Bulgy Split Squats'
where actual_exercise_name = 'Bulgarian Split Squats';

update public.session_exercises
set planned_exercise_name = 'Bodyweight Bulgy Split Squats'
where planned_exercise_name = 'Bodyweight Bulgarian Split Squats';

update public.session_exercises
set actual_exercise_name = 'Bodyweight Bulgy Split Squats'
where actual_exercise_name = 'Bodyweight Bulgarian Split Squats';

-- Beastmodes Summer 26 workout day titles
update public.workout_templates
set name = 'Drumstick Day 🍗', split = 'Drumstick Day 🍗'
where id = 'b1000000-0000-4000-8000-000000000003';

update public.workout_templates
set name = 'Tug Day', split = 'Tug Day'
where id = 'b1000000-0000-4000-8000-000000000004';

update public.sessions
set split = 'Drumstick Day 🍗'
where template_id = 'b1000000-0000-4000-8000-000000000003';

update public.sessions
set split = 'Tug Day'
where template_id = 'b1000000-0000-4000-8000-000000000004';

update public.template_exercises
set
  target_sets = 1,
  rep_min = 0,
  rep_max = 0,
  intensity_note = 'Hold for 20 sec, 10 depressions, hold for 20 sec'
where exercise_name = 'Ring Stability Work';
