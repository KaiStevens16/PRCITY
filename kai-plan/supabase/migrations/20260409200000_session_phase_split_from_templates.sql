-- History/metadata correctness: Apr 4–6 2026 are hypertrophy Chest / Back / Legs (slots 1–3).
-- Re-link those dates to the H templates if anything drifted, then snap phase/split to
-- workout_templates for every session that has a template_id (canonical protocol labels).

update public.sessions s
set template_id = v.template_id
from (
  values
    ('2026-04-04'::date, 'a0000000-0000-4000-8000-000000000001'::uuid),
    ('2026-04-05'::date, 'a0000000-0000-4000-8000-000000000002'::uuid),
    ('2026-04-06'::date, 'a0000000-0000-4000-8000-000000000003'::uuid)
) as v(session_date, template_id)
where s.date = v.session_date;

update public.sessions s
set
  phase = wt.phase,
  split = wt.split
from public.workout_templates wt
where s.template_id = wt.id
  and (
    s.phase is distinct from wt.phase
    or s.split is distinct from wt.split
  );
