# Weekly Lightweight Review

## Schedule and purpose

Run each Monday at 9:00 AM Australia/Brisbane time. The review is read-only by default: it reports findings and recommends follow-up work, but does not edit application files, publish changes, or fix issues without separate owner approval.

## Five review functions

### Weekly Coordinator

- Read `AGENTS.md`, `CHANGELOG.md`, and this process.
- Inspect changes since the previous weekly report when that history is available.
- Assign only relevant checks and combine duplicate findings.
- Deliver one short owner-facing report.

### Product and UX Reviewer

- Review one priority journey deeply, rotating through workout logging, Program, History/Progress, Nutrition/body data, settings/backup, and application navigation.
- Look for confusing states, excess steps, terminology drift, and inconsistent visual behaviour.
- Check both current behaviour and blueprint alignment.

### Reliability and Data Reviewer

- Review likely risk areas in local writes, migrations, sync, authentication, offline behaviour, and backup coverage.
- Give possible data loss or workout-history corruption immediate priority.
- Use read-only inspection; do not run destructive recovery against owner data.

### Quality and Device Reviewer

- Run the production build and review warnings.
- Inspect representative phone, tablet, and desktop layouts where practical.
- Rotate critical regression journeys and clearly label simulated versus real-device evidence.

### Documentation and Release Reviewer

- Compare recent implementation with the blueprint, architecture guide, setup documentation, and changelog.
- Flag missing manual steps or claims that are no longer current.
- Distinguish local build health from deployed-site health.

## Priority and reporting rules

- Use Critical, High, Medium, and Low definitions from the Team Charter.
- Include evidence and a concrete recommendation for every finding.
- Do not repeat an unchanged accepted risk every week unless its severity increases.
- Do not report speculative issues as confirmed defects.
- If nothing material is found, say so and list what was checked.

## Weekly report template

### Drovik Fitness weekly review — YYYY-MM-DD

**Overall status:** Healthy / Attention recommended / Action required

**Checks completed**

- Areas and journeys reviewed
- Build or read-only checks performed
- Viewports or environments inspected

**Findings**

| Priority | Area | Evidence | Recommendation |
| --- | --- | --- | --- |
| High | Example | Reproducible observation | Proposed follow-up task |

**Documentation alignment**

- Current, or list specific mismatches

**Owner checks requested**

- Numbered real-device, account, or deployment checks only when needed

**Suggested work for approval**

1. Small, independently approvable task with definition of done

## Rotation guide

- Week 1: Start, log, resume, and finish a workout
- Week 2: Programme creation, editing, and next-workout selection
- Week 3: Offline, sync, authentication, and multi-device assumptions
- Week 4: History, progress, backup, and data completeness
- Week 5 when present: responsive shell, accessibility, performance, and documentation debt

Critical checks may override the rotation whenever recent changes increase risk.
