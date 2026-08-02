-- Rename Awaken the beast August day titles (if base migration already applied)

update public.workout_templates
set name = 'Chesticles', split = 'Chesticles'
where id = 'b1000000-0000-4000-8000-000000000011';

update public.workout_templates
set name = 'Summer O'' Arms', split = 'Summer O'' Arms'
where id = 'b1000000-0000-4000-8000-000000000012';

update public.workout_templates
set name = 'Drumstick Day 🍗', split = 'Drumstick Day 🍗'
where id = 'b1000000-0000-4000-8000-000000000013';

update public.workout_templates
set name = 'Tug Day', split = 'Tug Day'
where id = 'b1000000-0000-4000-8000-000000000014';

update public.workout_templates
set name = 'Summer O'' Arms (B)', split = 'Summer O'' Arms'
where id = 'b1000000-0000-4000-8000-000000000015';

update public.sessions
set split = 'Chesticles'
where template_id = 'b1000000-0000-4000-8000-000000000011';

update public.sessions
set split = 'Summer O'' Arms'
where template_id = 'b1000000-0000-4000-8000-000000000012';

update public.sessions
set split = 'Drumstick Day 🍗'
where template_id = 'b1000000-0000-4000-8000-000000000013';

update public.sessions
set split = 'Tug Day'
where template_id = 'b1000000-0000-4000-8000-000000000014';

update public.sessions
set split = 'Summer O'' Arms'
where template_id = 'b1000000-0000-4000-8000-000000000015';
