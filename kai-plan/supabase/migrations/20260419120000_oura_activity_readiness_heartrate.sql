-- Full Oura daily_activity + daily_readiness payloads (openapi PublicDailyActivity / PublicDailyReadiness).
-- Heart rate time series (openapi PublicHeartRateRow) for Gen 3+ with heartrate OAuth scope.
-- Sleep-period HRV / HR summaries from merged sleep sync.

create table public.oura_daily_activity (
  user_id uuid not null,
  day date not null,
  oura_id text,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index oura_daily_activity_user_day_idx
  on public.oura_daily_activity (user_id, day desc);

create trigger oura_daily_activity_updated_at
  before update on public.oura_daily_activity
  for each row execute function public.set_updated_at();

alter table public.oura_daily_activity enable row level security;

comment on table public.oura_daily_activity is
  'Full daily_activity document from Oura API v2 (PublicDailyActivity), keyed by calendar day.';

create table public.oura_daily_readiness (
  user_id uuid not null,
  day date not null,
  oura_id text,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create index oura_daily_readiness_user_day_idx
  on public.oura_daily_readiness (user_id, day desc);

create trigger oura_daily_readiness_updated_at
  before update on public.oura_daily_readiness
  for each row execute function public.set_updated_at();

alter table public.oura_daily_readiness enable row level security;

comment on table public.oura_daily_readiness is
  'Full daily_readiness document from Oura API v2 (PublicDailyReadiness), keyed by calendar day.';

create table public.oura_heart_rate_samples (
  user_id uuid not null,
  sample_at timestamptz not null,
  bpm integer not null,
  source text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, sample_at, source)
);

create index oura_heart_rate_samples_user_time_idx
  on public.oura_heart_rate_samples (user_id, sample_at desc);

create trigger oura_heart_rate_samples_updated_at
  before update on public.oura_heart_rate_samples
  for each row execute function public.set_updated_at();

alter table public.oura_heart_rate_samples enable row level security;

comment on table public.oura_heart_rate_samples is
  'Discrete heart rate samples from Oura /v2/usercollection/heartrate (timestamp, bpm, source).';

alter table public.oura_daily_sleep
  add column if not exists average_hrv integer,
  add column if not exists average_heart_rate double precision,
  add column if not exists lowest_heart_rate integer,
  add column if not exists sleep_heart_rate_samples jsonb,
  add column if not exists sleep_hrv_samples jsonb;

comment on column public.oura_daily_sleep.average_hrv is
  'Average HRV during main sleep (ms), from sleep period document when available.';
comment on column public.oura_daily_sleep.sleep_heart_rate_samples is
  'PublicSample heart rate during sleep from Oura sleep collection.';
comment on column public.oura_daily_sleep.sleep_hrv_samples is
  'PublicSample HRV during sleep from Oura sleep collection.';
