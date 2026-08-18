# Drovik Fitness Product Blueprint

## Product promise

Drovik Fitness is a private, single-user fitness PWA for building programmes, logging gym sessions quickly, and reviewing progress. It should feel immediate, preserve data locally, work without gym connectivity, and synchronise across the owner's devices when online.

This blueprint describes product intent and current capability at a useful level. `CHANGELOG.md` contains implementation history; current code remains the final authority for detailed behaviour.

## Product principles

- One owner, not a multi-user commercial platform
- Local-first writes and offline gym use
- Fast workout entry with minimal interruption
- Metric units and Australian English
- Clear, maintainable implementation with minimal dependencies
- Privacy enforced by authentication and Supabase Row Level Security
- Real phone, tablet, desktop, and installed-PWA behaviour matter

## Current product areas

### Account and application shell

- Email/password sign-in with persistent session
- Responsive navigation and installable PWA shell
- Offline status and background synchronisation status
- Dark and light appearance modes

### Home

- Date-oriented dashboard and next-workout entry point
- Weekly training summary and status cards
- Quick access to nutrition, history, body statistics, progress, calculator, water, and other common actions
- Apple Watch-derived summary when configured through Apple Shortcuts and Supabase

### Exercise library

- Large pre-seeded catalogue plus custom exercises
- Search, category filtering, editing, and soft deletion
- Exercise instructions, equipment/category metadata, and optional video links

### Program

- Create, edit, delete, and activate training programmes
- Multi-day programme structure and optional phases
- Exercise targets including sets, repetitions, weight, notes, and rest duration
- Reordering and exercise selection

### Workout logging

- Start a programmed or ad-hoc workout
- Recover or discard unfinished sessions
- Log sets, repetitions, kilograms, RPE/RIR, machine settings, and notes
- Previous-set assistance, rest timer, exercise guidance, and workout summary
- Local autosave designed to protect an active session

### History

- Calendar and training heatmap views
- Session summaries and detailed set history
- Duration and volume reporting

### Progress and body statistics

- Lift trends and personal records
- Body weight and measurement history
- Nutrition and habit tracking
- Progress photos stored locally
- Charts designed for useful trends rather than clinical interpretation

### Supporting tools

- Plate calculator and warm-up ramp
- JSON export/import backup
- Settings, account, appearance, data, and integration guidance

## Core journeys

### Start and complete a programme workout

1. Open the installed app, including while offline.
2. See the next programme day or resume an unfinished session.
3. Start the workout and receive the programmed exercises locally.
4. Log each set with immediate local persistence.
5. Use previous values, notes, rest guidance, or exercise guidance as needed.
6. Finish and review the workout summary.
7. See the completed session in history and progress.
8. Synchronise in the background when online.

### Build a programme

1. Create a programme and optional phases.
2. Add and order workout days.
3. Select exercises and define targets.
4. Activate the programme.
5. Start its next day from Home or Log.

### Recover from interruption

1. Reopen Drovik after an unfinished workout or app termination.
2. Distinguish a current workout from a stale abandoned session.
3. Resume safely or explicitly discard it.
4. Preserve already saved data unless the owner confirms deletion.

### Back up and restore

1. Export a versioned JSON backup containing supported data areas.
2. Store the downloaded file outside the app.
3. Select a backup for import.
4. Validate its structure before writes.
5. Merge or restore according to documented rules and report failures clearly.

## Product states every feature should consider

- First use and empty data
- Populated data
- Offline operation
- Reconnection and active synchronisation
- Sync failure or partial failure
- App closed during an action
- Stale installed version or service worker
- Phone keyboard open
- Narrow phone, tablet, and true desktop layout
- Light and dark modes

## Approved current scope

Current scope includes the product areas described above, even where they extend beyond the original MVP. Maintenance, reliability, accessibility, responsive behaviour, data protection, and documentation work remain in scope.

## Future ideas requiring separate approval

New coaching or AI features, new health integrations, social features, multi-user support, subscriptions, app-store distribution, and any feature that meaningfully expands collected personal data require a new product decision and approved plan.

## Explicit exclusions

- No public social network or trainer marketplace
- No support for unrelated users or organisations
- No hidden analytics or third-party tracking
- No medical diagnosis or treatment guidance
- No assumption that internet access is available during a workout

## Blueprint update rule

Update this file when a decision changes product scope, a major journey, a named screen, or a durable product rule. Routine fixes belong in `CHANGELOG.md` and do not require blueprint changes unless behaviour changes materially.
