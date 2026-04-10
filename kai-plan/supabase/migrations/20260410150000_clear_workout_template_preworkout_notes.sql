-- Pre-workout notes removed from product; clear stored values (column retained for compatibility).
update public.workout_templates
set preworkout_note = null
where preworkout_note is not null;
