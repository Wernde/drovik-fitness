# Architecture Guide

## System overview

Drovik is a React and TypeScript PWA built with Vite and Tailwind CSS. Dexie/IndexedDB provides immediate local persistence. Supabase provides authentication and the cloud source of truth across devices. A background sync layer connects the two without blocking core gym workflows.

## Architectural boundaries

| Area | Responsibility |
| --- | --- |
| React pages and components | Rendering, interaction, route-level behaviour, and user feedback |
| Shared UI components and theme tokens | Consistent visual patterns and component states |
| Dexie database | Immediate local writes, offline reads, migrations, and local query model |
| Sync layer | Push/pull orchestration, conflict handling, retry, and sync status |
| Supabase | Persistent session, remote tables, RLS, and cross-device source of truth |
| PWA layer | Manifest, installability, app-shell caching, offline launch, and update behaviour |
| GitHub Actions/Pages | Production build and static deployment |

## Non-negotiable invariants

- A user write is committed to IndexedDB before remote sync is attempted.
- Core workout logging remains usable offline.
- Existing records survive schema upgrades unless an owner-approved migration explicitly changes them.
- Remote access to private data is constrained by authenticated owner-only RLS.
- Client-side Supabase anon configuration is expected; service-role or private secrets never enter the client bundle.
- Soft deletion and sync metadata remain consistent across local and remote representations.
- Production assets respect the GitHub Pages base path.
- Backup coverage is reviewed whenever persistent tables change.

## Change gates

### Database change

Requires Local-First Data Engineer ownership and Data Integrity review. Document version upgrade, old-device path, transaction boundaries, backup impact, and recovery.

### Sync or Supabase change

Requires Supabase/Sync ownership plus Security review. Document RLS, payload compatibility, conflict behaviour, offline retries, and multi-device consequences.

### Service-worker or deployment change

Requires PWA Reliability review. Test fresh load, repeat load, offline launch, old-to-new update, Pages asset paths, and deployed result.

### Cross-layer feature

Requires an Integration Engineer boundary map before implementation. Agree on data shapes and sequencing before dependent files are edited.

## Conflict and failure philosophy

- Prefer explicit deterministic conflict rules over hidden merging.
- Surface sync failure without preventing local use.
- Never discard a local record merely because a remote operation failed.
- Make retries idempotent where practical.
- Preserve enough metadata to explain or recover partial failure.

## Dependency rule

Use the platform, React, or current dependencies when they solve the problem clearly. A new material dependency needs a Dependency Review covering necessity, maintenance, security, bundle cost, offline effect, and removal cost.

## Architecture decisions

Create a short decision record when work changes a non-negotiable invariant, persistent data contract, sync rule, authentication model, deployment approach, or foundational UI architecture. Routine implementation detail does not need a decision record.
