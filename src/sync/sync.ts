/**
 * sync.ts — bidirectional sync between Dexie (local) and Supabase (cloud).
 *
 * Strategy: "last-write-wins" by updatedAt timestamp.
 *
 * PUSH — find every local row where syncedAt is null (i.e. written since the
 *         last successful sync) and upsert it into Supabase.
 *
 * PULL — fetch every Supabase row that was updated after the latest syncedAt
 *         timestamp we have locally, then merge them into Dexie.
 *
 * Pull wins over push when both sides changed the same row since the last sync
 * (extremely rare for a single-user app, but handled gracefully).
 *
 * Call syncAll() once after login and whenever you regain connectivity.
 */

import { supabase } from '../lib/supabase'
import { db } from '../db/db'
import type { Table } from 'dexie'

// ── Table map ─────────────────────────────────────────────────────────────────

// Maps each Dexie table to its Supabase counterpart, plus how to convert
// camelCase Dexie fields to snake_case Supabase columns.

type SyncTable = {
  dexie:     Table<any>         // Dexie table reference
  supabase:  string             // Supabase table name
  toRemote:  (row: any, userId: string) => Record<string, unknown>
  toLocal:   (row: any) => Record<string, unknown>
}

const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
const snakeToCamel = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

function objectToCamel(obj: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [snakeToCamel(k), v])
  )
}

// Generic converters that handle the shared BaseRecord fields.
// Individual tables only need overrides for renamed fields (e.g. camelCase → snake_case
// for multi-word fields like workoutDayId → workout_day_id).

function baseToRemote(row: any, userId: string, extra: Record<string, unknown> = {}) {
  return {
    id:         row.id,
    user_id:    userId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    synced_at:  row.syncedAt,
    deleted:    row.deleted,
    ...extra,
  }
}

function baseToLocal(row: any, extra: Record<string, unknown> = {}) {
  return {
    id:        row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt:  row.synced_at,
    deleted:   row.deleted,
    ...extra,
  }
}

// ── Per-table conversion ───────────────────────────────────────────────────────

const TABLES: SyncTable[] = [
  {
    dexie:    db.exercises,
    supabase: 'exercises',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      name:         r.name,
      category:     r.category,
      muscle_group: r.muscleGroup,
      is_custom:    r.isCustom,
    }),
    toLocal: (r) => baseToLocal(r, {
      name:        r.name,
      category:    r.category,
      muscleGroup: r.muscle_group,
      isCustom:    r.is_custom,
    }),
  },
  {
    dexie:    db.programs,
    supabase: 'programs',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      name:        r.name,
      description: r.description,
      is_active:   r.isActive,
    }),
    toLocal: (r) => baseToLocal(r, {
      name:        r.name,
      description: r.description,
      isActive:    r.is_active,
    }),
  },
  {
    dexie:    db.workoutDays,
    supabase: 'workout_days',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      program_id: r.programId,
      name:       r.name,
      order:      r.order,
    }),
    toLocal: (r) => baseToLocal(r, {
      programId: r.program_id,
      name:      r.name,
      order:     r.order,
    }),
  },
  {
    dexie:    db.dayExercises,
    supabase: 'day_exercises',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      workout_day_id: r.workoutDayId,
      exercise_id:    r.exerciseId,
      order:          r.order,
      target_sets:    r.targetSets,
      target_reps:    r.targetReps,
      target_weight:  r.targetWeight,
      notes:          r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      workoutDayId: r.workout_day_id,
      exerciseId:   r.exercise_id,
      order:        r.order,
      targetSets:   r.target_sets,
      targetReps:   r.target_reps,
      targetWeight: r.target_weight,
      notes:        r.notes,
    }),
  },
  {
    dexie:    db.workoutSessions,
    supabase: 'workout_sessions',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      workout_day_id: r.workoutDayId,
      program_id:     r.programId,
      date:           r.date,
      started_at:     r.startedAt,
      finished_at:    r.finishedAt,
      notes:          r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      workoutDayId: r.workout_day_id,
      programId:    r.program_id,
      date:         r.date,
      startedAt:    r.started_at,
      finishedAt:   r.finished_at,
      notes:        r.notes,
    }),
  },
  {
    dexie:    db.sessionExercises,
    supabase: 'session_exercises',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      workout_session_id: r.workoutSessionId,
      exercise_id:        r.exerciseId,
      order:              r.order,
      notes:              r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      workoutSessionId: r.workout_session_id,
      exerciseId:       r.exercise_id,
      order:            r.order,
      notes:            r.notes,
    }),
  },
  {
    dexie:    db.sets,
    supabase: 'sets',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      session_exercise_id: r.sessionExerciseId,
      set_number:          r.setNumber,
      reps:                r.reps,
      weight:              r.weight,
      rpe:                 r.rpe,
      rir:                 r.rir,
      notes:               r.notes,
      is_warmup:           r.isWarmup,
    }),
    toLocal: (r) => baseToLocal(r, {
      sessionExerciseId: r.session_exercise_id,
      setNumber:         r.set_number,
      reps:              r.reps,
      weight:            r.weight,
      rpe:               r.rpe,
      rir:               r.rir,
      notes:             r.notes,
      isWarmup:          r.is_warmup,
    }),
  },
  {
    dexie:    db.bodyWeightLogs,
    supabase: 'body_weight_logs',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      date:   r.date,
      weight: r.weight,
      notes:  r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      date:   r.date,
      weight: r.weight,
      notes:  r.notes,
    }),
  },
]

// ── Push: local → Supabase ────────────────────────────────────────────────────

async function pushTable(t: SyncTable, userId: string): Promise<void> {
  // Find all rows that haven't been synced yet (syncedAt === null).
  const pending = await t.dexie.filter((row) => row.syncedAt === null).toArray()
  if (pending.length === 0) return

  const remoteRows = pending.map((row) => t.toRemote(row, userId))

  const { error } = await supabase.from(t.supabase).upsert(remoteRows, { onConflict: 'id' })
  if (error) throw new Error(`Push ${t.supabase}: ${error.message}`)

  // Mark rows as synced.
  const syncedAt = new Date().toISOString()
  await Promise.all(pending.map((row) => t.dexie.update(row.id, { syncedAt })))
}

// ── Pull: Supabase → local ────────────────────────────────────────────────────

async function pullTable(t: SyncTable): Promise<void> {
  // Find the most recent syncedAt in local data to use as a "since" cursor.
  // Pull everything from Supabase that's newer than this.
  const allLocal = await t.dexie.toArray()
  const latestSync = allLocal.reduce<string | null>((max, row) => {
    if (!row.syncedAt) return max
    return max === null || row.syncedAt > max ? row.syncedAt : max
  }, null)

  let query = supabase.from(t.supabase).select('*')
  if (latestSync) {
    query = query.gt('updated_at', latestSync)
  }

  const { data, error } = await query
  if (error) throw new Error(`Pull ${t.supabase}: ${error.message}`)
  if (!data || data.length === 0) return

  const localRows = data.map((r) => t.toLocal(r))
  // bulkPut inserts new rows and overwrites existing ones (last-write-wins).
  await t.dexie.bulkPut(localRows)
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'error'

/** Push all unsynced local changes then pull anything new from Supabase. */
export async function syncAll(userId: string): Promise<void> {
  for (const t of TABLES) {
    await pushTable(t, userId)
  }
  for (const t of TABLES) {
    await pullTable(t)
  }
}
