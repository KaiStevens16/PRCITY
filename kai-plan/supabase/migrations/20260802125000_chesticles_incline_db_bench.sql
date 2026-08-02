-- Chesticles: Hex Press (Incline) → Incline DB Bench

update public.template_exercises
set exercise_name = 'Incline DB Bench'
where template_id = 'b1000000-0000-4000-8000-000000000011'
  and exercise_name = 'Hex Press (Incline)';

update public.session_exercises
set
  planned_exercise_name = case
    when planned_exercise_name = 'Hex Press (Incline)' then 'Incline DB Bench'
    else planned_exercise_name
  end,
  actual_exercise_name = case
    when actual_exercise_name = 'Hex Press (Incline)' then 'Incline DB Bench'
    else actual_exercise_name
  end
where planned_exercise_name = 'Hex Press (Incline)'
   or actual_exercise_name = 'Hex Press (Incline)';
