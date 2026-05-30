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
      video_url:    r.videoUrl ?? null,
      instructions: r.instructions ?? '',
    }),
    toLocal: (r) => baseToLocal(r, {
      name:         r.name,
      category:     r.category,
      muscleGroup:  r.muscle_group,
      isCustom:     r.is_custom,
      videoUrl:     r.video_url ?? null,
      instructions: r.instructions ?? '',
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
      phase_id:   r.phaseId ?? null,
      name:       r.name,
      order:      r.order,
    }),
    toLocal: (r) => baseToLocal(r, {
      programId: r.program_id,
      phaseId:   r.phase_id ?? null,
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
      rest_secs:      r.restSecs ?? null,
      notes:          r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      workoutDayId: r.workout_day_id,
      exerciseId:   r.exercise_id,
      order:        r.order,
      targetSets:   r.target_sets,
      targetReps:   r.target_reps,
      targetWeight: r.target_weight,
      restSecs:     r.rest_secs ?? null,
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
      machine_setting:     r.machineSetting ?? '',
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
      machineSetting:    r.machine_setting ?? '',
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
  {
    dexie:    db.programPhases,
    supabase: 'program_phases',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      program_id: r.programId,
      name:       r.name,
      weeks:      r.weeks,
      order:      r.order,
    }),
    toLocal: (r) => baseToLocal(r, {
      programId: r.program_id,
      name:      r.name,
      weeks:     r.weeks,
      order:     r.order,
    }),
  },
  {
    dexie:    db.nutritionLogs,
    supabase: 'nutrition_logs',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      date:      r.date,
      calories:  r.calories,
      protein_g: r.proteinG,
      carbs_g:   r.carbsG,
      fat_g:     r.fatG,
      water_ml:  r.waterMl,
      notes:     r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      date:     r.date,
      calories: r.calories,
      proteinG: r.protein_g,
      carbsG:   r.carbs_g,
      fatG:     r.fat_g,
      waterMl:  r.water_ml,
      notes:    r.notes,
    }),
  },
  {
    dexie:    db.habits,
    supabase: 'habits',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      name:     r.name,
      color:    r.color,
      archived: r.archived,
    }),
    toLocal: (r) => baseToLocal(r, {
      name:     r.name,
      color:    r.color,
      archived: r.archived,
    }),
  },
  {
    dexie:    db.habitCompletions,
    supabase: 'habit_completions',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      habit_id: r.habitId,
      date:     r.date,
    }),
    toLocal: (r) => baseToLocal(r, {
      habitId: r.habit_id,
      date:    r.date,
    }),
  },
  {
    dexie:    db.bodyMeasurementLogs,
    supabase: 'body_measurement_logs',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      date:            r.date,
      neck_cm:         r.neckCm,
      shoulders_cm:    r.shouldersCm,
      chest_cm:        r.chestCm,
      waist_cm:        r.waistCm,
      hips_cm:         r.hipsCm,
      left_arm_cm:     r.leftArmCm,
      right_arm_cm:    r.rightArmCm,
      left_thigh_cm:   r.leftThighCm,
      right_thigh_cm:  r.rightThighCm,
      left_calf_cm:    r.leftCalfCm,
      right_calf_cm:   r.rightCalfCm,
      notes:           r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      date:           r.date,
      neckCm:         r.neck_cm,
      shouldersCm:    r.shoulders_cm,
      chestCm:        r.chest_cm,
      waistCm:        r.waist_cm,
      hipsCm:         r.hips_cm,
      leftArmCm:      r.left_arm_cm,
      rightArmCm:     r.right_arm_cm,
      leftThighCm:    r.left_thigh_cm,
      rightThighCm:   r.right_thigh_cm,
      leftCalfCm:     r.left_calf_cm,
      rightCalfCm:    r.right_calf_cm,
      notes:          r.notes,
    }),
  },
  {
    // Only custom foods (isCustom = true) are synced. Seeded foods have
    // a non-null syncedAt so they are never pushed, and they aren't in
    // Supabase so they're never pulled.
    dexie:    db.foods,
    supabase: 'foods',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      name:               r.name,
      category:           r.category,
      calories_per_100g:  r.caloriesPer100g,
      protein_per_100g:   r.proteinPer100g,
      carbs_per_100g:     r.carbsPer100g,
      fat_per_100g:       r.fatPer100g,
      is_custom:          r.isCustom,
    }),
    toLocal: (r) => baseToLocal(r, {
      name:             r.name,
      category:         r.category,
      caloriesPer100g:  r.calories_per_100g,
      proteinPer100g:   r.protein_per_100g,
      carbsPer100g:     r.carbs_per_100g,
      fatPer100g:       r.fat_per_100g,
      isCustom:         r.is_custom,
    }),
  },
  {
    dexie:    db.foodLogs,
    supabase: 'food_logs',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      date:     r.date,
      food_id:  r.foodId,
      meal:     r.meal,
      amount_g: r.amountG,
    }),
    toLocal: (r) => baseToLocal(r, {
      date:    r.date,
      foodId:  r.food_id,
      meal:    r.meal,
      amountG: r.amount_g,
    }),
  },
  {
    dexie:    db.recipes,
    supabase: 'recipes',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      name:     r.name,
      servings: r.servings,
      notes:    r.notes,
    }),
    toLocal: (r) => baseToLocal(r, {
      name:     r.name,
      servings: r.servings,
      notes:    r.notes,
    }),
  },
  {
    dexie:    db.recipeFoods,
    supabase: 'recipe_foods',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      recipe_id: r.recipeId,
      food_id:   r.foodId,
      amount_g:  r.amountG,
    }),
    toLocal: (r) => baseToLocal(r, {
      recipeId: r.recipe_id,
      foodId:   r.food_id,
      amountG:  r.amount_g,
    }),
  },
  {
    dexie:    db.healthMetrics,
    supabase: 'health_metrics',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      date:            r.date,
      resting_hr:      r.restingHr,
      active_calories: r.activeCalories,
      steps:           r.steps,
    }),
    toLocal: (r) => baseToLocal(r, {
      date:           r.date,
      restingHr:      r.resting_hr,
      activeCalories: r.active_calories,
      steps:          r.steps,
    }),
  },
  {
    dexie:    db.healthWorkouts,
    supabase: 'health_workouts',
    toRemote: (r, uid) => baseToRemote(r, uid, {
      workout_date:    r.workoutDate,
      workout_type:    r.workoutType,
      duration_secs:   r.durationSecs,
      active_calories: r.activeCalories,
      avg_hr:          r.avgHr,
      max_hr:          r.maxHr,
    }),
    toLocal: (r) => baseToLocal(r, {
      workoutDate:    r.workout_date,
      workoutType:    r.workout_type,
      durationSecs:   r.duration_secs,
      activeCalories: r.active_calories,
      avgHr:          r.avg_hr,
      maxHr:          r.max_hr,
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
