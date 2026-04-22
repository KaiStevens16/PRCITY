-- Daily reading log (start/end page + minutes), solo user; mirrors body_weight_entries pattern.

create table public.reading_log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_date date not null,
  start_page integer not null default 0,
  end_page integer not null default 0,
  minutes_read smallint not null default 0,
  book text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reading_log_entries_minutes_nonneg check (minutes_read >= 0),
  constraint reading_log_entries_pages_order check (start_page >= 0 and end_page >= start_page),
  unique (user_id, logged_date)
);

create index reading_log_entries_user_date_idx
  on public.reading_log_entries (user_id, logged_date desc);

create trigger reading_log_entries_updated_at
  before update on public.reading_log_entries
  for each row execute function public.set_updated_at();

alter table public.reading_log_entries enable row level security;

comment on table public.reading_log_entries is
  'Daily reading log: pages read + time; one row per calendar day per user (solo / service_role).';
 