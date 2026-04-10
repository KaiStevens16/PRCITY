-- Oura Ring: OAuth tokens + daily step counts (solo user_id; server uses service_role).

create table public.oura_connection (
  user_id uuid primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger oura_connection_updated_at
  before update on public.oura_connection
  for each row execute function public.set_updated_at();

alter table public.oura_connection enable row level security;

create table public.oura_daily_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day date not null,
  steps integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);

create index oura_daily_steps_user_day_idx
  on public.oura_daily_steps (user_id, day desc);

create trigger oura_daily_steps_updated_at
  before update on public.oura_daily_steps
  for each row execute function public.set_updated_at();

alter table public.oura_daily_steps enable row level security;

comment on table public.oura_connection is 'Oura OAuth tokens for the solo user.';
comment on table public.oura_daily_steps is 'Daily step totals from Oura daily_activity API.';
