/**
 * Log — entry point for workout logging.
 *
 * If there's an unfinished session → shows the active workout logger.
 * Otherwise → shows options to start a new session (from active program or ad-hoc).
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { WorkoutDay, Program } from '../db/db'
import WorkoutLogger from '../components/WorkoutLogger'

export default function Log() {
  const [starting, setStarting] = useState(false)

  // Single compound query so we have one unambiguous loading state.
  // useLiveQuery returns undefined while loading; once resolved, each field
  // may be undefined (no match) or the actual record — that's intentional.
  const data = useLiveQuery(async () => {
    const activeSession = await db.workoutSessions
      .filter((s) => !s.deleted && s.finishedAt === null)
      .first()

    const activeProgram = await db.programs
      .filter((p) => p.isActive && !p.deleted)
      .first()

    const programDays = activeProgram
      ? await db.workoutDays
          .where('programId').equals(activeProgram.id)
          .filter((d) => !d.deleted)
          .toArray()
          .then((list) => list.sort((a, b) => a.order - b.order))
      : []

    return { activeSession, activeProgram, programDays }
  }, [])

  if (data === undefined) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  const { activeSession, activeProgram, programDays } = data

  // ── Active workout ───────────────────────────────────────────────────────────

  if (activeSession) {
    return <WorkoutLogger session={activeSession} />
  }

  // ── Start workout ────────────────────────────────────────────────────────────

  async function startFromDay(day: WorkoutDay, program: Program) {
    setStarting(true)
    try {
      const timestamp = now()
      const sessionId = crypto.randomUUID()

      await db.workoutSessions.add({
        id:            sessionId,
        workoutDayId:  day.id,
        programId:     program.id,
        date:          today(),
        startedAt:     timestamp,
        finishedAt:    null,
        notes:         '',
        createdAt:     timestamp,
        updatedAt:     timestamp,
        syncedAt:      null,
        deleted:       false,
      })

      // Pre-populate exercises from the day template.
      const dayExercises = await db.dayExercises
        .where('workoutDayId').equals(day.id)
        .filter((de) => !de.deleted)
        .toArray()

      dayExercises.sort((a, b) => a.order - b.order)

      if (dayExercises.length > 0) {
        await db.sessionExercises.bulkAdd(
          dayExercises.map((de, idx) => ({
            id:               crypto.randomUUID(),
            workoutSessionId: sessionId,
            exerciseId:       de.exerciseId,
            order:            idx,
            notes:            '',
            createdAt:        timestamp,
            updatedAt:        timestamp,
            syncedAt:         null,
            deleted:          false,
          }))
        )
      }
      // useLiveQuery will pick up the new session and re-render automatically.
    } catch {
      setStarting(false)
    }
  }

  async function startEmpty() {
    setStarting(true)
    try {
      const timestamp = now()
      await db.workoutSessions.add({
        id:            crypto.randomUUID(),
        workoutDayId:  null,
        programId:     null,
        date:          today(),
        startedAt:     timestamp,
        finishedAt:    null,
        notes:         '',
        createdAt:     timestamp,
        updatedAt:     timestamp,
        syncedAt:      null,
        deleted:       false,
      })
    } catch {
      setStarting(false)
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">Log Workout</h1>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {/* Active program days */}
      {activeProgram && programDays && programDays.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {activeProgram.name}
          </p>
          <div className="flex flex-col gap-2">
            {programDays.map((day) => (
              <button
                key={day.id}
                onClick={() => startFromDay(day, activeProgram)}
                disabled={starting}
                className="w-full rounded-xl bg-sky-500 text-white px-4 py-4 text-left font-semibold text-sm active:bg-sky-600 disabled:opacity-60"
              >
                <span className="block">{day.name}</span>
                <span className="text-sky-200 text-xs font-normal">Start this day</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No active program nudge */}
      {!activeProgram && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 p-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
          No active program. Go to <strong>Programs</strong> to create one and mark it active, or start an empty workout below.
        </div>
      )}

      {/* Empty / ad-hoc workout */}
      <button
        onClick={startEmpty}
        disabled={starting}
        className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 px-4 py-4 text-sm font-medium active:bg-gray-50 dark:active:bg-gray-800/40 disabled:opacity-60"
      >
        Start Empty Workout
      </button>
    </div>
  )
}
