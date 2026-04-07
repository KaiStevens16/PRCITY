-- Rename template names to concise labels with phase suffixes.

update public.workout_templates
set name = 'Chest and Triceps (H)', updated_at = now()
where id = 'a0000000-0000-4000-8000-000000000001';

update public.workout_templates
set name = 'Back and Biceps (H)', updated_at = now()
where id = 'a0000000-0000-4000-8000-000000000002';

update public.workout_templates
set name = 'Legs (H)', updated_at = now()
where id = 'a0000000-0000-4000-8000-000000000003';

update public.workout_templates
set name = 'Chest and Triceps (S)', updated_at = now()
where id = 'a0000000-0000-4000-8000-000000000005';

update public.workout_templates
set name = 'Back and Biceps (S)', updated_at = now()
where id = 'a0000000-0000-4000-8000-000000000006';

update public.workout_templates
set name = 'Legs (S)', updated_at = now()
where id = 'a0000000-0000-4000-8000-000000000007';
