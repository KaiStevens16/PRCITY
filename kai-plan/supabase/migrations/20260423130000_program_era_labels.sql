-- Era labels for program blocks (run if beastmode migration already applied)

alter table public.training_programs
  add column if not exists era_label text not null default '';

update public.training_programs
set
  name = 'Animal Spring 26',
  era_label = 'Animal Spring 26'
where id = 'b0000000-0000-4000-8000-000000000001';

update public.training_programs
set era_label = 'Beastmodes Summer 26'
where id = 'b0000000-0000-4000-8000-000000000002';

update public.program_state
set
  current_block_name = 'Beastmodes Summer 26',
  timeline_note = 'Beastmodes Summer 26'
where active_program_id = 'b0000000-0000-4000-8000-000000000002'
   or active_program_id is null;

update public.sessions
set program_id = 'b0000000-0000-4000-8000-000000000001'
where program_id is null;
