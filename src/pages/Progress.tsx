/**
 * Progress — charts and personal records.
 *
 * Three tabs:
 *   Lifts     — pick any exercise, see estimated 1RM over time + best set history
 *   Body weight — log and chart body weight over time
 *   PRs       — personal records (heaviest weight and best estimated 1RM per exercise)
 *
 * Estimated 1RM uses the Epley formula: weight × (1 + reps / 30)
 */

import { useState, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { db, now, today } from '../db/db'
import type { Exercise } from '../db/db'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Epley estimated 1-rep max. */
function epley(weight: number, reps: number) {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

function shortDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── Lift chart tab ────────────────────────────────────────────────────────────

function LiftChartTab({ exercises }: { exercises: Exercise[] }) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [search,     setSearch]     = useState('')

  const filteredEx = exercises
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  // Chart data: best estimated 1RM per session date for the selected exercise.
  const chartData = useLiveQuery(async () => {
    if (!selectedId) return []

    // Find all session exercises for this exercise.
    const sessionExercises = await db.sessionExercises
      .where('exerciseId').equals(selectedId)
      .filter((se) => !se.deleted)
      .toArray()

    if (sessionExercises.length === 0) return []

    const seIds = sessionExercises.map((se) => se.id)

    // Fetch all working sets for those session exercises.
    const sets = await db.sets
      .where('sessionExerciseId').anyOf(seIds)
      .filter((s) => !s.deleted && !s.isWarmup && s.reps > 0 && s.weight > 0)
      .toArray()

    // Map each set to its session date.
    const sessionIds = [...new Set(sessionExercises.map((se) => se.workoutSessionId))]
    const sessions   = await db.workoutSessions
      .where('id').anyOf(sessionIds)
      .filter((s) => !s.deleted && s.finishedAt !== null)
      .toArray()

    const sessionDateMap = new Map(sessions.map((s) => [s.id, s.date]))
    const seSessionMap   = new Map(sessionExercises.map((se) => [se.id, se.workoutSessionId]))

    // Group sets by date, keep best e1RM per date.
    const byDate = new Map<string, number>()
    for (const s of sets) {
      const seId      = s.sessionExerciseId
      const sessionId = seSessionMap.get(seId)
      const date      = sessionId ? sessionDateMap.get(sessionId) : undefined
      if (!date) continue

      const e1rm = epley(s.weight, s.reps)
      if (!byDate.has(date) || byDate.get(date)! < e1rm) {
        byDate.set(date, e1rm)
      }
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, e1rm]) => ({ date: shortDate(date), e1rm }))
  }, [selectedId])

  return (
    <div>
      {/* Exercise search */}
      <div className="relative mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
      </div>

      {/* Exercise picker list */}
      {!selectedId && (
        <ul className="flex flex-col gap-1 mb-4 max-h-64 overflow-y-auto">
          {filteredEx.length === 0 ? (
            <li className="text-center text-gray-400 text-sm py-4">No exercises found.</li>
          ) : filteredEx.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => { setSelectedId(e.id); setSearch('') }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-lime-950 dark:active:bg-lime-900/20"
              >
                {e.name}
                <span className="ml-2 text-xs text-gray-400">{e.muscleGroup}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Chart */}
      {selectedId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">
              {exercises.find((e) => e.id === selectedId)?.name}
            </p>
            <button
              onClick={() => setSelectedId('')}
              className="text-xs text-lime-400 hover:text-lime-500"
            >
              Change
            </button>
          </div>

          {!chartData || chartData.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
              No data yet. Log some sets to see your progress.
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
              <p className="text-xs text-gray-400 mb-2">Estimated 1RM (kg) over time</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(val: number) => [`${val} kg`, 'Est. 1RM']}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="e1rm"
                    stroke="#a3e635"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#a3e635' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Body weight tab ───────────────────────────────────────────────────────────

function BodyWeightTab() {
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const logs = useLiveQuery(
    () => db.bodyWeightLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => list.sort((a, b) => a.date.localeCompare(b.date))),
    [],
  )

  const chartData = (logs ?? []).map((l) => ({
    date:   shortDate(l.date),
    weight: l.weight,
  }))

  async function handleLog() {
    const val = parseFloat(weight)
    if (isNaN(val) || val <= 0) { setError('Enter a valid weight in kg.'); return }

    setSaving(true)
    setError('')
    try {
      const timestamp = now()
      const todayStr  = today()

      // If there's already an entry for today, update it.
      const existing = await db.bodyWeightLogs
        .filter((l) => l.date === todayStr && !l.deleted)
        .first()

      if (existing) {
        await db.bodyWeightLogs.update(existing.id, {
          weight:    val,
          updatedAt: timestamp,
          syncedAt:  null,
        })
      } else {
        await db.bodyWeightLogs.add({
          id:        crypto.randomUUID(),
          date:      todayStr,
          weight:    val,
          notes:     '',
          createdAt: timestamp,
          updatedAt: timestamp,
          syncedAt:  null,
          deleted:   false,
        })
      }

      setWeight('')
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Log today's weight */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Today's weight (kg)"
            min={0}
            step={0.1}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
        <button
          onClick={handleLog}
          disabled={saving}
          className="flex-none rounded-lg bg-lime-400 text-gray-900 px-4 py-2 text-sm font-semibold active:bg-lime-500 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Log'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {/* Chart */}
      {!logs ? null : logs.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
          No entries yet. Log your weight above.
        </div>
      ) : (
        <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 p-3">
          <p className="text-xs text-gray-400 mb-2">Body weight (kg)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(val: number) => [`${val} kg`, 'Weight']}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#a3e635"
                strokeWidth={2}
                dot={{ r: 3, fill: '#a3e635' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Recent entries */}
          <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <ul className="flex flex-col gap-1">
              {[...logs].reverse().slice(0, 10).map((l) => (
                <li key={l.id} className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{shortDate(l.date)}</span>
                  <span className="font-medium">{l.weight} kg</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PRs tab ───────────────────────────────────────────────────────────────────

function PRsTab({ exercises }: { exercises: Exercise[] }) {
  const prs = useLiveQuery(async () => {
    // For every exercise that has been logged, find the best set (highest e1RM).
    const allSets = await db.sets
      .filter((s) => !s.deleted && !s.isWarmup && s.reps > 0 && s.weight > 0)
      .toArray()

    const allSes = await db.sessionExercises
      .filter((se) => !se.deleted)
      .toArray()

    const seExerciseMap = new Map(allSes.map((se) => [se.id, se.exerciseId]))

    // Track best e1RM and best weight per exercise.
    const bestE1rm:   Map<string, number> = new Map()
    const bestWeight: Map<string, number> = new Map()
    const bestReps:   Map<string, number> = new Map()

    for (const s of allSets) {
      const exerciseId = seExerciseMap.get(s.sessionExerciseId)
      if (!exerciseId) continue

      const e1rm = epley(s.weight, s.reps)

      if (!bestE1rm.has(exerciseId) || e1rm > bestE1rm.get(exerciseId)!) {
        bestE1rm.set(exerciseId, e1rm)
        bestWeight.set(exerciseId, s.weight)
        bestReps.set(exerciseId, s.reps)
      }
    }

    return { bestE1rm, bestWeight, bestReps }
  }, [])

  if (!prs) return <div className="flex items-center justify-center h-20 text-gray-400">Loading…</div>

  const { bestE1rm, bestWeight, bestReps } = prs

  if (bestE1rm.size === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400 text-sm">
        No PRs yet. Start logging workouts to track your personal records.
      </div>
    )
  }

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))

  const sorted = [...bestE1rm.entries()]
    .map(([id, e1rm]) => ({
      exercise: exerciseMap.get(id),
      e1rm,
      weight: bestWeight.get(id)!,
      reps:   bestReps.get(id)!,
    }))
    .filter((r) => r.exercise)
    .sort((a, b) => a.exercise!.name.localeCompare(b.exercise!.name))

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map(({ exercise, e1rm, weight, reps }) => (
        <li key={exercise!.id} className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{exercise!.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{exercise!.muscleGroup}</p>
          </div>
          <div className="text-right flex-none">
            <p className="text-sm font-semibold text-lime-400">{e1rm} kg e1RM</p>
            <p className="text-xs text-gray-400">{weight} kg × {reps}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Main Progress page ────────────────────────────────────────────────────────

type Tab = 'lifts' | 'bodyweight' | 'prs'

const TABS: { value: Tab; label: string }[] = [
  { value: 'lifts',      label: 'Lifts' },
  { value: 'bodyweight', label: 'Body Weight' },
  { value: 'prs',        label: 'PRs' },
]

export default function Progress() {
  const [tab, setTab] = useState<Tab>('lifts')

  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => !e.deleted).toArray(),
    [],
  )

  if (!exercises) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Progress</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={[
              'flex-1 rounded-lg py-2 text-xs font-semibold transition-colors',
              tab === value
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'lifts'      && <LiftChartTab exercises={exercises} />}
      {tab === 'bodyweight' && <BodyWeightTab />}
      {tab === 'prs'        && <PRsTab exercises={exercises} />}
    </div>
  )
}
