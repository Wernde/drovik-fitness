You are the lead engineer for Drovik Fitness — a personal fitness
tracker built for one user only: me. Save this entire brief verbatim
as AGENTS.md in the repo root and treat it as the source of truth
for every future session.

VISION
A clean, fast workout tracker I use every gym session. Trainerize-style
functionality stripped to what one person actually needs: build my own
programs, log every set, see progress over time. No other users, no
app store.

PLATFORM
Progressive Web App, installable to a phone home screen via "Add to
Home Screen". Hosted free on GitHub Pages with GitHub Actions auto-
deploy on push to main. Must work fully offline at the gym.

STACK
- React + Vite (TypeScript)
- Tailwind CSS
- Dexie.js for IndexedDB (local storage)
- Supabase for cloud database and auth
- Recharts for progress graphs
- vite-plugin-pwa for installability and offline support

DATA ARCHITECTURE
Local-first. Every write goes to IndexedDB immediately so the app is
instant and works offline. A background sync layer pushes changes to
Supabase when online and pulls remote changes. Supabase is the source
of truth across devices.

AUTH
Single email/password account (mine). Enable Supabase Row Level
Security so only my logged-in account can read or write my data.
The Supabase anon key in the client bundle is expected — RLS + auth
is the real protection.

UNITS & LOCALE
Metric. Weight in kilograms. Australian English.

MVP FEATURE SET (build only these)
- Auth: email/password login, persistent session
- Exercise library: pre-seeded with common lifts, I can add/edit/delete
- Program builder: I create multi-week programs with workout templates
- Workout logging: sets, reps, weight (kg), RPE, per-set notes
- Workout history with a calendar view
- Progress tracking: line charts per lift, body weight, personal records
- JSON export/import as a backup safety net

LATER (do NOT build yet)
Progress photos, rest timer, plate calculator, exercise demo videos,
warm-up calculator, body measurements, deload suggestions, AI program
generation.

CONSTRAINTS
- I'm a non-professional developer. Favour clear, maintainable,
  commented code. Explain decisions in plain English.
- Keep dependencies minimal.
- I handle: GitHub account, Supabase account, real-device testing,
  providing API keys.
- You handle: everything else, including step-by-step instructions
  whenever I need to do something outside the codebase.

WORKING AGREEMENT
- Read AGENTS.md and CHANGELOG.md at the start of every session.
- For every task: propose a plan and a definition of "done", wait
  for my approval, then implement, test, and update CHANGELOG.md.
- Ask me rather than guess when a product decision is unclear.
- Flag manual steps (account creation, env vars, etc.) with clear
  instructions.

FIRST TASK — DO NOT WRITE APP CODE YET
1. Ask me any clarifying questions you need (visual theme, exercises
   to pre-seed, anything else).
2. Once I've answered, produce:
   a. A short product spec covering screens and user flows.
   b. The data model for both Dexie and Supabase.
   c. The architecture for the local-first sync layer.
   d. A phased roadmap with these phases:
      Phase 1: PWA scaffold + GitHub Pages auto-deploy (I install it
               on my phone before moving on)
      Phase 2: Local data layer (Dexie) + exercise library
      Phase 3: Supabase setup, auth, and sync layer
      Phase 4: Program builder
      Phase 5: Workout logging and history
      Phase 6: Progress charts and personal records
      Phase 7: JSON export/import
3. Wait for my approval before any coding.
