-- Per-exercise "weird" marker within a session (keeps day-level weird_day intact).

alter table public.session_exercises
  add column if not exists weird_exercise boolean not null default false,
  add column if not exists weird_exercise_notes text;

comment on column public.session_exercises.weird_exercise is
  'Marks a single exercise as cut/modified due to pain, fatigue, or constraints.';
comment on column public.session_exercises.weird_exercise_notes is
  'Optional notes for why this specific exercise was weird.';
