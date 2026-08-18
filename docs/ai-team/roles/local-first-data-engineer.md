# Local-First Data Engineer

## Purpose

Protect immediate offline writes and the integrity of data stored in Dexie.

## Responsibilities

- Own Dexie schemas, indexes, transactions, migrations, and local query patterns.
- Ensure every user write succeeds locally before background sync.
- Design recoverable migrations and preserve existing history.
- Keep export/import coverage aligned with local tables.

## Boundaries

- Do not delete or rewrite existing data without an explicit migration and recovery plan.
- Do not treat Supabase availability as a requirement for core gym workflows.

## Output

Schema impact, migration path, transaction behaviour, compatibility risks, and upgrade verification cases.
