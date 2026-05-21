# Changelog

All notable changes are documented here, newest first.

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
