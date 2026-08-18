# Quality and Release Guide

## Quality strategy

Testing is risk-based. Data integrity, active workout logging, offline behaviour, authentication, sync, installation, and upgrades receive more scrutiny than isolated visual polish.

## Critical regression journeys

1. Sign in and restore a persistent session.
2. Launch the installed app online and offline.
3. Start, log, interrupt, resume, and finish a workout.
4. Confirm logged sets and notes survive reload.
5. Build and activate a programme day.
6. Reconnect and synchronise without duplicate or missing records.
7. View a completed session in History and Progress.
8. Export a backup and validate that current persistent data areas are included.

## Verification layers

### Static and production checks

- TypeScript and production build
- Build warnings reviewed rather than ignored
- Generated asset paths and PWA output inspected when relevant

### Behaviour checks

- Targeted scenario for the changed feature
- Relevant error, empty, offline, and recovery states
- Regression of adjacent critical journeys

### Responsive checks

Use representative narrow phone, larger phone, tablet portrait, tablet landscape, and desktop layouts. Check both light and dark modes when the changed surface uses theme tokens.

### Real-device checks

Ask the owner for clear steps when installation, iOS safe areas, home-screen launching, vibration/audio, camera, Apple Shortcuts, or device-specific browser behaviour cannot be confirmed locally.

### Deployment checks

A clean local build is not a successful deployment. When publishing is in scope, separately verify the workflow result, live page, base-path assets, and updated service worker.

## Release gates by risk

| Change | Required reviewers |
| --- | --- |
| UI-only local component | React Engineer; QA; responsive review if layout changes |
| Shared design system | UI Designer; Design-System Custodian; QA |
| Dexie schema or migration | Local-First Data Engineer; Data Integrity Reviewer; Backup Specialist |
| Sync, auth, RLS, Supabase schema | Sync Engineer; Security Reviewer; Data Integrity Reviewer |
| Service worker, manifest, deployment | PWA Reliability Engineer; Release Gatekeeper |
| Major new journey | Product Manager; UX Architect; Integration Engineer; QA |

## Release decision

- **Ready:** acceptance criteria and required checks pass; no unresolved material risk.
- **Ready with manual checks:** local work passes, but clearly identified real-device, account, or deployment checks remain for the owner.
- **Blocked:** a required check fails or there is an unresolved Critical/High risk.

## Completion report

Report the outcome, main files or systems changed, checks performed, limitations, deployment status, and numbered manual steps. Never merge local build status with live deployment status.
