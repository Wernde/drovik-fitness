# Documentation Ownership Map

| Document | Owner | Update trigger |
| --- | --- | --- |
| Root `AGENTS.md` | Owner and Lead Engineer | Governing vision or working agreement changes |
| `CHANGELOG.md` | Release Notes Editor | Completed user-visible or operational change |
| `docs/ai-team/PRODUCT_BLUEPRINT.md` | Blueprint Editor | Product scope, screen, journey, or durable rule changes |
| `docs/ai-team/ARCHITECTURE.md` | Architecture Recorder | Foundational boundary or invariant changes |
| `docs/ai-team/DESIGN_SYSTEM.md` | Design-System Custodian | Durable interface, responsive, or component rules change |
| `docs/ai-team/QUALITY_AND_RELEASE.md` | Release Gatekeeper | Quality gates, device coverage, or release policy changes |
| `docs/ai-team/WEEKLY_REVIEW.md` | Weekly Coordinator | Weekly process or report format changes |
| `docs/ai-team/roles/*` | Lead Engineer | Role responsibility or boundary changes |
| `README.md` | Technical Writer | Setup, local run, deployment, or primary project orientation changes |
| `.env.example` | Technical Writer with subsystem owner | Required client configuration changes |
| `supabase/schema.sql` guidance | Supabase and Sync Engineer | Remote schema, policy, or setup changes |

## Documentation rules

- Verify current behaviour before describing it as current.
- Keep account and real-device steps explicit.
- Use Australian English and metric units.
- Do not duplicate detailed implementation history across the blueprint and changelog.
- Record unresolved manual steps in the completion report and the most relevant durable document.
- Never place credentials or private values in documentation.
