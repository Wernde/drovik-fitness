/**
 * db.ts — the single source of truth for the local database.
 *
 * Dexie wraps IndexedDB (the browser's built-in storage) so the app works
 * fully offline. Every write lands here immediately; a sync layer (Phase 3)
 * will push changes to Supabase in the background.
 *
 * Each table row has:
 *   - id:        unique identifier (UUID)
 *   - createdAt: ISO timestamp set once on creation
 *   - updatedAt: ISO timestamp bumped on every edit — used by the sync layer
 *   - syncedAt:  ISO timestamp set when Supabase confirms the row — null = pending sync
 *   - deleted:   soft-delete flag (we mark as deleted and sync the deletion rather
 *                than hard-deleting, so other devices hear about the removal)
 */

import Dexie, { type Table } from 'dexie'
import { seedExercises } from './seed'

// ── Shared fields every table has ─────────────────────────────────────────────

interface BaseRecord {
  id: string
  createdAt: string
  updatedAt: string
  syncedAt: string | null
  deleted: boolean
}

// ── Exercise library ──────────────────────────────────────────────────────────

export type ExerciseCategory =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'cardio'

export interface Exercise extends BaseRecord {
  name: string
  category: ExerciseCategory
  muscleGroup: string
  isCustom: boolean   // true = user-created, false = pre-seeded
  videoUrl: string | null
  instructions: string
}

// ── Programs ──────────────────────────────────────────────────────────────────

export interface Program extends BaseRecord {
  name: string
  description: string
  isActive: boolean
}

// ProgramPhase: an optional training block within a program (e.g. "Hypertrophy — 4 weeks").
export interface ProgramPhase extends BaseRecord {
  programId: string
  name: string
  weeks: number | null  // planned duration; null if open-ended
  order: number
}

// WorkoutDay: a named day inside a program (e.g. "Push", "Pull", "Legs A").
export interface WorkoutDay extends BaseRecord {
  programId: string
  phaseId: string | null  // null = unassigned (no phase)
  name: string
  order: number
}

// DayExercise: an exercise assigned to a workout day, with optional targets.
export interface DayExercise extends BaseRecord {
  workoutDayId: string
  exerciseId: string
  order: number
  targetSets: number
  targetReps: string        // flexible string — e.g. "5", "8–12", "AMRAP"
  targetWeight: number | null  // kg — optional guideline
  restSecs: number | null   // target rest between sets in seconds
  notes: string
}

// ── Workout logging ───────────────────────────────────────────────────────────

// WorkoutSession: one actual gym session. workoutDayId is null for ad-hoc sessions.
export interface WorkoutSession extends BaseRecord {
  workoutDayId: string | null
  programId: string | null
  date: string              // YYYY-MM-DD
  startedAt: string         // ISO timestamp
  finishedAt: string | null
  notes: string
}

// SessionExercise: an exercise within a logged session.
export interface SessionExercise extends BaseRecord {
  workoutSessionId: string
  exerciseId: string
  order: number
  notes: string
}

// LoggedSet: a single set within a session exercise.
export interface LoggedSet extends BaseRecord {
  sessionExerciseId: string
  setNumber: number
  reps: number
  weight: number            // kg
  rpe: number | null        // Rate of Perceived Exertion 1–10
  rir: number | null        // Reps In Reserve 0–5
  notes: string
  isWarmup: boolean
  machineSetting: string    // e.g. "seat 3, pin 8" — empty string if not set
}

// ── Body weight ───────────────────────────────────────────────────────────────

export interface BodyWeightLog extends BaseRecord {
  date: string              // YYYY-MM-DD
  weight: number            // kg
  notes: string
}

// ── Database class ────────────────────────────────────────────────────────────

class DrovikDB extends Dexie {
  exercises!: Table<Exercise>
  programs!: Table<Program>
  programPhases!: Table<ProgramPhase>
  workoutDays!: Table<WorkoutDay>
  dayExercises!: Table<DayExercise>
  workoutSessions!: Table<WorkoutSession>
  sessionExercises!: Table<SessionExercise>
  sets!: Table<LoggedSet>
  bodyWeightLogs!: Table<BodyWeightLog>

  constructor() {
    super('drovik-fitness')

    // The strings define which fields are indexed for fast querying.
    // Only 'id' is the primary key; everything else is a secondary index.
    // You only need to index fields you filter or sort by.
    // Version 1 — initial schema (Phase 1 & 2).
    this.version(1).stores({
      exercises:        'id, category, muscleGroup, name',
      programs:         'id',
      workoutDays:      'id, programId',
      dayExercises:     'id, workoutDayId, exerciseId',
      workoutSessions:  'id, date, workoutDayId',
      sessionExercises: 'id, workoutSessionId, exerciseId',
      sets:             'id, sessionExerciseId',
      bodyWeightLogs:   'id, date',
    })

    // Version 2 — Phase 3. Schema is unchanged; the upgrade callback inserts
    // any seed exercises that are missing on existing devices (the on('populate')
    // hook only runs on brand-new databases, so returning users never got new
    // exercises added after their first install).
    this.version(2).stores({
      exercises:        'id, category, muscleGroup, name',
      programs:         'id',
      workoutDays:      'id, programId',
      dayExercises:     'id, workoutDayId, exerciseId',
      workoutSessions:  'id, date, workoutDayId',
      sessionExercises: 'id, workoutSessionId, exerciseId',
      sets:             'id, sessionExerciseId',
      bodyWeightLogs:   'id, date',
    }).upgrade(async (tx) => {
      const existing = new Set(await tx.table('exercises').toCollection().primaryKeys())
      const missing  = seedExercises.filter((e) => !existing.has(e.id))
      if (missing.length > 0) await tx.table('exercises').bulkAdd(missing)
    })

    // Version 3 — adds videoUrl to exercises. The upgrade sets the field to
    // null on all existing rows so the TypeScript type is always satisfied.
    this.version(3).stores({
      exercises:        'id, category, muscleGroup, name',
      programs:         'id',
      workoutDays:      'id, programId',
      dayExercises:     'id, workoutDayId, exerciseId',
      workoutSessions:  'id, date, workoutDayId',
      sessionExercises: 'id, workoutSessionId, exerciseId',
      sets:             'id, sessionExerciseId',
      bodyWeightLogs:   'id, date',
    }).upgrade(async (tx) => {
      await tx.table('exercises').toCollection().modify((ex) => {
        if (ex.videoUrl === undefined) ex.videoUrl = null
      })
    })

    // Version 4 — expanded exercise library from free-exercise-db (~200 new exercises).
    // Same re-seed pattern as v2: adds any seed exercises missing on this device.
    this.version(4).stores({
      exercises:        'id, category, muscleGroup, name',
      programs:         'id',
      workoutDays:      'id, programId',
      dayExercises:     'id, workoutDayId, exerciseId',
      workoutSessions:  'id, date, workoutDayId',
      sessionExercises: 'id, workoutSessionId, exerciseId',
      sets:             'id, sessionExerciseId',
      bodyWeightLogs:   'id, date',
    }).upgrade(async (tx) => {
      const existing = new Set(await tx.table('exercises').toCollection().primaryKeys())
      const missing  = seedExercises.filter((e) => !existing.has(e.id))
      if (missing.length > 0) await tx.table('exercises').bulkAdd(missing)
    })

    // Version 7 — adds program phases and phaseId to workout days.
    this.version(7).stores({
      exercises:        'id, category, muscleGroup, name',
      programs:         'id',
      programPhases:    'id, programId',
      workoutDays:      'id, programId, phaseId',
      dayExercises:     'id, workoutDayId, exerciseId',
      workoutSessions:  'id, date, workoutDayId',
      sessionExercises: 'id, workoutSessionId, exerciseId',
      sets:             'id, sessionExerciseId',
      bodyWeightLogs:   'id, date',
    }).upgrade(async (tx) => {
      await tx.table('workoutDays').toCollection().modify((d) => {
        if (d.phaseId === undefined) d.phaseId = null
      })
    })

    // Version 6 — adds machineSetting to logged sets.
    this.version(6).stores({
      exercises:        'id, category, muscleGroup, name',
      programs:         'id',
      workoutDays:      'id, programId',
      dayExercises:     'id, workoutDayId, exerciseId',
      workoutSessions:  'id, date, workoutDayId',
      sessionExercises: 'id, workoutSessionId, exerciseId',
      sets:             'id, sessionExerciseId',
      bodyWeightLogs:   'id, date',
    }).upgrade(async (tx) => {
      await tx.table('sets').toCollection().modify((s) => {
        if (s.machineSetting === undefined) s.machineSetting = ''
      })
    })

    // Version 5 — adds instructions to exercises and restSecs to dayExercises.
    this.version(5).stores({
      exercises:        'id, category, muscleGroup, name',
      programs:         'id',
      workoutDays:      'id, programId',
      dayExercises:     'id, workoutDayId, exerciseId',
      workoutSessions:  'id, date, workoutDayId',
      sessionExercises: 'id, workoutSessionId, exerciseId',
      sets:             'id, sessionExerciseId',
      bodyWeightLogs:   'id, date',
    }).upgrade(async (tx) => {
      await tx.table('exercises').toCollection().modify((ex) => {
        if (ex.instructions === undefined) ex.instructions = ''
      })
      await tx.table('dayExercises').toCollection().modify((de) => {
        if (de.restSecs === undefined) de.restSecs = null
      })
    })

    // 'populate' fires exactly once — when the database is first created on
    // this device. We use it to pre-load the exercise library.
    this.on('populate', async () => {
      await this.exercises.bulkAdd(seedExercises)
    })
  }
}

export const db = new DrovikDB()

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the current ISO timestamp string. */
export const now = () => new Date().toISOString()

/** Returns today's date as a YYYY-MM-DD string. */
export const today = () => new Date().toISOString().slice(0, 10)
