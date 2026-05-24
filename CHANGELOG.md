# Changelog

All notable changes are documented here, newest first.

---

## Exercise Library Expansion

### Added
- **618 pre-seeded exercises** — up from 395. Added ~223 new exercises sourced from the open-source [free-exercise-db](https://github.com/yuhonas/free-exercise-db) project, covering new barbell Olympic lifting variations (Split Jerk, Snatch from Blocks, Hang Snatch, etc.), dumbbell shoulder/arm movements, additional Smith Machine and leverage machine exercises, cable variations, ~50 new bodyweight movements (Dead Bug, Russian Twist, Flutter Kicks, Incline Push-Up variants, etc.), new kettlebell flows (Seesaw Press, Pirate Ships, TGU variants), and band additions
- **Dexie DB version 4** — upgrade runs automatically on next open, seeding the new exercises on existing devices without disturbing any logged workout data

---

## UX Improvements

### Added
- **Error toasts** — `ToastContext` provides a global `showToast(message, type?)` hook; DB write failures in `WorkoutLogger` now surface a red toast instead of silently failing; `finishWorkout` also resets the disabled state if it errors
- **Offline banner** — a thin banner appears at the top of every screen when the device loses connectivity; disappears automatically when back online; uses in-flow layout so it naturally pushes content down
- **Set notes** — a "Note (optional)" text field in the set-entry form; notes are saved to the DB and displayed under each set row in both the active logger and the session history view
- **Swipe-to-delete sets** — swipe left on any set row in the active logger to reveal a red delete zone; release past 70 px to confirm delete; taps the X button still works as before for desktop/accessibility
- **Pull-to-refresh** — pull down from the top of any screen to trigger a manual sync; a sky-500 spinner appears as you pull, spins while syncing, then disappears; implemented with a non-passive `touchmove` listener on the `<main>` element so it doesn't conflict with page scroll

---

## Bug Fixes & Code Quality

### Fixed
- `WorkoutLogger`: header title always rendered blank for program-based workouts — now fetches and displays the workout day name
- `useSyncStatus`: `runSync` was missing from the `useEffect` dependency array, suppressed with `eslint-disable`; removed the suppress comment and added the dependency
- `ExerciseForm`: unused `e` variable in catch clause removed
- `Exercises`: `handleDelete` used `new Date().toISOString()` directly instead of the `now()` helper used everywhere else
- `Settings`: `importData` used `any` for parsed JSON; changed to `Record<string, unknown>` and `err instanceof Error` error handling
- `SessionDetail`: `setsMap` typed as `Map<string, typeof sets>` (opaque inference); now explicitly `Map<string, LoggedSet[]>`

### Refactored
- Extracted `formatDuration` from both `History.tsx` and `SessionDetail.tsx` into a shared `src/lib/utils.ts`

---

## Phase 7 — JSON Export / Import + Settings

### Added
- Settings screen (`/settings`): Account section (email + sign out), Data section (export/import), About
- Export: one-tap backup of all 8 tables to a timestamped `drovik-backup-YYYY-MM-DD.json` file
- Import: reads a JSON backup and merges with `bulkPut` — safe to run on a device that already has data
- Sign out moved from the nav bar into Settings
- Settings tab added to the bottom nav; sync status dot displayed on this tab

## Phase 6 — Progress Charts + Personal Records

### Added
- Progress screen with three tabs: Lifts, Body Weight, PRs
- Lifts tab: search any exercise, see estimated 1RM (Epley formula) charted over time
- Body Weight tab: log today's weight, view trend chart, see recent entries
- PRs tab: best estimated 1RM and heaviest set per exercise across all sessions
- Recharts installed for charts; lazy-loaded via React.lazy so it only downloads when Progress is opened
- Main bundle reduced from 941 KB to 437 KB with Rollup `manualChunks`

## Phase 5 — Workout Logging + History

### Added
- Log screen: start a workout from active program days (pre-populated with template exercises) or ad-hoc; auto-detects and resumes any unfinished session
- WorkoutLogger: active session view with live elapsed timer, exercise cards, set logging, and Finish button
- SetEntryForm: inline reps × weight entry per exercise; warmup toggle (W); optional RPE (1–10) and RIR (0–5)
- Targets from the program day template shown as a guide while logging
- History screen: month calendar with dots on workout days, session list for the viewed month
- SessionDetail: read-only session recap with sets table, duration, and total working volume
- Routes added: `/history/:sessionId`

## Phase 4 — Program Builder

### Added
- Programs list (`/programs`): create, edit, delete programs; mark one as active; shows day count per program
- Program detail (`/programs/:id`): add, rename, reorder (up/down), and delete workout days
- Day detail (`/programs/:id/days/:dayId`): add exercises from the library, set target sets / reps / weight / notes; reorder and delete exercises
- ExercisePicker: full-screen searchable exercise selector with category filter; already-added exercises shown dimmed
- DayExerciseForm: slide-up form for setting or editing exercise targets (sets, reps, weight, notes)
- ProgramForm / DayForm: slide-up modals for creating and editing programs and days
- New routes: `/programs/:programId` and `/programs/:programId/days/:dayId`
- All changes sync to Supabase automatically via the existing sync layer

---

## Phase 3 — Supabase Auth + Sync Layer

### Added
- Supabase email/password login with persistent session (stays logged in across PWA restarts)
- Login screen — shown automatically when no session exists
- Route guard in `App.tsx` — app is inaccessible without a valid session
- `AuthContext` — provides session, signIn, and signOut to the whole app
- Sign Out button in the bottom nav bar
- `sync.ts` — bidirectional push/pull sync engine:
  - Push: uploads all unsynced local rows (where `syncedAt` is null) to Supabase
  - Pull: downloads any Supabase rows newer than the latest local `syncedAt`
  - Last-write-wins conflict resolution via `updatedAt` timestamp
  - Covers all 8 tables (exercises, programs, workoutDays, dayExercises, workoutSessions, sessionExercises, sets, bodyWeightLogs)
- `useSyncStatus` hook — triggers sync on login and whenever the device comes back online
- Sync status dot in the nav bar (blue pulse = syncing, red = error, nothing = idle)
- `supabase/schema.sql` — full Supabase schema with RLS policies (run once in SQL editor)
- `.env.example` — documents required environment variables
- Dexie v2 migration — seeds missing exercises on existing devices that were installed before new seeds were added
- GitHub Actions updated to inject `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets at build time
- CI upgraded to Node.js 24

---

## Phase 2 — Local Data Layer (Dexie) + Exercise Library

### Added
- Dexie 4 database with 8 tables: exercises, programs, workoutDays, dayExercises,
  workoutSessions, sessionExercises, sets, bodyWeightLogs
- Full TypeScript types for every table (see `src/db/db.ts`)
- 140 pre-seeded exercises across 6 categories: Barbell, Dumbbell, Machine,
  Cable, Bodyweight, Cardio — with muscle group tagging
- Exercise Library screen (`/exercises`) with:
  - Category filter pills (All / Barbell / Dumbbell / Machine / Cable / Bodyweight / Cardio)
  - Live search by name
  - Colour-coded category badges
  - Add custom exercise (slide-up form)
  - Edit any exercise (seeded or custom)
  - Delete with inline confirmation (soft-delete, sync-safe)
- Home screen updated with quick links to Exercise Library and Programs

---

## Phase 1 — PWA Scaffold + GitHub Pages Deploy

### Added
- Project scaffolded: React 18 + Vite 5 + TypeScript
- Tailwind CSS configured with system dark/light mode and sky-500 (electric blue) accent colour
- PWA manifest via `vite-plugin-pwa` — app name "Drovik Fitness", dumbbell icon, standalone display
- Service worker with offline caching (Workbox) — app will work at the gym with no signal
- App shell with fixed bottom navigation bar (Home, Programs, Log, History, Progress)
- Placeholder screens for all five main sections
- GitHub Actions workflow: every push to `main` builds and auto-deploys to GitHub Pages

### Manual steps required to go live
See the "Going Live" section below.

---

## Going Live (one-time setup)

### 1 — Enable GitHub Pages
1. Open your repo on GitHub: https://github.com/Wernde/drovik-fitness
2. Go to **Settings → Pages**
3. Under **Source**, select **GitHub Actions**
4. Click **Save**

That's it. The next push to `main` will trigger the workflow and deploy the app.
Your app URL will be: **https://wernde.github.io/drovik-fitness/**

### 2 — iOS home screen icon note
The app currently uses an SVG icon. Android (Chrome) handles SVG icons natively.
iOS Safari requires a PNG for the home screen icon. If the icon looks blank after
installing on an iPhone, generate PNG versions:
- Visit https://realfavicongenerator.net, upload `public/icon.svg`, download the package,
  and place `apple-touch-icon.png` (180×180) in the `public/` folder.
- Add `<link rel="apple-touch-icon" href="/drovik-fitness/apple-touch-icon.png" />` to `index.html`.
