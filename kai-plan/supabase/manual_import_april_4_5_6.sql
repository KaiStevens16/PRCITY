-- Import Kai's logged sessions (Apr 4–6). Run in Supabase SQL Editor.
-- Prerequisites: seed.sql already ran; you have a row in program_state (open the app once).
-- Re-running: deletes any existing sessions on these dates for your user, then re-imports.

-- === Change year here if these were a different year ===
-- Dates stored: 2026-04-04 (chest), 2026-04-05 (back), 2026-04-06 (legs partial)

DELETE FROM public.sessions s
WHERE s.date IN ('2026-04-04', '2026-04-05', '2026-04-06')
  AND s.user_id = (SELECT user_id FROM public.program_state LIMIT 1);

DO $body$
DECLARE
  uid uuid;
  sid uuid;
  te_id uuid;
  se_id uuid;
  t_chest uuid := 'a0000000-0000-4000-8000-000000000001';
  t_back uuid := 'a0000000-0000-4000-8000-000000000002';
  t_legs uuid := 'a0000000-0000-4000-8000-000000000003';
BEGIN
  SELECT user_id INTO uid FROM public.program_state LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No program_state row. Open PR CITY in the browser once, then run this again.';
  END IF;

  -- ========== APRIL 4 — Chest / triceps ==========
  INSERT INTO public.sessions (
    user_id, date, template_id, phase, split, status,
    started_at, completed_at, duration_minutes, session_notes, rotation_index_snapshot
  ) VALUES (
    uid, '2026-04-04', t_chest, 'Hypertrophy', 'Chest, Triceps', 'completed',
    '2026-04-04 17:00:00+00', '2026-04-04 18:45:00+00', 90, NULL, 0
  ) RETURNING id INTO sid;

  -- Run (~10 min / 1 mile)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 0;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Run', 'Run', 0, true, '10 min run / ~1 mile')
  RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, reps, completed, set_note)
  VALUES (se_id, 1, 10, true, '~1 mile');

  -- Flat bench (5 sets)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 1;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Flat Bench', 'Flat Bench', 1, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 135, 3, true), (se_id, 2, 135, 10, true), (se_id, 3, 135, 10, true),
    (se_id, 4, 135, 10, true), (se_id, 5, 135, 10, true);

  -- Incline bench
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 2;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Incline Bench', 'Incline Bench', 2, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 135, 10, true), (se_id, 2, 135, 10, true), (se_id, 3, 135, 10, true), (se_id, 4, 135, 10, true);

  -- Tricep rope pressdown
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 3;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Tricep Rope Pulldowns', 'Tricep Rope Pulldowns', 3, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 30, 12, true), (se_id, 2, 30, 12, true), (se_id, 3, 30, 12, true), (se_id, 4, 30, 12, true);

  -- Flat DB press
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 4;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Flat Dumbbell Press', 'Flat Dumbbell Press', 4, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 45, 20, true), (se_id, 2, 45, 20, true);

  -- Incline DB press
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 5;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Incline Dumbbell Press', 'Incline Dumbbell Press', 5, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 40, 15, true), (se_id, 2, 40, 15, true);

  -- Pec Dec
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 6;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Pec Deck OR Down Cables', 'Pec Deck', 6, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 85, 15, true), (se_id, 2, 85, 15, true);

  -- Incline cables → actual: incline CM fly (substitution)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 7;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, is_substitution, substitution_reason, order_index, completed)
  VALUES (sid, te_id, 'Incline Cables', 'Incline CM fly', true, 'Cable machine fly variation', 7, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 13, 12, true), (se_id, 2, 13, 12, true);

  -- Tricep bar pressdowns → EZ-bar CM pushdown (substitution)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_chest AND order_index = 8;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, is_substitution, substitution_reason, order_index, completed)
  VALUES (sid, te_id, 'Tricep Bar Pressdowns', 'Tricep CM pushdown w EZ bar', true, 'EZ bar / cable stack', 8, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 30, 15, true), (se_id, 2, 35, 15, true), (se_id, 3, 35, 15, true), (se_id, 4, 35, 15, true);

  -- ========== APRIL 5 — Back / biceps ==========
  INSERT INTO public.sessions (
    user_id, date, template_id, phase, split, status,
    started_at, completed_at, duration_minutes, session_notes, rotation_index_snapshot
  ) VALUES (
    uid, '2026-04-05', t_back, 'Hypertrophy', 'Back, Biceps', 'completed',
    '2026-04-05 17:00:00+00', '2026-04-05 19:00:00+00', 90, NULL, 0
  ) RETURNING id INTO sid;

  -- Run 1 mile
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 0;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Run', 'Run', 0, true, '~1 mile') RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, reps, completed, set_note)
  VALUES (se_id, 1, 10, true, '~1 mile');

  -- Pull-ups (BW: first set 3 reps, then 4×10)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 1;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Pull Ups', 'Pull Ups', 1, true, 'Bodyweight') RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed, set_note) VALUES
    (se_id, 1, NULL, 3, true, 'BW'),
    (se_id, 2, NULL, 10, true, 'BW'), (se_id, 3, NULL, 10, true, 'BW'),
    (se_id, 4, NULL, 10, true, 'BW'), (se_id, 5, NULL, 10, true, 'BW');

  -- Deadlifts (5 sets)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 2;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Deadlifts', 'Deadlifts', 2, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 135, 4, true),
    (se_id, 2, 185, 10, true), (se_id, 3, 185, 10, true), (se_id, 4, 185, 10, true), (se_id, 5, 185, 10, true);

  -- Mid rows (plate loaded, chest supported)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 3;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, is_substitution, substitution_reason, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Mid Rows OR Landmine', 'Mid rows (plate loaded, chest supported)', true, 'As logged', 3, true, NULL) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 90, 10, true), (se_id, 2, 90, 11, true), (se_id, 3, 90, 10, true), (se_id, 4, 90, 12, true);

  -- Low row
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 4;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, is_substitution, substitution_reason, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Low Rows', 'Low row (CM, narrow ~45° grip to lower belly)', true, 'As logged', 4, true, NULL) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 100, 10, true), (se_id, 2, 100, 10, true), (se_id, 3, 100, 10, true), (se_id, 4, 100, 10, true);

  -- DB row single arm
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 5;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Dumbbell Rows Each Arm', 'Bentover DB row (knee on bench, single arm)', 5, true, NULL) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 40, 15, true), (se_id, 2, 40, 15, true);

  -- Back extensions (45 lb DB each hand)
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 6;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Back Extensions', 'Back Extensions', 6, true, '45 lb DB each hand') RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 45, 15, true), (se_id, 2, 45, 15, true);

  -- Seated good mornings
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 7;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Seated Good Mornings', 'Seated Good Mornings', 7, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 65, 15, true), (se_id, 2, 65, 15, true);

  -- Bicep curls
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 8;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Bicep Curls', 'Standing bicep curls', 8, true, NULL) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 20, 12, true), (se_id, 2, 20, 12, true), (se_id, 3, 20, 12, true), (se_id, 4, 20, 12, true);

  -- Hammer curls seated
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_back AND order_index = 9;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Hammer Curls', 'Hammer curls seated', 9, true, NULL) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 20, 12, true), (se_id, 2, 20, 12, true), (se_id, 3, 20, 12, true), (se_id, 4, 20, 12, true);

  -- ========== APRIL 6 — Legs (cut short) ==========
  INSERT INTO public.sessions (
    user_id, date, template_id, phase, split, status,
    started_at, completed_at, duration_minutes, session_notes, rotation_index_snapshot
  ) VALUES (
    uid, '2026-04-06', t_legs, 'Hypertrophy', 'Legs', 'completed',
    '2026-04-06 17:00:00+00', '2026-04-06 17:35:00+00', 35,
    'Left adductor was hurting — stopped after walking lunges.', 0
  ) RETURNING id INTO sid;

  -- Bulgarian split squats
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_legs AND order_index = 0;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed)
  VALUES (sid, te_id, 'Bulgarian Split Squats', 'Bulgarian Split Squats', 0, true) RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 30, 12, true), (se_id, 2, 30, 10, true), (se_id, 3, 30, 12, true);

  -- Walking lunges — only 1 set logged
  SELECT id INTO te_id FROM public.template_exercises WHERE template_id = t_legs AND order_index = 1;
  INSERT INTO public.session_exercises (session_id, template_exercise_id, planned_exercise_name, actual_exercise_name, order_index, completed, exercise_notes)
  VALUES (sid, te_id, 'Walking Lunges', 'Walking Lunges', 1, true, 'Left adductor hurting — called it after this set.') RETURNING id INTO se_id;
  INSERT INTO public.set_logs (session_exercise_id, set_number, weight, reps, completed) VALUES
    (se_id, 1, 30, 10, true);

END $body$;
