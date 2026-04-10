-- DEXA / body-composition PDF uploads (solo user; server uses service_role).

create table public.dexa_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  scan_date date not null,
  body_fat_pct numeric(5, 2) not null,
  total_mass_lb numeric(8, 2),
  fat_mass_lb numeric(8, 2),
  lean_mass_lb numeric(8, 2),
  bmc_lb numeric(8, 2),
  fat_free_lb numeric(8, 2),
  storage_path text not null,
  original_filename text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dexa_scans_user_scan_date_idx
  on public.dexa_scans (user_id, scan_date desc);

create trigger dexa_scans_updated_at
  before update on public.dexa_scans
  for each row execute function public.set_updated_at();

alter table public.dexa_scans enable row level security;

comment on table public.dexa_scans is
  'DEXA / BCA uploads; PDF in storage, metrics extracted or confirmed in app.';

-- Private bucket; app serves PDFs via signed URLs (service_role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dexa-scans',
  'dexa-scans',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
