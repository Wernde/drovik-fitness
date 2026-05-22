/**
 * Exercises — the exercise library screen.
 *
 * Shows all exercises (seeded + custom), filterable by category and searchable
 * by name. You can add, edit, or delete any exercise.
 *
 * useLiveQuery from dexie-react-hooks makes the list re-render automatically
 * whenever the underlying IndexedDB data changes — no manual refresh needed.
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, type Exercise, type ExerciseCategory } from '../db/db'
import ExerciseForm from '../components/ExerciseForm'
import MuscleIcon from '../components/MuscleIcon'
import { getYouTubeId, getYouTubeThumbnail } from '../lib/youtube'

// ── Category filter config ─────────────────────────────────────────────────────

type FilterCategory = 'all' | ExerciseCategory

const FILTERS: { value: FilterCategory; label: string }[] = [
  { value: 'all',        label: 'All' },
  { value: 'barbell',    label: 'Barbell' },
  { value: 'dumbbell',   label: 'Dumbbell' },
  { value: 'machine',    label: 'Machine' },
  { value: 'cable',      label: 'Cable' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'band',       label: 'Band' },
  { value: 'cardio',     label: 'Cardio' },
]

// Colour coding so you can tell categories apart at a glance.
const CATEGORY_COLOURS: Record<ExerciseCategory, string> = {
  barbell:    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  dumbbell:   'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  machine:    'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  cable:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  bodyweight: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  kettlebell: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  band:       'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300',
  cardio:     'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
}

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  barbell:    'Barbell',
  dumbbell:   'Dumbbell',
  machine:    'Machine',
  cable:      'Cable',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band:       'Band',
  cardio:     'Cardio',
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Exercises() {
  const [search, setSearch]             = useState('')
  const [filter, setFilter]             = useState<FilterCategory>('all')
  const [formOpen, setFormOpen]         = useState(false)
  const [editing, setEditing]           = useState<Exercise | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null) // exercise id

  // useLiveQuery re-runs whenever the exercises table changes.
  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => !e.deleted).toArray(),
    [],
  )

  if (!exercises) {
    // Dexie is still opening the database — show a brief loading state.
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        Loading…
      </div>
    )
  }

  // Apply category filter and search client-side (fast enough for ~200 exercises).
  const filtered = exercises
    .filter((e) => filter === 'all' || e.category === filter)
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  function openAdd() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(exercise: Exercise) {
    setEditing(exercise)
    setFormOpen(true)
  }

  async function handleDelete(id: string) {
    // Soft-delete: mark as deleted rather than removing the row.
    // The sync layer (Phase 3) will push this deletion to Supabase.
    await db.exercises.update(id, {
      deleted: true,
      updatedAt: now(),
      syncedAt: null,
    })
    setConfirmDelete(null)
  }

  return (
    <div className="p-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Exercises</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 rounded-lg bg-sky-500 text-white px-3 py-1.5 text-sm font-semibold active:bg-sky-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add
        </button>
      </div>

      {/* ── Search ── */}
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
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* ── Category filter pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={[
              'flex-none rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors',
              filter === value
                ? 'bg-sky-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Count ── */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        {filtered.length} {filtered.length === 1 ? 'exercise' : 'exercises'}
      </p>

      {/* ── Exercise list ── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
          {search ? `No results for "${search}"` : 'No exercises in this category.'}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((exercise) => (
            <li key={exercise.id}>
              {/* Normal row */}
              {confirmDelete !== exercise.id ? (
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
                  {/* Muscle group diagram */}
                  <MuscleIcon muscleGroup={exercise.muscleGroup} width={32} height={48} />

                  {/* Name + muscle group */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{exercise.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{exercise.muscleGroup}</p>
                  </div>

                  {/* YouTube play button — only shown when a video URL is set */}
                  {exercise.videoUrl && (() => {
                    const vid   = getYouTubeId(exercise.videoUrl)
                    const thumb = vid ? getYouTubeThumbnail(vid) : null
                    return thumb ? (
                      <a
                        href={exercise.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
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

                  {/* Category badge */}
                  <span className={`flex-none text-xs font-medium rounded-full px-2 py-0.5 ${CATEGORY_COLOURS[exercise.category]}`}>
                    {CATEGORY_LABELS[exercise.category]}
                  </span>

                  {/* Edit button */}
                  <button
                    onClick={() => openEdit(exercise)}
                    className="flex-none text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 p-1"
                    aria-label={`Edit ${exercise.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                  </button>

                  {/* Delete button — first tap shows confirmation inline */}
                  <button
                    onClick={() => setConfirmDelete(exercise.id)}
                    className="flex-none text-gray-400 hover:text-red-500 p-1"
                    aria-label={`Delete ${exercise.name}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                /* Inline delete confirmation — replaces the row */
                <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                  <p className="flex-1 text-sm text-red-700 dark:text-red-300">
                    Delete <strong>{exercise.name}</strong>?
                  </p>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(exercise.id)}
                    className="text-xs font-semibold text-white bg-red-500 rounded-lg px-3 py-1 active:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Add/Edit modal ── */}
      {formOpen && (
        <ExerciseForm
          exercise={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(undefined)
          }}
        />
      )}
    </div>
  )
}
