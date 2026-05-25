/**
 * WorkoutSummary — slide-up modal shown when the user taps "Finish".
 *
 * Computes stats from the current session (duration, volume, sets per
 * muscle group, new PRs) and presents them before committing finishedAt.
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { WorkoutSession } from '../db/db'

// ── Helpers ───────────────────────────────────────────────────────────────────

function epley(weight: number, reps: number) {
  return reps === 1 ? weight : Math.round(weight * (1 + reps / 30) * 10) / 10
}

function formatDur(startedAt: string) {
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  session:   WorkoutSession
  onFinish:  () => void   // called when user confirms finish
  onBack:    () => void   // called when user wants to keep going
}

export default function WorkoutSummary({ session, onFinish, onBack }: Props) {
  const summary = useLiveQuery(async () => {
    // ── Fetch session exercises and their sets ────────────────────────────────
    const ses = await db.sessionExercises
      .where('workoutSessionId').equals(session.id)
      .filter((se) => !se.deleted)
      .toArray()

    const seIds = ses.map((se) => se.id)
    const allSets = seIds.length > 0
      ? await db.sets
          .where('sessionExerciseId').anyOf(seIds)
          .filter((s) => !s.deleted)
          .toArray()
      : []

    const workingSets = allSets.filter((s) => !s.isWarmup && s.reps > 0 && s.weight > 0)

    const totalVolume = workingSets.reduce((sum, s) => sum + s.weight * s.reps, 0)

    // ── Exercises and muscle groups ───────────────────────────────────────────
    const exerciseIds = [...new Set(ses.map((se) => se.exerciseId))]
    const exercises = exerciseIds.length > 0
      ? await db.exercises.where('id').anyOf(exerciseIds).toArray()
      : []
    const exerciseMap  = new Map(exercises.map((e) => [e.id, e]))
    const seExerciseMap = new Map(ses.map((se) => [se.id, se.exerciseId]))

    // Sets per muscle group
    const muscleSets = new Map<string, number>()
    for (const s of workingSets) {
      const exId   = seExerciseMap.get(s.sessionExerciseId)
      const muscle = exId ? exerciseMap.get(exId)?.muscleGroup : undefined
      if (muscle) muscleSets.set(muscle, (muscleSets.get(muscle) ?? 0) + 1)
    }
    const muscleList = [...muscleSets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // ── PR detection ──────────────────────────────────────────────────────────
    // For each exercise, find the best e1RM from this session, then compare
    // against all historical sets from OTHER sessions.

    const newPRs: Array<{ exerciseName: string; e1rm: number }> = []

    for (const se of ses) {
      const exId    = se.exerciseId
      const exSets  = workingSets.filter((s) => s.sessionExerciseId === se.id)
      if (exSets.length === 0) continue

      const sessionBest = Math.max(...exSets.map((s) => epley(s.weight, s.reps)))

      // All SessionExercises for this exercise in OTHER sessions
      const otherSes = await db.sessionExercises
        .where('exerciseId').equals(exId)
        .filter((other) => !other.deleted && other.workoutSessionId !== session.id)
        .toArray()

      if (otherSes.length === 0) {
        // First time ever logging this exercise — it's a PR if at least 1 set
        if (exSets.length > 0) {
          const ex = exerciseMap.get(exId)
          if (ex) newPRs.push({ exerciseName: ex.name, e1rm: sessionBest })
        }
        continue
      }

      const otherSeIds = otherSes.map((ose) => ose.id)
      const historicalSets = await db.sets
        .where('sessionExerciseId').anyOf(otherSeIds)
        .filter((s) => !s.deleted && !s.isWarmup && s.reps > 0 && s.weight > 0)
        .toArray()

      const historicalBest = historicalSets.length > 0
        ? Math.max(...historicalSets.map((s) => epley(s.weight, s.reps)))
        : 0

      if (sessionBest > historicalBest) {
        const ex = exerciseMap.get(exId)
        if (ex) newPRs.push({ exerciseName: ex.name, e1rm: sessionBest })
      }
    }

    return { workingSets: workingSets.length, totalVolume, muscleList, newPRs }
  }, [session.id])

  const dur = formatDur(session.startedAt)

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="w-full bg-gray-900 rounded-t-2xl shadow-xl p-6 pb-10 max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-3xl mb-1">🎉</p>
          <h2 className="text-xl font-bold text-white">Workout Complete!</h2>
          <p className="text-sm text-gray-400 mt-1">{dur}</p>
        </div>

        {summary ? (
          <div className="flex flex-col gap-4">
            {/* Volume + sets row */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-2xl bg-gray-800 px-4 py-3 text-center">
                <p className="text-xl font-bold text-lime-400 tabular-nums">
                  {summary.workingSets}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Working sets</p>
              </div>
              <div className="flex-1 rounded-2xl bg-gray-800 px-4 py-3 text-center">
                <p className="text-xl font-bold text-lime-400 tabular-nums">
                  {summary.totalVolume >= 1000
                    ? `${(summary.totalVolume / 1000).toFixed(1)}t`
                    : `${Math.round(summary.totalVolume)} kg`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Total volume</p>
              </div>
            </div>

            {/* Muscle groups */}
            {summary.muscleList.length > 0 && (
              <div className="rounded-2xl bg-gray-800 px-4 py-3">
                <p className="text-xs text-gray-400 mb-2">Muscle groups</p>
                <div className="flex flex-col gap-2">
                  {summary.muscleList.map(([muscle, count]) => {
                    const max = summary.muscleList[0][1]
                    return (
                      <div key={muscle} className="flex items-center gap-2">
                        <span className="text-xs text-gray-300 w-24 flex-none truncate">{muscle}</span>
                        <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-lime-400 rounded-full"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 flex-none w-12 text-right">
                          {count} set{count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PRs */}
            {summary.newPRs.length > 0 && (
              <div className="rounded-2xl bg-amber-900/20 border border-amber-700/30 px-4 py-3">
                <p className="text-xs text-amber-400 font-semibold mb-2">
                  🏆 {summary.newPRs.length} new PR{summary.newPRs.length !== 1 ? 's' : ''}!
                </p>
                <ul className="flex flex-col gap-1">
                  {summary.newPRs.map(({ exerciseName, e1rm }) => (
                    <li key={exerciseName} className="flex justify-between text-sm">
                      <span className="text-gray-300 truncate flex-1 mr-2">{exerciseName}</span>
                      <span className="text-amber-400 font-semibold flex-none">{e1rm} kg e1RM</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 text-gray-400 text-sm">
            Calculating…
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={onFinish}
            className="w-full rounded-2xl bg-lime-400 text-gray-900 py-3 font-semibold text-sm active:bg-lime-500"
          >
            Complete Workout
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-2xl border border-gray-700 text-gray-400 py-3 text-sm active:bg-gray-800"
          >
            Keep Going
          </button>
        </div>
      </div>
    </div>
  )
}
