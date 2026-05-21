/**
 * WorkoutLogger — the active workout screen.
 *
 * Shows every exercise in the session with its logged sets.
 * Tap "Log Set" on any exercise to enter reps / weight / RPE / RIR.
 * The form stays open after each save so you can log multiple sets quickly.
 * Tap "Finish" to close the session.
 */

import { useState, useMemo, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { WorkoutSession, SessionExercise, LoggedSet, DayExercise, Exercise } from '../db/db'
import ExercisePicker from './ExercisePicker'
import MuscleIcon from './MuscleIcon'
import { getYouTubeId, getYouTubeThumbnail } from '../lib/youtube'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Tries to extract the first number from a reps string like "8–12" or "AMRAP".
function parseFirstRep(targetReps: string): string {
  const match = targetReps.match(/\d+/)
  return match ? match[0] : ''
}

// ── Set entry form ─────────────────────────────────────────────────────────────

interface SetEntryProps {
  sessionExercise:  SessionExercise
  nextSetNumber:    number
  lastSet?:         LoggedSet
  targetWeight?:    number | null
  targetReps?:      string
  onSaved:          () => void
}

function SetEntryForm({ sessionExercise, nextSetNumber, lastSet, targetWeight, targetReps, onSaved }: SetEntryProps) {
  const [reps,     setReps]     = useState(lastSet ? String(lastSet.reps) : (targetReps ? parseFirstRep(targetReps) : ''))
  const [weight,   setWeight]   = useState(lastSet ? String(lastSet.weight) : (targetWeight != null ? String(targetWeight) : ''))
  const [isWarmup, setIsWarmup] = useState(false)
  const [showRpe,  setShowRpe]  = useState(false)
  const [rpe,      setRpe]      = useState(lastSet?.rpe != null ? String(lastSet.rpe) : '')
  const [rir,      setRir]      = useState(lastSet?.rir != null ? String(lastSet.rir) : '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  async function handleSave() {
    const repsNum   = parseInt(reps, 10)
    const weightNum = parseFloat(weight)

    if (isNaN(repsNum) || repsNum < 1)  { setError('Enter reps.'); return }
    if (isNaN(weightNum) || weightNum < 0) { setError('Enter weight (use 0 for bodyweight).'); return }

    const rpeNum = rpe.trim() ? parseFloat(rpe) : null
    const rirNum = rir.trim() ? parseInt(rir, 10) : null

    setSaving(true)
    setError('')

    try {
      const timestamp = now()
      await db.sets.add({
        id:                  crypto.randomUUID(),
        sessionExerciseId:   sessionExercise.id,
        setNumber:           nextSetNumber,
        reps:                repsNum,
        weight:              weightNum,
        rpe:                 rpeNum,
        rir:                 rirNum,
        notes:               '',
        isWarmup,
        createdAt:           timestamp,
        updatedAt:           timestamp,
        syncedAt:            null,
        deleted:             false,
      })
      onSaved()
    } catch {
      setError('Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 p-3 rounded-xl bg-white dark:bg-gray-900 border border-sky-200 dark:border-sky-800">
      {/* Reps × Weight row */}
      <div className="flex items-center gap-2 mb-2">
        {/* Warmup toggle */}
        <button
          onClick={() => setIsWarmup((v) => !v)}
          className={[
            'flex-none w-8 h-8 rounded-lg text-xs font-bold transition-colors',
            isWarmup
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400',
          ].join(' ')}
          title="Warmup set"
        >
          W
        </button>

        <div className="flex-1 flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="Reps"
            min={1}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <span className="text-gray-400 text-sm flex-none">×</span>
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="kg"
            min={0}
            step={0.5}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <span className="text-gray-400 text-xs flex-none">kg</span>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-none w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center active:bg-sky-600 disabled:opacity-50"
          aria-label="Save set"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Optional RPE / RIR */}
      {!showRpe ? (
        <button
          onClick={() => setShowRpe(true)}
          className="text-xs text-gray-400 hover:text-sky-500"
        >
          + Add RPE / RIR
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-gray-500 flex-none">RPE</span>
            <input
              type="number"
              inputMode="decimal"
              value={rpe}
              onChange={(e) => setRpe(e.target.value)}
              placeholder="1–10"
              min={1} max={10} step={0.5}
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
          <div className="flex items-center gap-1 flex-1">
            <span className="text-xs text-gray-500 flex-none">RIR</span>
            <input
              type="number"
              inputMode="numeric"
              value={rir}
              onChange={(e) => setRir(e.target.value)}
              placeholder="0–5"
              min={0} max={5}
              className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Logged set row ─────────────────────────────────────────────────────────────

function SetRow({ set, onDelete }: { set: LoggedSet; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={[
        'w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-none',
        set.isWarmup
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
          : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
      ].join(' ')}>
        {set.isWarmup ? 'W' : set.setNumber}
      </span>
      <span className="flex-1 text-sm">
        {set.reps} × {set.weight} kg
        {set.rpe != null && <span className="text-gray-400 text-xs ml-1">RPE {set.rpe}</span>}
        {set.rir != null && <span className="text-gray-400 text-xs ml-1">RIR {set.rir}</span>}
      </span>
      <button
        onClick={onDelete}
        className="flex-none text-gray-300 dark:text-gray-600 hover:text-red-400 p-0.5"
        aria-label="Delete set"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  session: WorkoutSession
}

type SessionData = {
  sessionExercises: SessionExercise[]
  exerciseMap:      Map<string, Exercise>
  setsMap:          Map<string, LoggedSet[]>   // keyed by sessionExerciseId
  dayExerciseMap:   Map<string, DayExercise>   // keyed by exerciseId
}

export default function WorkoutLogger({ session }: Props) {
  const [activeSeId, setActiveSeId]   = useState<string | null>(null)
  const [showPicker, setShowPicker]   = useState(false)
  const [finishing,  setFinishing]    = useState(false)
  const [elapsed,    setElapsed]      = useState(0)

  // Elapsed timer — ticks every second.
  useEffect(() => {
    const start = new Date(session.startedAt).getTime()
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.startedAt])

  // One compound query to get everything we need to render the active workout.
  const data = useLiveQuery<SessionData>(async () => {
    const ses = await db.sessionExercises
      .where('workoutSessionId').equals(session.id)
      .filter((se) => !se.deleted)
      .toArray()
    ses.sort((a, b) => a.order - b.order)

    const seIds = ses.map((se) => se.id)
    const sets  = seIds.length > 0
      ? await db.sets
          .where('sessionExerciseId').anyOf(seIds)
          .filter((s) => !s.deleted)
          .toArray()
      : []

    const exerciseIds = [...new Set(ses.map((se) => se.exerciseId))]
    const exercises   = exerciseIds.length > 0
      ? await db.exercises.where('id').anyOf(exerciseIds).toArray()
      : []

    let dayExercises: DayExercise[] = []
    if (session.workoutDayId) {
      dayExercises = await db.dayExercises
        .where('workoutDayId').equals(session.workoutDayId)
        .filter((de) => !de.deleted)
        .toArray()
    }

    const setsMap = new Map<string, LoggedSet[]>()
    for (const s of sets) {
      const list = setsMap.get(s.sessionExerciseId) ?? []
      list.push(s)
      setsMap.set(s.sessionExerciseId, list)
    }
    for (const [k, v] of setsMap) {
      v.sort((a, b) => a.setNumber - b.setNumber)
      setsMap.set(k, v)
    }

    return {
      sessionExercises: ses,
      exerciseMap:      new Map(exercises.map((e) => [e.id, e])),
      setsMap,
      dayExerciseMap:   new Map(dayExercises.map((de) => [de.exerciseId, de])),
    }
  }, [session.id, session.workoutDayId])

  const existingExerciseIds = useMemo(
    () => new Set(data?.sessionExercises.map((se) => se.exerciseId) ?? []),
    [data],
  )

  async function addExercise(exercise: Exercise) {
    setShowPicker(false)
    const timestamp = now()
    const nextOrder = (data?.sessionExercises.length ?? 0)
    await db.sessionExercises.add({
      id:               crypto.randomUUID(),
      workoutSessionId: session.id,
      exerciseId:       exercise.id,
      order:            nextOrder,
      notes:            '',
      createdAt:        timestamp,
      updatedAt:        timestamp,
      syncedAt:         null,
      deleted:          false,
    })
  }

  async function deleteSet(setId: string) {
    await db.sets.update(setId, { deleted: true, updatedAt: now(), syncedAt: null })
  }

  async function removeExercise(seId: string) {
    await db.sessionExercises.update(seId, { deleted: true, updatedAt: now(), syncedAt: null })
    if (activeSeId === seId) setActiveSeId(null)
  }

  async function finishWorkout() {
    setFinishing(true)
    await db.workoutSessions.update(session.id, {
      finishedAt: now(),
      updatedAt:  now(),
      syncedAt:   null,
    })
  }

  if (!data) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  const { sessionExercises, exerciseMap, setsMap, dayExerciseMap } = data

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold truncate">
            {session.workoutDayId
              ? (exerciseMap.size > 0 ? Array.from(exerciseMap.values())[0]?.name ? '' : '' : '')
              : 'Workout'}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">{formatElapsed(elapsed)}</p>
        </div>
        <button
          onClick={finishWorkout}
          disabled={finishing}
          className="rounded-lg bg-emerald-500 text-white px-4 py-2 text-sm font-semibold active:bg-emerald-600 disabled:opacity-60"
        >
          {finishing ? 'Finishing…' : 'Finish'}
        </button>
      </div>

      {/* Exercise list */}
      {sessionExercises.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 mb-4">
          Tap <strong>Add Exercise</strong> to get started.
        </div>
      ) : (
        <ul className="flex flex-col gap-3 mb-4">
          {sessionExercises.map((se) => {
            const exercise   = exerciseMap.get(se.exerciseId)
            const sets       = setsMap.get(se.id) ?? []
            const workingSets = sets.filter((s) => !s.isWarmup)
            const lastSet    = sets.length > 0 ? sets[sets.length - 1] : undefined
            const dayEx      = dayExerciseMap.get(se.exerciseId)
            const isActive   = activeSeId === se.id
            const nextSetNum = workingSets.length + 1

            if (!exercise) return null

            return (
              <li key={se.id} className="rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-3">
                {/* Exercise header */}
                <div className="flex items-center gap-2 mb-2">
                  <MuscleIcon muscleGroup={exercise.muscleGroup} width={28} height={42} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{exercise.name}</p>
                    {dayEx && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Target: {dayEx.targetSets} × {dayEx.targetReps}
                        {dayEx.targetWeight != null ? ` @ ${dayEx.targetWeight} kg` : ''}
                      </p>
                    )}
                  </div>

                  {/* YouTube thumbnail — opens video in browser */}
                  {exercise.videoUrl && (() => {
                    const vid   = getYouTubeId(exercise.videoUrl)
                    const thumb = vid ? getYouTubeThumbnail(vid) : null
                    return thumb ? (
                      <a
                        href={exercise.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-none relative rounded overflow-hidden w-14 h-10"
                        aria-label={`Watch ${exercise.name} demo`}
                      >
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5 drop-shadow">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </a>
                    ) : null
                  })()}
                  <button
                    onClick={() => removeExercise(se.id)}
                    className="flex-none text-gray-300 dark:text-gray-600 hover:text-red-400 p-1"
                    aria-label={`Remove ${exercise.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>

                {/* Logged sets */}
                {sets.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mb-2">
                    {sets.map((s) => (
                      <SetRow key={s.id} set={s} onDelete={() => deleteSet(s.id)} />
                    ))}
                  </div>
                )}

                {/* Log set button or entry form */}
                {isActive ? (
                  <SetEntryForm
                    sessionExercise={se}
                    nextSetNumber={nextSetNum}
                    lastSet={lastSet}
                    targetWeight={dayEx?.targetWeight}
                    targetReps={dayEx?.targetReps}
                    onSaved={() => {
                      // Keep form open for next set — just reset via key change
                      setActiveSeId(null)
                      requestAnimationFrame(() => setActiveSeId(se.id))
                    }}
                  />
                ) : (
                  <button
                    onClick={() => setActiveSeId(se.id)}
                    className="w-full rounded-lg border border-dashed border-sky-300 dark:border-sky-700 text-sky-500 dark:text-sky-400 text-xs font-semibold py-2 active:bg-sky-50 dark:active:bg-sky-900/20"
                  >
                    + Log Set
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Add exercise */}
      <button
        onClick={() => setShowPicker(true)}
        className="w-full rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 text-sm font-medium py-4 active:bg-gray-50 dark:active:bg-gray-800/40"
      >
        + Add Exercise
      </button>

      {showPicker && (
        <ExercisePicker
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
          existingIds={existingExerciseIds}
        />
      )}
    </div>
  )
}
