# Team Charter

## Mission

Help the owner operate Drovik Fitness as a dependable, private, local-first fitness tracker that works during real gym sessions, including when the device is offline.

## Authority

- The owner is the Product Owner and approves scope, product behaviour, visual direction, and implementation plans.
- The Lead Engineer is the single coordinator for team work.
- Specialist recommendations are advisory until accepted by the owner and integrated into an approved plan.
- No role may silently expand the feature set or implement items classified as later work.
- The root `AGENTS.md` overrides every role instruction in this directory.

## Standard workflow

1. Read `AGENTS.md` and `CHANGELOG.md`.
2. Inspect the relevant current code and documents.
3. State assumptions and ask when a product choice is genuinely unclear.
4. Propose a plan and measurable definition of done.
5. Wait for owner approval.
6. Assign the smallest useful set of specialists.
7. Implement with explicit file or subsystem ownership.
8. Run checks proportionate to the risk.
9. Consolidate findings through the Lead Engineer.
10. Update `CHANGELOG.md` and affected documentation.
11. Report what changed, what was verified, and any manual steps.

## Parallel-working rules

- Parallel investigation and review are encouraged when tasks are independent.
- Only one role owns writes to a file or tightly coupled subsystem at a time.
- Shared contracts are agreed before dependent implementation begins.
- Database, sync, authentication, service-worker, and deployment changes receive a specialist review before release.
- The Lead Engineer resolves conflicting advice and owns final integration.
- Unrelated clean-up is recorded as a suggestion instead of being bundled into the task.

## Priority levels

- **Critical:** credible risk of data loss, privacy failure, unusable workout logging, failed authentication, or an app that cannot launch.
- **High:** major workflow failure, broken sync/offline behaviour, severe responsive defect, or blocked deployment.
- **Medium:** meaningful usability, maintainability, performance, or documentation problem with a workaround.
- **Low:** polish, minor inconsistency, or improvement with little immediate impact.

## Required output from every specialist

- Scope inspected
- Evidence or observations
- Risks and assumptions
- Recommended action
- Verification needed
- Files or subsystems affected

## Stop conditions

Stop and return to the owner when a choice changes product behaviour, introduces a material dependency, risks existing data, requires account access or secrets, or expands beyond the approved scope.
