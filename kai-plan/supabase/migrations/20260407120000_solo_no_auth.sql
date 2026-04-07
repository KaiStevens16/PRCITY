-- Solo mode: no Supabase Auth required; app uses service role + KAI_PLAN_USER_ID

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

alter table public.program_state
  drop constraint if exists program_state_user_id_fkey;

alter table public.sessions
  drop constraint if exists sessions_user_id_fkey;

drop function if exists public.get_last_set_performance(uuid, date, uuid);

create or replace function public.get_last_set_performance(
  p_user_id uuid,
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
language sql
stable
security definer
set search_path = public
as $$
  with last_sess as (
    select s.id, s.date
    from public.sessions s
    join public.session_exercises se on se.session_id = s.id
    where s.user_id = p_user_id
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

revoke all on function public.get_last_set_performance(uuid, uuid, date, uuid) from public;
grant execute on function public.get_last_set_performance(uuid, uuid, date, uuid) to service_role;

comment on function public.get_last_set_performance(uuid, uuid, date, uuid) is
  'Last logged sets for a template exercise slot before a date (solo user id passed explicitly).';
