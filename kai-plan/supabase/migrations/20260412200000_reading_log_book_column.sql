-- If an older DB created reading_log_entries with `notes`, rename to `book`.
-- Fresh installs use `book` from 20260412120000_reading_log_entries.sql.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reading_log_entries'
      and column_name = 'notes'
  ) then
    alter table public.reading_log_entries rename column notes to book;
  end if;
end $$;

comment on column public.reading_log_entries.book is
  'Book title for that day''s reading log; user picks from recent or types a new title.';
