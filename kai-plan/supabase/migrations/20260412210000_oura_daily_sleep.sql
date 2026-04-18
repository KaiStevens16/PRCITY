-- Oura nightly sleep (merged daily_sleep score + sleep period stage durations).

create table public.oura_daily_sleep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,
  sleep_score integer,
  total_sleep_seconds integer,
  deep_sleep_seconds integer,
  rem_sleep_seconds integer,
  light_sleep_seconds integer,
  awake_seconds integer,
  time_in_bed_seconds integer,
  efficiency integer,
  latency_seconds integer,
  bedtime_start timestamptz,
  bedtime_end timestamptz,
  contributors_json jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index oura_daily_sleep_user_day_idx
  on public.oura_daily_sleep (user_id, day desc);

create trigger oura_daily_sleep_updated_at
  before update on public.oura_daily_sleep
  for each row execute function public.set_updated_at();

alter table public.oura_daily_sleep enable row level security;

comment on table public.oura_daily_sleep is
  'Per-night sleep from Oura (daily_sleep score + contributors, sleep collection for durations).';
