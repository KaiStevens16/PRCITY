-- Daily body-weight log (replaces local CSV for serverless / Vercel).

create table public.body_weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_date date not null,
  weight numeric(8, 2) not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create index body_weight_entries_user_date_idx
  on public.body_weight_entries (user_id, logged_date desc);

create trigger body_weight_entries_updated_at
  before update on public.body_weight_entries
  for each row execute function public.set_updated_at();

alter table public.body_weight_entries enable row level security;

-- Solo app uses service_role from the server; RLS stays enabled with no policies.

create or replace function public.replace_body_weight_entries(
  p_user_id uuid,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.body_weight_entries where user_id = p_user_id;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return;
  end if;
  insert into public.body_weight_entries (user_id, logged_date, weight, notes)
  select
    p_user_id,
    (j->>'date')::date,
    (j->>'weight')::numeric,
    coalesce(j->>'notes', '')
  from jsonb_array_elements(p_rows) as t(j);
end;
$$;

revoke all on function public.replace_body_weight_entries(uuid, jsonb) from public;
grant execute on function public.replace_body_weight_entries(uuid, jsonb) to service_role;

comment on table public.body_weight_entries is
  'Daily scale weight for the solo user; full replace via replace_body_weight_entries.';
comment on function public.replace_body_weight_entries(uuid, jsonb) is
  'Atomically replaces all body-weight rows for p_user_id (solo / service_role).';
