-- PR CITY — initial schema, RLS, helpers

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type session_status as enum ('in_progress', 'completed', 'skipped');

-- Global program templates (shared; RLS: any authenticated user)
create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase text not null,
  split text not null,
  estimated_duration_minutes integer not null default 0,
  preworkout_note text,
  warmup_note text,
  rotation_order integer not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  exercise_name text not null,
  exercise_group text,
  target_sets integer not null default 1,
  rep_min integer not null default 0,
  rep_max integer not null default 0,
  intensity_note text,
  rest_seconds integer not null default 90,
  order_index integer not null default 0,
  allowed_substitutions_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, order_index)
);

create index template_exercises_template_order_idx
  on public.template_exercises (template_id, order_index);

-- Per-user state and logs
create table public.program_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  current_rotation_index integer not null default 0 check (current_rotation_index >= 0 and current_rotation_index < 8),
  current_block_name text not null default 'PR CITY',
  current_objective text not null default 'PR CITY block',
  timeline_note text not null default '4–8 weeks',
  program_metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null default (timezone('utc', now()))::date,
  template_id uuid references public.workout_templates (id) on delete set null,
  phase text not null,
  split text not null,
  status session_status not null default 'in_progress',
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes integer,
  session_notes text,
  bodyweight numeric(6,2),
  calories_target integer,
  preworkout_done boolean default false,
  rotation_index_snapshot integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_user_date_idx on public.sessions (user_id, date desc);
create index sessions_user_template_date_idx on public.sessions (user_id, template_id, date desc);

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  template_exercise_id uuid references public.template_exercises (id) on delete set null,
  planned_exercise_name text not null,
  actual_exercise_name text not null,
  is_substitution boolean not null default false,
  substitution_reason text,
  exercise_notes text,
  completed boolean not null default false,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_exercises_session_idx on public.session_exercises (session_id);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_number integer not null,
  weight numeric(8,2),
  reps integer,
  rpe numeric(3,1),
  set_note text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_exercise_id, set_number)
);

create index set_logs_session_exercise_idx on public.set_logs (session_exercise_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workout_templates_updated_at before update on public.workout_templates
  for each row execute function public.set_updated_at();
create trigger template_exercises_updated_at before update on public.template_exercises
  for each row execute function public.set_updated_at();
create trigger program_state_updated_at before update on public.program_state
  for each row execute function public.set_updated_at();
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.set_updated_at();
create trigger session_exercises_updated_at before update on public.session_exercises
  for each row execute function public.set_updated_at();
create trigger set_logs_updated_at before update on public.set_logs
  for each row execute function public.set_updated_at();

-- New auth user → program_state row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.program_state (user_id, current_block_name, current_objective, timeline_note, program_metadata)
  values (
    new.id,
    'PR CITY',
    'PR CITY block',
    '4–8 weeks',
    jsonb_build_object(
      'progress_measures', jsonb_build_array(
        'Weight Maintenance',
        'Body Recomposition',
        'Nutrition Maintenance'
      )
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.program_state enable row level security;
alter table public.sessions enable row level security;
alter table public.session_exercises enable row level security;
alter table public.set_logs enable row level security;

-- Global templates: any authenticated user can read/write (personal app)
create policy "templates_select_authenticated" on public.workout_templates
  for select to authenticated using (true);
create policy "templates_insert_authenticated" on public.workout_templates
  for insert to authenticated with check (true);
create policy "templates_update_authenticated" on public.workout_templates
  for update to authenticated using (true) with check (true);
create policy "templates_delete_authenticated" on public.workout_templates
  for delete to authenticated using (true);

create policy "template_exercises_all_authenticated" on public.template_exercises
  for all to authenticated using (true) with check (true);

create policy "program_state_own" on public.program_state
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions_own" on public.sessions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "session_exercises_own" on public.session_exercises
  for all to authenticated using (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
  );

create policy "set_logs_own" on public.set_logs
  for all to authenticated using (
    exists (
      select 1 from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      where se.id = session_exercise_id and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.session_exercises se
      join public.sessions s on s.id = se.session_id
      where se.id = session_exercise_id and s.user_id = auth.uid()
    )
  );

-- Last performance: prior completed session for same template_exercise_id
create or replace function public.get_last_set_performance(
  p_template_exercise_id uuid,
  p_before_date date,
  p_exclude_session_id uuid default null
)
returns table (
  session_id uuid,
  session_date date,
  set_number integer,
  weight numeric,
  reps integer,
  rpe numeric,
  completed boolean
)
language sql stable security invoker
set search_path = public
as $$
  with last_sess as (
    select s.id, s.date
    from public.sessions s
    join public.session_exercises se on se.session_id = s.id
    where s.user_id = auth.uid()
      and s.status = 'completed'
      and se.template_exercise_id = p_template_exercise_id
      and s.date < p_before_date
      and (p_exclude_session_id is null or s.id <> p_exclude_session_id)
    order by s.date desc, s.completed_at desc nulls last
    limit 1
  )
  select ls.id as session_id, ls.date as session_date,
         sl.set_number, sl.weight, sl.reps, sl.rpe, sl.completed
  from last_sess ls
  join public.session_exercises se on se.session_id = ls.id
    and se.template_exercise_id = p_template_exercise_id
  join public.set_logs sl on sl.session_exercise_id = se.id
  order by sl.set_number;
$$;

grant execute on function public.get_last_set_performance(uuid, date, uuid) to authenticated;

comment on function public.get_last_set_performance(uuid, date, uuid) is
  'Returns set rows from the most recent completed session before p_before_date for a template exercise (caller uid).';
