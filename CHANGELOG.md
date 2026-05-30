# Changelog

All notable changes are documented here, newest first.

---

## In-App Video Player + Exercise Thumbnails

### Added
- **In-app YouTube player** — tapping a video thumbnail now opens a slide-up modal with an embedded YouTube iframe instead of leaving the app; autoplay on open, dismiss by tapping the backdrop or the ✕ button
- **Exercise thumbnails in WorkoutLogger** — every exercise card shows a 16:9 YouTube thumbnail with a red play button when a video is linked; replaces the old external Watch chip
- **Exercise thumbnails in program/day view** — exercise cards in the day plan show a full-width thumbnail banner above the exercise name row; tapping the card still opens the detail sheet which also has an in-app player
- **Shorts URL support** — `youtube.ts` now extracts video IDs from `/shorts/VIDEO_ID` URLs in addition to standard watch URLs

### Changed
- **Video sources updated** — Wesley Vissers (@VintageGenetics) now used for chest, back, shoulder, arm, and leg exercises:
  - Chest/cable fly → `MQ1-gY93xYw` (Chest Workout for FULLNESS — Olympia Prep)
  - Back rows/machine → `m3fVc1uwEAg` (Full Back Training — 3 Weeks Out)
  - Shoulders/delt → `J3Ax8PpFzkM` (Boulder Shoulder — Olympia Prep)
  - Biceps/triceps/arms → `r5TJ3UV4sPE` (Arm Day — Full Explanations)
  - Leg machine work → `wVYnR1FK2lE` (Leg Day)
  - Jeff Nippard retained for barbell compound technique (squat, deadlift, bench, OHP, RDL)

---

## WorkoutLogger Redesign

### Changed
- **Card layout** — exercise blocks are now white rounded cards with shadow instead of flat separator rows; spacing and visual hierarchy improved throughout
- **Header** — workout day name shown above the live timer; timer has an animated yellow pulse dot indicating the session is running; ⋯ menu replaces the unused chat/dots icons
- **Auto-fill moved to options sheet** — tap ⋯ to access auto-fill toggle and discard; cleans up the top bar
- **Tap-to-fill previous** — the "Previous" column now shows a tappable pill (e.g. `10 × 80 →`) that copies those values directly into the row's reps and weight inputs in one tap — the fastest way to log when you used the same weights as last time
- **Per-exercise notes** — a Notes chip on every exercise card opens a textarea (persisted to `sessionExercise.notes` on Finish); chip turns yellow when a note exists
- **Per-set notes** — a small `+ note` toggle under each set row opens an inline input (saved to `set.notes`); note preview shown collapsed
- **YouTube / Watch chip** — exercises with a `videoUrl` show a red Watch chip that opens the video in-browser
- **Guide chip** — exercises with `instructions` show a blue Guide chip that expands the instructions inline; chip toggles to "Hide Guide" when open
- **Rest timer always fires** — marking any set done now auto-starts a rest timer (uses the exercise's configured `restSecs`, falls back to 90 s if none set)
- **Amber done state** — completed set rows highlight amber to match the yellow accent palette (replaces green)
- **Done checkmark** uses accent yellow instead of green

---

## UI Redesign — Light Theme

### Changed
- **Full visual redesign** from dark theme to a clean light theme matching the Drovik prototype
- **Colour palette**: background `#F4F6F9`, white cards, yellow `#FFCA10` accent (replacing lime green), dark text `#241F20`, muted `#7A7980`
- **Typography**: Plus Jakarta Sans via Google Fonts across the entire app
- **Navigation**: 5-tab bottom nav — Dash | Plans | + FAB | Goals | More — replacing the previous 4-tab layout
- **Home screen**: top bar with avatar greeting, 7-day date strip, hero workout card, weekly stats
- **New pages**: Goals (water / body weight / calories tracking hub) and More (secondary screen links)
- All pages and components updated to light theme tokens (`bg-app-card`, `bg-app-bg`, `text-app-text`, `text-app-muted`, `bg-accent`, `text-accent-dark`, etc.)
- Charts (Progress page): tooltip and axes updated to light palette; line stroke `#B8900A`, dot fill `#FFCA10`
- All modal slide-up panels use white cards; form inputs use `bg-app-bg` with `border-app-border`
- Delete/confirm states use `bg-red-50 border-red-200 text-red-700` (replaces dark red)
- Rest timer done-state uses accent yellow; exercise picker uses light full-screen layout
- Habit tracker card background and form updated to light tokens

---

## Home screen — next workout & weekly stats

### Added
- **Next recommended day** — the lime "Start Workout" card on the Home screen now shows the next program day in sequence by name (e.g. "Push A") and starts it directly on tap, skipping the Log screen picker. After finishing a session the card automatically advances to the following day; it cycles back to day 1 after the last day. Defaults to day 1 if no sessions have been logged for the active program yet.
- **Resume Workout card** — if there is already an unfinished session in progress, the card switches to "Resume Workout" and links straight to the active logger.
- **Weekly stats strip** — two tiles between the quick-access pills and the Start card show the number of finished sessions and total working volume (weight × reps, warmup sets excluded) for the current Mon–Sun week. Volume auto-scales from kg to tonnes.
- No active program — card falls back to the previous generic "Start Workout" link to the Log screen.

---

## Phase 8 — Training Tools & Progress Depth

### Added
- **Post-workout summary modal** — tapping Finish shows a summary before locking the session: session duration, working set count, total volume (auto-scales to tonnes), a bar chart of sets per muscle group (top 5), and highlighted PRs broken during the session (new estimated 1RM per exercise)
- **Rest timer** — appears automatically after every logged set as a fixed panel above the nav bar; uses the exercise's configured rest target or 90 s by default; includes −30 s / +30 s adjust buttons, a draining progress bar, a Web Audio API beep + haptic vibration at zero, and a Skip button; auto-dismisses 2.5 s after completion
- **Plate calculator** — new Calculator page (linked from Home) shows which plates to load on each side of the bar for any target weight; supports 20/15/10 kg barbell presets or custom; coloured plate chips (red=25 kg, blue=20 kg, yellow=15 kg, green=10 kg, etc.) plus a mini bar graphic; warns when exact weight is not achievable with standard plates
- **Warm-up ramp** — on the same Calculator page; enter a working weight and get 40/60/80% warm-up sets rounded to nearest 2.5 kg, with the plate breakdown for each set
- **Body measurements** — new Measurements sub-tab inside Progress → Body; log chest, waist, hips, L/R arm (always visible), plus neck, shoulders, L/R thigh, L/R calf (expandable); one entry per day upsert; recent entries shown as a grid below the form; DB version 10
- **Nutrition logging** — Progress → Nutrition tab; daily entry for calories, protein, carbs, fat, and water (all optional); calorie line chart; recent entries with coloured macro badges; DB version 8
- **Habit tracking** — Progress → Habits tab; add daily habits with 6 colour presets; tap to toggle today's completion; shows current streak (🔥), 7-day progress bar, and best streak; slide-up form with confirm-delete; DB version 9
- **Year training heatmap** — History page now opens with a 52-week GitHub-style contribution grid; lime squares for workout days, session count and longest consecutive-day streak shown in the header
- **Program phases** — program builder supports optional training phases (e.g. Hypertrophy, Strength, Deload); each phase has a name and optional week count; days can be assigned to phases; deleting a phase moves its days to unassigned rather than deleting them; DB version 7
- **Machine setting on logged sets** — `machineSetting` text field on each set entry (e.g. "seat 3, pin 8"); shown in the set row and session history; DB upgrade backfills existing rows
- **Rest seconds on day exercises** — `restSecs` field in the program's exercise config; shown in the workout logger header and used as the rest timer's default for that exercise
- **Exercise instructions** — `instructions` field on exercises; shown as a hint in the workout logger; editable in the exercise form
- **YouTube demo links** — `videoUrl` on exercises; shown as a tappable thumbnail in the workout logger that opens the video in-browser

### Fixed
- Deployment: deleted two conflicting GitHub Actions workflows (`static.yml`, `jekyll-gh-pages.yml`) that were serving raw source files instead of the compiled build — the app was never deploying correctly to GitHub Pages before this fix
- Progress → Nutrition tab was wired into the tab list but its render line was missing; fixed alongside the Habits tab addition

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
