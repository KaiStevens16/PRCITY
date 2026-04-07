-- Align rest-day run copy with miles (was "minutes").

update public.workout_templates
set
  preworkout_note = replace(
    preworkout_note,
    'Running 2 minutes on rest day',
    'Running 2 miles on rest day'
  ),
  updated_at = now()
where preworkout_note like '%Running 2 minutes on rest day%';
