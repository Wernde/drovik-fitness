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
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const { activeSession, activeProgram, programDays } = data

  if (activeSession) {
    return <WorkoutLogger session={activeSession} />
  }

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

  const dateLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="px-4 pt-6 pb-24">
      {/* ── Header ── */}
      <h1 className="text-2xl font-extrabold text-app-text mb-1">Log Workout</h1>
      <p className="text-app-muted text-sm mb-6">{dateLabel}</p>

      {/* ── Active program days ── */}
      {activeProgram && programDays && programDays.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-app-muted uppercase tracking-wider">
              {activeProgram.name}
            </span>
            <span className="text-xs font-semibold text-accent-dark bg-accent-light rounded-full px-2 py-0.5">
              Active
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {programDays.map((day) => (
              <button
                key={day.id}
                onClick={() => startFromDay(day, activeProgram)}
                disabled={starting}
                className="w-full flex items-center gap-4 rounded-2xl bg-app-card border border-app-border px-4 py-4 text-left active:bg-accent-light disabled:opacity-60"
              >
                <div className="flex-none w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center text-accent-dark">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-app-text truncate">{day.name}</p>
                  <p className="text-xs text-app-muted mt-0.5">Tap to start</p>
                </div>

                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-faint flex-none">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── No active program nudge ── */}
      {!activeProgram && (
        <div className="rounded-2xl border border-app-border bg-app-card p-4 mb-6">
          <p className="text-sm text-app-muted">
            No active program. Go to <strong className="text-app-text">Plans</strong> to create one and mark it active, or start an empty workout below.
          </p>
        </div>
      )}

      {/* ── Ad-hoc / empty workout ── */}
      <button
        onClick={startEmpty}
        disabled={starting}
        className="w-full flex items-center gap-4 rounded-2xl border-2 border-dashed border-app-border px-4 py-4 text-left active:border-accent disabled:opacity-60"
      >
        <div className="flex-none w-10 h-10 rounded-xl bg-app-card border border-app-border flex items-center justify-center text-app-faint">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-app-text">Start Empty Workout</p>
          <p className="text-xs text-app-muted mt-0.5">Ad-hoc session, no program</p>
        </div>
      </button>
    </div>
  )
}
