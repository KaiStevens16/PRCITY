-- Daily Inbody proxy log: skeletal muscle mass + body-fat percentage.

create table public.inbody_body_fat_proxy_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_date date not null,
  skeletal_muscle_mass_lb numeric(8, 2) not null,
  body_fat_pct numeric(6, 3) not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

create index inbody_body_fat_proxy_entries_user_date_idx
  on public.inbody_body_fat_proxy_entries (user_id, logged_date desc);

create trigger inbody_body_fat_proxy_entries_updated_at
  before update on public.inbody_body_fat_proxy_entries
  for each row execute function public.set_updated_at();

alter table public.inbody_body_fat_proxy_entries enable row level security;

create or replace function public.replace_inbody_body_fat_proxy_entries(
  p_user_id uuid,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.inbody_body_fat_proxy_entries where user_id = p_user_id;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    return;
  end if;
  insert into public.inbody_body_fat_proxy_entries (
    user_id,
    logged_date,
    skeletal_muscle_mass_lb,
    body_fat_pct,
    notes
  )
  select
    p_user_id,
    (j->>'date')::date,
    (j->>'skeletalMuscleMassLb')::numeric,
    (j->>'bodyFatPct')::numeric,
    coalesce(j->>'notes', '')
  from jsonb_array_elements(p_rows) as t(j);
end;
$$;

revoke all on function public.replace_inbody_body_fat_proxy_entries(uuid, jsonb) from public;
grant execute on function public.replace_inbody_body_fat_proxy_entries(uuid, jsonb) to service_role;

comment on table public.inbody_body_fat_proxy_entries is
  'Daily Inbody-derived body composition rows for proxy tracking (skeletal muscle mass + body-fat %).';
comment on function public.replace_inbody_body_fat_proxy_entries(uuid, jsonb) is
  'Atomically replaces all Inbody proxy rows for p_user_id (solo / service_role).';
