/**
 * Log — entry point for workout logging.
 *
 * If there's an unfinished session → shows the active workout logger.
 * Otherwise → shows options to start a new session (from active program or ad-hoc).
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { WorkoutDay, Program, WorkoutSession } from '../db/db'
import WorkoutLogger from '../components/WorkoutLogger'
import ErrorBoundary from '../components/ErrorBoundary'
import { Button } from '../components/ui'
import { useToast } from '../contexts/ToastContext'

const STALE_WORKOUT_HOURS = 12
const STALE_WORKOUT_MS = STALE_WORKOUT_HOURS * 60 * 60 * 1000

function getSessionAgeMs(session: WorkoutSession) {
  return Date.now() - new Date(session.startedAt).getTime()
}

function isStaleSession(session: WorkoutSession) {
  return getSessionAgeMs(session) > STALE_WORKOUT_MS
}

function formatSessionAge(session: WorkoutSession) {
  const hours = Math.max(0, Math.floor(getSessionAgeMs(session) / 3600000))
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
}

export default function Log() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [starting, setStarting] = useState(false)
  const [clearingStale, setClearingStale] = useState(false)
  const [resumedSessionId, setResumedSessionId] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const unfinishedSessions = await db.workoutSessions
      .filter((s) => !s.deleted && s.finishedAt === null)
      .toArray()
      .then((list) => list.sort((a, b) => b.startedAt.localeCompare(a.startedAt)))

    const activeSession = unfinishedSessions[0] ?? null
    const activeDay = activeSession?.workoutDayId
      ? await db.workoutDays.get(activeSession.workoutDayId)
      : null

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

    return { activeSession, activeDay, activeProgram, programDays }
  }, [])

  if (data === undefined) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const { activeSession, activeDay, activeProgram, programDays } = data

  if (activeSession) {
    const stale = isStaleSession(activeSession)
    if (!stale || resumedSessionId === activeSession.id) {
      return (
        <ErrorBoundary>
          <WorkoutLogger session={activeSession} />
        </ErrorBoundary>
      )
    }

    return (
      <div className="page-x pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex-none w-9 h-9 rounded-full bg-app-bg border border-app-border flex items-center justify-center text-app-muted active:bg-app-border"
            aria-label="Back"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <h1 className="text-2xl font-extrabold text-app-text">Log Workout</h1>
        </div>

        <div className="rounded-card bg-app-surface border border-amber-200 px-4 py-5 shadow-card">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Workout left open</p>
          <h2 className="text-xl font-extrabold text-app-text mb-2">{activeDay?.name ?? 'Free Workout'}</h2>
          <p className="text-sm text-app-muted mb-5">
            This workout was started {formatSessionAge(activeSession)} ago, so it looks like an old session that was never finished.
          </p>

          <div className="flex flex-col gap-2">
            <Button variant="primary" fullWidth onClick={() => setResumedSessionId(activeSession.id)}>
              Resume anyway
            </Button>
            <Button
              variant="danger"
              fullWidth
              onClick={() => discardStaleSession(activeSession)}
              disabled={clearingStale}
            >
              {clearingStale ? 'Clearing…' : 'Discard old workout'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  async function discardStaleSession(session: WorkoutSession) {
    setClearingStale(true)
    try {
      const ts = now()
      const sessionExercises = await db.sessionExercises
        .where('workoutSessionId').equals(session.id)
        .toArray()

      await db.transaction('rw', db.workoutSessions, db.sessionExercises, db.sets, async () => {
        await db.workoutSessions.update(session.id, { deleted: true, updatedAt: ts, syncedAt: null })
        await db.sessionExercises
          .where('workoutSessionId').equals(session.id)
          .modify({ deleted: true, updatedAt: ts, syncedAt: null })
        for (const se of sessionExercises) {
          await db.sets
            .where('sessionExerciseId').equals(se.id)
            .modify({ deleted: true, updatedAt: ts, syncedAt: null })
        }
      })
      setResumedSessionId(null)
      showToast('Old workout discarded.')
    } catch {
      showToast('Could not discard the old workout. Please try again.')
    } finally {
      setClearingStale(false)
    }
  }

  async function startFromDay(day: WorkoutDay, program: Program) {
    setStarting(true)
    try {
      const timestamp = now()
      const sessionId = crypto.randomUUID()

      const dayExercises = await db.dayExercises
        .where('workoutDayId').equals(day.id)
        .filter((de) => !de.deleted)
        .toArray()

      dayExercises.sort((a, b) => a.order - b.order)

      await db.transaction('rw', db.workoutSessions, db.sessionExercises, async () => {
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
      })
    } catch {
      showToast('Could not start workout. Please try again.')
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
      showToast('Could not start workout. Please try again.')
      setStarting(false)
    }
  }

  const dateLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="page-x pt-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate(-1)}
          className="flex-none w-9 h-9 rounded-full bg-app-bg border border-app-border flex items-center justify-center text-app-muted active:bg-app-border"
          aria-label="Back"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="text-2xl font-extrabold text-app-text">Log Workout</h1>
      </div>
      <p className="text-app-muted text-sm mb-6 pl-12">{dateLabel}</p>

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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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
          <p className="text-xs text-app-muted mt-0.5">Free workout, no programme</p>
        </div>
      </button>
    </div>
  )
}
