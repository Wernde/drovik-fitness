/**
 * WorkoutSummary — slide-up modal shown when the user taps "Finish".
 */

import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { WorkoutSession } from '../db/db'
import { useUnits } from '../contexts/UnitsContext'
import { fmtVolume } from '../lib/units'

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
  onFinish:  () => void
  onBack:    () => void
}

export default function WorkoutSummary({ session, onFinish, onBack }: Props) {
  const { units } = useUnits()
  const summary = useLiveQuery(async () => {
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

    const exerciseIds = [...new Set(ses.map((se) => se.exerciseId))]
    const exercises = exerciseIds.length > 0
      ? await db.exercises.where('id').anyOf(exerciseIds).toArray()
      : []
    const exerciseMap   = new Map(exercises.map((e) => [e.id, e]))
    const seExerciseMap = new Map(ses.map((se) => [se.id, se.exerciseId]))

    const muscleSets = new Map<string, number>()
    for (const s of workingSets) {
      const exId   = seExerciseMap.get(s.sessionExerciseId)
      const muscle = exId ? exerciseMap.get(exId)?.muscleGroup : undefined
      if (muscle) muscleSets.set(muscle, (muscleSets.get(muscle) ?? 0) + 1)
    }
    const muscleList = [...muscleSets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    const newPRs: Array<{ exerciseName: string; e1rm: number }> = []

    for (const se of ses) {
      const exId    = se.exerciseId
      const exSets  = workingSets.filter((s) => s.sessionExerciseId === se.id)
      if (exSets.length === 0) continue

      const sessionBest = Math.max(...exSets.map((s) => epley(s.weight, s.reps)))

      const otherSes = await db.sessionExercises
        .where('exerciseId').equals(exId)
        .filter((other) => !other.deleted && other.workoutSessionId !== session.id)
        .toArray()

      if (otherSes.length === 0) {
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
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
      <div className="w-full bg-app-card rounded-t-2xl shadow-xl p-6 pb-10 max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-3xl mb-1">🎉</p>
          <h2 className="text-xl font-extrabold text-app-text">Workout Complete!</h2>
          <p className="text-sm text-app-muted mt-1">{dur}</p>
        </div>

        {summary ? (
          <div className="flex flex-col gap-4">
            {/* Volume + sets row */}
            <div className="flex gap-3">
              <div className="flex-1 rounded-2xl bg-app-bg border border-app-border px-4 py-3 text-center">
                <p className="text-xl font-bold text-accent-dark tabular-nums">
                  {summary.workingSets}
                </p>
                <p className="text-xs text-app-muted mt-0.5">Working sets</p>
              </div>
              <div className="flex-1 rounded-2xl bg-app-bg border border-app-border px-4 py-3 text-center">
                <p className="text-xl font-bold text-accent-dark tabular-nums">
                  {fmtVolume(summary.totalVolume, units.weight)}
                </p>
                <p className="text-xs text-app-muted mt-0.5">Total volume</p>
              </div>
            </div>

            {/* Muscle groups */}
            {summary.muscleList.length > 0 && (
              <div className="rounded-2xl bg-app-bg border border-app-border px-4 py-3">
                <p className="text-xs text-app-muted mb-2">Muscle groups</p>
                <div className="flex flex-col gap-2">
                  {summary.muscleList.map(([muscle, count]) => {
                    const max = summary.muscleList[0][1]
                    return (
                      <div key={muscle} className="flex items-center gap-2">
                        <span className="text-xs text-app-text w-24 flex-none truncate">{muscle}</span>
                        <div className="flex-1 h-1.5 bg-app-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-app-muted flex-none w-12 text-right">
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
              <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs text-amber-700 font-semibold mb-2">
                  🏆 {summary.newPRs.length} new PR{summary.newPRs.length !== 1 ? 's' : ''}!
                </p>
                <ul className="flex flex-col gap-1">
                  {summary.newPRs.map(({ exerciseName, e1rm }) => (
                    <li key={exerciseName} className="flex justify-between text-sm">
                      <span className="text-app-text truncate flex-1 mr-2">{exerciseName}</span>
                      <span className="text-amber-700 font-semibold flex-none">{e1rm} kg e1RM</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 text-app-muted text-sm">
            Calculating…
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-6">
          <button
            onClick={onFinish}
            className="w-full rounded-2xl bg-accent text-app-text py-3 font-bold text-sm active:bg-accent-dark"
          >
            Complete Workout
          </button>
          <button
            onClick={onBack}
            className="w-full rounded-2xl border border-app-border text-app-muted py-3 text-sm active:bg-app-bg"
          >
            Keep Going
          </button>
        </div>
      </div>
    </div>
  )
}
