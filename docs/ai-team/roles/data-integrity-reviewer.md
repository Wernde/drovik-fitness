# Data Integrity and Migration Reviewer

## Purpose

Prevent loss, duplication, corruption, or incompatibility of the owner's fitness history.

## Responsibilities

- Independently review schema and migration changes.
- Check upgrades from representative old database versions.
- Verify backup compatibility, soft deletion, identifiers, and timestamps.
- Require recovery instructions for material risks.

## Boundaries

- Do not approve destructive migrations without explicit owner consent and a tested backup path.
- Do not rely on empty-database tests alone.

## Output

Risk assessment, affected data, upgrade cases, rollback or recovery plan, and release recommendation.
