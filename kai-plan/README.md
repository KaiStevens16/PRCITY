# PR CITY

Rotation-first personal training dashboard: **templates** (planned), **sessions** (what happened), **set logs** (actual loads). Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **shadcn/ui-style components**, **Supabase**, and **Plotly**.

**Auth:** none for local solo use. The app talks to Supabase only from the server using the **service role** key and a fixed **`KAI_PLAN_USER_ID`** UUID.

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- `npm`, `pnpm`, or `yarn`

## Supabase setup

1. Create a project at [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. In **SQL Editor**, run migrations **in order**:
   - [`supabase/migrations/20260406000000_initial_schema.sql`](supabase/migrations/20260406000000_initial_schema.sql)
   - [`supabase/migrations/20260407120000_solo_no_auth.sql`](supabase/migrations/20260407120000_solo_no_auth.sql) — removes auth-user FKs, updates `get_last_set_performance` for solo mode.
3. Run the seed (once, on a fresh database):
   - [`supabase/seed.sql`](supabase/seed.sql)

Pick a **UUID** for yourself (e.g. generate one in Terminal: `uuidgen` on Mac, or use `a1000000-0000-4000-8000-000000000001`). Put the **same** value in `.env.local` as `KAI_PLAN_USER_ID`. The app will create your `program_state` row on first load if it’s missing.

**Security:** The **service role** key bypasses RLS and must **never** be in browser code, `NEXT_PUBLIC_*` vars, or a public repo. Solo use on your laptop only is fine; do not deploy this pattern to the public internet without adding real auth.

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role secret (server-only) |
| `KAI_PLAN_USER_ID` | Stable UUID for your `program_state` / `sessions` rows |

## Local development

```bash
cd kai-plan
npm install
cp .env.example .env.local
# edit .env.local: URL, service role key, KAI_PLAN_USER_ID
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — no sign-in screen.

### Generate TypeScript types from Supabase (optional)

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/supabase.generated.ts
```

## Project structure (high level)

```
kai-plan/
├── data/                       # weight_state-2.csv — Weight tab reads/writes here by default
├── src/
│   ├── app/
│   │   ├── (main)/               # Dashboard, Today, History, Lifts, Program
│   │   ├── actions/              # Server actions (training, program, weight CSV)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── charts/               # Plotly wrapper + theme
│   │   ├── dashboard/
│   │   ├── history/
│   │   ├── layout/               # Sidebar, app shell
│   │   ├── program/
│   │   ├── training/
│   │   └── ui/
│   ├── lib/                      # Supabase server client, solo user id, rotation, dates, e1RM
│   └── types/
└── supabase/
    ├── migrations/
    └── seed.sql
```

## Data model (planned vs actual)

- **`workout_templates` / `template_exercises`** — global program (editable on **Program**; not overwritten by logging).
- **`sessions`** — a concrete day; links to a template snapshot via `template_id` and `rotation_index_snapshot`.
- **`session_exercises`** — `planned_exercise_name` is copied at session start; `actual_exercise_name` and `is_substitution` capture swaps.
- **`set_logs`** — per-set weight, reps, RPE, notes.
- **`program_state`** — `current_rotation_index` (0–7) maps to `rotation_order` 1–8 on templates.

**Last time** uses the RPC `get_last_set_performance(p_user_id, p_template_exercise_id, p_before_date, p_exclude_session_id)` (service role only).

## Conventions

- **Rotation index** is **0–7** in code; **template `rotation_order`** is **1–8** (`rotation_order = index + 1`).
- **Run / cardio rows** in templates use `target_sets = 1` with timing described in `intensity_note` (rep fields are placeholders).

## V2 ideas

- Real auth (magic link or OAuth) if you ever expose the app publicly; normalized exercise library; drag-and-drop template builder; deload weeks; RPE autoregulation.
- PWA / mobile-first logging; rest timer; bodyweight import from your weight tab.
- CSV export.

## License

Private / personal use.
