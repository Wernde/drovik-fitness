/**
 * ProgramDetail — shows the workout days inside a program.
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { WorkoutDay } from '../db/db'
import DayForm from '../components/DayForm'

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>()
  const navigate       = useNavigate()

  const [dayFormOpen,   setDayFormOpen]   = useState(false)
  const [editingDay,    setEditingDay]    = useState<WorkoutDay | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const program = useLiveQuery(
    () => (programId ? db.programs.get(programId) : undefined),
    [programId],
  )

  const days = useLiveQuery(
    () => programId
      ? db.workoutDays
          .where('programId').equals(programId)
          .filter((d) => !d.deleted)
          .toArray()
          .then((list) => list.sort((a, b) => a.order - b.order))
      : [],
    [programId],
  )

  const exerciseCounts = useLiveQuery(
    () => db.dayExercises.filter((de) => !de.deleted).toArray(),
    [],
  )

  if (!program || !days || !exerciseCounts) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  if (program.deleted) {
    navigate('/programs', { replace: true })
    return null
  }

  const exerciseCountMap = exerciseCounts.reduce<Record<string, number>>((acc, de) => {
    acc[de.workoutDayId] = (acc[de.workoutDayId] ?? 0) + 1
    return acc
  }, {})

  const nextOrder = days.length > 0 ? Math.max(...days.map((d) => d.order)) + 1 : 0

  async function moveDay(day: WorkoutDay, direction: 'up' | 'down') {
    const idx     = days.findIndex((d) => d.id === day.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= days.length) return
    const swap      = days[swapIdx]
    const timestamp = now()
    await Promise.all([
      db.workoutDays.update(day.id,  { order: swap.order, updatedAt: timestamp, syncedAt: null }),
      db.workoutDays.update(swap.id, { order: day.order,  updatedAt: timestamp, syncedAt: null }),
    ])
  }

  async function handleDelete(id: string) {
    await db.workoutDays.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
    setConfirmDelete(null)
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-1">
        <button
          onClick={() => navigate('/programs')}
          className="flex-none text-gray-500 active:text-white p-1 -ml-1"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">{program.name}</h1>
          {program.description ? (
            <p className="text-xs text-gray-400 mt-0.5">{program.description}</p>
          ) : null}
        </div>
        <button
          onClick={() => { setDayFormOpen(true); setEditingDay(undefined) }}
          className="flex items-center gap-1 rounded-2xl bg-lime-400 text-gray-900 px-3 py-1.5 text-sm font-semibold active:bg-lime-500 flex-none"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add Day
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-5 ml-8">
        {days.length} {days.length === 1 ? 'day' : 'days'}
      </p>

      {days.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-700 p-8 text-center text-gray-500">
          No days yet. Tap <strong className="text-gray-300">Add Day</strong> to get started.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {days.map((day, idx) => (
            <li key={day.id}>
              {confirmDelete !== day.id ? (
                <div className="flex items-center gap-2 rounded-2xl bg-gray-800/60 px-3 py-3">
                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveDay(day, 'up')}
                      disabled={idx === 0}
                      className="text-gray-600 disabled:opacity-30 active:text-gray-300 p-0.5"
                      aria-label="Move up"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveDay(day, 'down')}
                      disabled={idx === days.length - 1}
                      className="text-gray-600 disabled:opacity-30 active:text-gray-300 p-0.5"
                      aria-label="Move down"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>

                  {/* Day name — tap to open */}
                  <button
                    onClick={() => navigate(`/programs/${programId}/days/${day.id}`)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="font-semibold text-sm text-white truncate">{day.name}</p>
                    <p className="text-xs text-gray-400">
                      {exerciseCountMap[day.id] ?? 0} {(exerciseCountMap[day.id] ?? 0) === 1 ? 'exercise' : 'exercises'}
                    </p>
                  </button>

                  {/* Rename */}
                  <button
                    onClick={() => { setEditingDay(day); setDayFormOpen(true) }}
                    className="flex-none text-gray-600 active:text-lime-400 p-1"
                    aria-label={`Rename ${day.name}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(day.id)}
                    className="flex-none text-gray-600 active:text-red-400 p-1"
                    aria-label={`Delete ${day.name}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-red-800 bg-red-900/20 px-4 py-3">
                  <p className="flex-1 text-sm text-red-300">Delete <strong>{day.name}</strong>?</p>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 px-2 py-1">Cancel</button>
                  <button onClick={() => handleDelete(day.id)} className="text-xs font-semibold text-white bg-red-500 rounded-xl px-3 py-1.5 active:bg-red-600">Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {dayFormOpen && (
        <DayForm
          programId={programId!}
          day={editingDay}
          nextOrder={nextOrder}
          onClose={() => { setDayFormOpen(false); setEditingDay(undefined) }}
        />
      )}
    </div>
  )
}
