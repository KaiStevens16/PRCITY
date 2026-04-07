-- Import historical weight rows (from data/weight_state-2.csv).
-- Run in Supabase SQL Editor after migration 20260410120000_body_weight_entries.sql.
--
-- user_id must match KAI_PLAN_USER_ID (Vercel / .env.local).

WITH params AS (
  SELECT '0442a754-1f47-48f1-80f2-f94359d76586'::uuid AS user_id
),
rows AS (
  SELECT * FROM (VALUES
    ('2026-01-24'::date, 192.9::numeric, ''::text),
    ('2026-01-25', 193.6, ''),
    ('2026-01-26', 194.0, ''),
    ('2026-01-27', 193.1, ''),
    ('2026-01-28', 191.8, ''),
    ('2026-01-29', 192.0, ''),
    ('2026-01-30', 191.1, ''),
    ('2026-01-31', 193.6, 'EOD'),
    ('2026-02-01', 190.7, 'BOD'),
    ('2026-02-02', 193.6, 'EOD'),
    ('2026-02-03', 188.9, ''),
    ('2026-02-04', 189.3, ''),
    ('2026-02-05', 188.7, ''),
    ('2026-02-06', 191.1, 'EOD'),
    ('2026-02-07', 191.8, 'EOD'),
    ('2026-02-08', 189.4, 'BOD'),
    ('2026-02-09', 189.8, ''),
    ('2026-02-10', 189.9, ''),
    ('2026-02-11', 187.2, 'BOD'),
    ('2026-02-12', 190.5, 'EOD'),
    ('2026-02-13', 188.5, 'BLUE MODEL - YELLOW FROM NOW ON.'),
    ('2026-02-14', 188.9, 'BOD'),
    ('2026-02-15', 190.0, 'EOD'),
    ('2026-02-16', 188.9, ''),
    ('2026-02-17', 187.2, 'BOD'),
    ('2026-02-18', 188.3, 'BOD'),
    ('2026-02-19', 188.9, ''),
    ('2026-02-20', 187.6, ''),
    ('2026-02-21', 185.2, 'BOD'),
    ('2026-02-22', 188.1, 'BOD - ate weird yesterday, also ramen so lot of salt'),
    ('2026-02-23', 187.0, ''),
    ('2026-02-24', 188.3, 'EOD'),
    ('2026-02-25', 185.6, 'BOD - same 2200 cals but much higher ratio of carbs day prior'),
    ('2026-02-26', 187.0, 'BOD - Went out for dinner day before and ate A LOT'),
    ('2026-03-04', 187.2, 'Just flew, had a lot of carbs in NY and didn''t crazy track'),
    ('2026-03-05', 187.8, ''),
    ('2026-03-06', 186.1, 'BOD'),
    ('2026-03-07', 184.8, ''),
    ('2026-03-08', 184.8, 'BOD'),
    ('2026-03-09', 187.2, 'BOD - went like 3k cals, on purpose. Was feeling depleted'),
    ('2026-03-10', 183.4, 'BOD'),
    ('2026-03-11', 184.1, 'BOD'),
    ('2026-03-12', 183.9, 'BOD'),
    ('2026-03-13', 184.1, ''),
    ('2026-03-23', 183.2, ''),
    ('2026-03-24', 183.4, 'BOD'),
    ('2026-03-25', 181.0, 'BOD'),
    ('2026-03-26', 180.6, ''),
    ('2026-03-27', 180.1, ''),
    ('2026-03-29', 183.4, ''),
    ('2026-03-30', 179.9, ''),
    ('2026-03-31', 182.8, ''),
    ('2026-04-04', 180.3, 'BOD'),
    ('2026-04-05', 179.7, 'BOD'),
    ('2026-04-06', 179.2, 'BOD')
  ) AS t(logged_date, weight, notes)
)
INSERT INTO public.body_weight_entries (user_id, logged_date, weight, notes)
SELECT p.user_id, r.logged_date, r.weight, r.notes
FROM params p
CROSS JOIN rows r
ON CONFLICT (user_id, logged_date) DO UPDATE SET
  weight = EXCLUDED.weight,
  notes = EXCLUDED.notes,
  updated_at = now();
