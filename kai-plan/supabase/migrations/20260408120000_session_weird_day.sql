-- Flag sessions that didn’t go to plan (injury, cut short, etc.) for dashboard emphasis.

alter table public.sessions
  add column if not exists weird_day boolean not null default false;

alter table public.sessions
  add column if not exists weird_day_notes text;

comment on column public.sessions.weird_day is
  'True when the athlete marked the session as an off / weird day.';
comment on column public.sessions.weird_day_notes is
  'Short explanation (e.g. injury, stopped early).';
