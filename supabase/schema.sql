-- =============================================================================
-- Drovik Fitness — Supabase schema
-- Run this once in your Supabase project → SQL editor.
-- Every table mirrors the Dexie schema in src/db/db.ts.
-- RLS ensures each user can only see/touch their own rows.
-- =============================================================================

-- ── Exercises ─────────────────────────────────────────────────────────────────

create table if not exists exercises (
  id           text primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  category     text not null,
  muscle_group text not null,
  is_custom    boolean not null default false,
  created_at   timestamptz not null,
  updated_at   timestamptz not null,
  synced_at    timestamptz,
  deleted      boolean not null default false
);

alter table exercises enable row level security;

create policy "Users own their exercises"
  on exercises for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Programs ──────────────────────────────────────────────────────────────────

create table if not exists programs (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  description text not null default '',
  is_active   boolean not null default false,
  created_at  timestamptz not null,
  updated_at  timestamptz not null,
  synced_at   timestamptz,
  deleted     boolean not null default false
);

alter table programs enable row level security;

create policy "Users own their programs"
  on programs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Workout days ──────────────────────────────────────────────────────────────

create table if not exists workout_days (
  id         text primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  program_id text not null,
  name       text not null,
  "order"    integer not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  synced_at  timestamptz,
  deleted    boolean not null default false
);

alter table workout_days enable row level security;

create policy "Users own their workout days"
  on workout_days for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Day exercises ─────────────────────────────────────────────────────────────

create table if not exists day_exercises (
  id              text primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  workout_day_id  text not null,
  exercise_id     text not null,
  "order"         integer not null default 0,
  target_sets     integer not null default 3,
  target_reps     text not null default '',
  target_weight   numeric,
  notes           text not null default '',
  created_at      timestamptz not null,
  updated_at      timestamptz not null,
  synced_at       timestamptz,
  deleted         boolean not null default false
);

alter table day_exercises enable row level security;

create policy "Users own their day exercises"
  on day_exercises for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Workout sessions ──────────────────────────────────────────────────────────

create table if not exists workout_sessions (
  id              text primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  workout_day_id  text,
  program_id      text,
  date            text not null,
  started_at      timestamptz not null,
  finished_at     timestamptz,
  notes           text not null default '',
  created_at      timestamptz not null,
  updated_at      timestamptz not null,
  synced_at       timestamptz,
  deleted         boolean not null default false
);

alter table workout_sessions enable row level security;

create policy "Users own their workout sessions"
  on workout_sessions for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Session exercises ─────────────────────────────────────────────────────────

create table if not exists session_exercises (
  id                 text primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  workout_session_id text not null,
  exercise_id        text not null,
  "order"            integer not null default 0,
  notes              text not null default '',
  created_at         timestamptz not null,
  updated_at         timestamptz not null,
  synced_at          timestamptz,
  deleted            boolean not null default false
);

alter table session_exercises enable row level security;

create policy "Users own their session exercises"
  on session_exercises for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Sets ──────────────────────────────────────────────────────────────────────

create table if not exists sets (
  id                  text primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  session_exercise_id text not null,
  set_number          integer not null,
  reps                integer not null,
  weight              numeric not null,
  rpe                 numeric,
  rir                 integer,
  notes               text not null default '',
  is_warmup           boolean not null default false,
  created_at          timestamptz not null,
  updated_at          timestamptz not null,
  synced_at           timestamptz,
  deleted             boolean not null default false
);

alter table sets enable row level security;

create policy "Users own their sets"
  on sets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Body weight logs ──────────────────────────────────────────────────────────

create table if not exists body_weight_logs (
  id         text primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  date       text not null,
  weight     numeric not null,
  notes      text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  synced_at  timestamptz,
  deleted    boolean not null default false
);

alter table body_weight_logs enable row level security;

create policy "Users own their body weight logs"
  on body_weight_logs for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Indexes for common queries ─────────────────────────────────────────────────

create index if not exists exercises_user_updated       on exercises        (user_id, updated_at);
create index if not exists programs_user_updated        on programs         (user_id, updated_at);
create index if not exists workout_days_user_updated    on workout_days     (user_id, updated_at);
create index if not exists day_exercises_user_updated   on day_exercises    (user_id, updated_at);
create index if not exists workout_sessions_user_date   on workout_sessions (user_id, date);
create index if not exists session_exercises_session    on session_exercises(user_id, workout_session_id);
create index if not exists sets_session_exercise        on sets             (user_id, session_exercise_id);
create index if not exists body_weight_logs_user_date   on body_weight_logs (user_id, date);
