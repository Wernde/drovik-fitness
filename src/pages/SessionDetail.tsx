/**
 * SessionDetail — read-only view of a completed workout session.
 */

import { Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LoggedSet } from '../db/db'
import MuscleIcon from '../components/MuscleIcon'
import { formatDuration } from '../lib/utils'

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate       = useNavigate()

  const session = useLiveQuery(
    () => (sessionId ? db.workoutSessions.get(sessionId) : undefined),
    [sessionId],
  )

  const data = useLiveQuery(async () => {
    if (!sessionId) return null

    const ses = await db.sessionExercises
      .where('workoutSessionId').equals(sessionId)
      .filter((se) => !se.deleted)
      .toArray()
    ses.sort((a, b) => a.order - b.order)

    const seIds = ses.map((se) => se.id)
    const sets  = seIds.length > 0
      ? await db.sets.where('sessionExerciseId').anyOf(seIds).filter((s) => !s.deleted).toArray()
      : []

    const exerciseIds = [...new Set(ses.map((se) => se.exerciseId))]
    const exercises   = exerciseIds.length > 0
      ? await db.exercises.where('id').anyOf(exerciseIds).toArray()
      : []

    let programName: string | null = null
    let dayName:     string | null = null

    if (session?.programId) {
      const prog = await db.programs.get(session.programId)
      programName = prog?.name ?? null
    }
    if (session?.workoutDayId) {
      const day = await db.workoutDays.get(session.workoutDayId)
      dayName = day?.name ?? null
    }

    const setsMap = new Map<string, LoggedSet[]>()
    for (const s of sets) {
      const list = setsMap.get(s.sessionExerciseId) ?? []
      list.push(s)
      setsMap.set(s.sessionExerciseId, list)
    }
    for (const [k, v] of setsMap) {
      v.sort((a, b) => a.setNumber - b.setNumber)
    }

    return {
      sessionExercises: ses,
      exerciseMap: new Map(exercises.map((e) => [e.id, e])),
      setsMap,
      programName,
      dayName,
    }
  }, [sessionId, session?.programId, session?.workoutDayId])

  if (!session || !data) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  const { sessionExercises, exerciseMap, setsMap, programName, dayName } = data

  const displayDate = new Date(session.date + 'T12:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const allSets     = [...setsMap.values()].flat().filter((s) => !s.isWarmup)
  const totalVolume = allSets.reduce((sum, s) => sum + s.reps * s.weight, 0)

  return (
    <div className="px-4 pt-6 pb-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/history')}
          className="flex-none text-gray-500 active:text-white p-1 -ml-1"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">{dayName ?? 'Ad-hoc Workout'}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {programName ? `${programName} · ` : ''}{displayDate}
          </p>
        </div>
      </div>

      {/* ── Summary chips ── */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <span className="rounded-full bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1">
          {formatDuration(session.startedAt, session.finishedAt)}
        </span>
        <span className="rounded-full bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1">
          {allSets.length} working {allSets.length === 1 ? 'set' : 'sets'}
        </span>
        {totalVolume > 0 && (
          <span className="rounded-full bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1">
            {totalVolume.toLocaleString('en-AU')} kg volume
          </span>
        )}
      </div>

      {/* ── Exercise list ── */}
      <ul className="flex flex-col gap-3">
        {sessionExercises.map((se) => {
          const exercise = exerciseMap.get(se.exerciseId)
          const sets     = setsMap.get(se.id) ?? []
          if (!exercise) return null

          return (
            <li key={se.id} className="rounded-2xl bg-gray-800/60 px-3 py-3">
              <div className="flex items-center gap-2 mb-2">
                <MuscleIcon muscleGroup={exercise.muscleGroup} width={28} height={42} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-white truncate">{exercise.name}</p>
                  <p className="text-xs text-gray-400">{exercise.muscleGroup}</p>
                </div>
              </div>

              {sets.length > 0 ? (
                <div className="border-t border-gray-700 pt-2">
                  <div className="grid grid-cols-4 text-xs text-gray-500 font-medium mb-1 px-1">
                    <span>Set</span>
                    <span className="text-center">Reps</span>
                    <span className="text-center">Weight</span>
                    <span className="text-center">RPE/RIR</span>
                  </div>
                  {sets.map((s) => (
                    <Fragment key={s.id}>
                      <div className={[
                        'grid grid-cols-4 text-sm py-1 px-1 rounded',
                        s.isWarmup ? 'text-gray-500' : 'text-white',
                      ].join(' ')}>
                        <span className="font-medium">{s.isWarmup ? 'W' : s.setNumber}</span>
                        <span className="text-center">{s.reps}</span>
                        <span className="text-center">{s.weight} kg</span>
                        <span className="text-center text-xs text-gray-400">
                          {s.rpe != null ? `${s.rpe}` : '—'}{s.rir != null ? `/${s.rir}` : ''}
                        </span>
                      </div>
                      {s.notes && (
                        <p className="text-xs text-gray-500 px-1 -mt-0.5 pb-0.5">{s.notes}</p>
                      )}
                    </Fragment>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 pt-1">No sets logged.</p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
