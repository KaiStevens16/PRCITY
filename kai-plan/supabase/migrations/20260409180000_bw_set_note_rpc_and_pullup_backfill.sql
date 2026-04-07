-- Last-time RPC returns set_note for bodyweight (bw) display; backfill pull-up sets on 2026-04-05.

drop function if exists public.get_last_set_performance(uuid, uuid, date, uuid);

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
  set_note text,
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
         sl.set_number, sl.weight, sl.reps, sl.rpe, sl.set_note, sl.completed
  from last_sess ls
  join public.session_exercises se on se.session_id = ls.id
    and se.template_exercise_id = p_template_exercise_id
  join public.set_logs sl on sl.session_exercise_id = se.id
  order by sl.set_number;
$$;

revoke all on function public.get_last_set_performance(uuid, uuid, date, uuid) from public;
grant execute on function public.get_last_set_performance(uuid, uuid, date, uuid) to service_role;

comment on function public.get_last_set_performance(uuid, uuid, date, uuid) is
  'Last logged sets for a template exercise slot before a date (solo user id passed explicitly). Includes set_note for bodyweight sets.';

update public.set_logs sl
set weight = null,
    set_note = 'bw'
from public.session_exercises se
join public.sessions s on s.id = se.session_id
where sl.session_exercise_id = se.id
  and s.date = date '2026-04-05'
  and (
    lower(coalesce(se.actual_exercise_name, '')) like '%pull%'
    or lower(coalesce(se.planned_exercise_name, '')) like '%pull%'
  );
