/**
 * Exercises — exercise library screen.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, type Exercise, type ExerciseCategory } from '../db/db'
import ExerciseForm from '../components/ExerciseForm'
import MuscleIcon from '../components/MuscleIcon'
import { getYouTubeId, getYouTubeThumbnail } from '../lib/youtube'

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

const ACCENT: Record<ExerciseCategory, string> = {
  barbell:    'border-amber-400',
  dumbbell:   'border-accent',
  machine:    'border-violet-400',
  cable:      'border-emerald-400',
  bodyweight: 'border-orange-400',
  kettlebell: 'border-teal-400',
  band:       'border-pink-400',
  cardio:     'border-red-400',
}

const BADGE: Record<ExerciseCategory, string> = {
  barbell:    'bg-amber-50 text-amber-700',
  dumbbell:   'bg-accent-light text-accent-dark',
  machine:    'bg-violet-50 text-violet-700',
  cable:      'bg-emerald-50 text-emerald-700',
  bodyweight: 'bg-orange-50 text-orange-700',
  kettlebell: 'bg-teal-50 text-teal-700',
  band:       'bg-pink-50 text-pink-700',
  cardio:     'bg-red-50 text-red-700',
}

const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine',
  cable: 'Cable', bodyweight: 'Bodyweight', kettlebell: 'Kettlebell',
  band: 'Band', cardio: 'Cardio',
}

export default function Exercises() {
  const navigate = useNavigate()
  const [search,        setSearch]        = useState('')
  const [filter,        setFilter]        = useState<FilterCategory>('all')
  const [muscleFilter,  setMuscleFilter]  = useState('all')
  const [formOpen,      setFormOpen]      = useState(false)
  const [editing,       setEditing]       = useState<Exercise | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => !e.deleted).toArray(), [],
  )

  if (!exercises) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const categoryFiltered = exercises.filter((e) => filter === 'all' || e.category === filter)
  const muscleGroups = ['all', ...Array.from(
    new Set(categoryFiltered.map((e) => e.muscleGroup))
  ).sort()]

  const activeMuscle = muscleGroups.includes(muscleFilter) ? muscleFilter : 'all'

  const filtered = categoryFiltered
    .filter((e) => activeMuscle === 'all' || e.muscleGroup === activeMuscle)
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  function openAdd() { setEditing(undefined); setFormOpen(true) }
  function openEdit(ex: Exercise) { setEditing(ex); setFormOpen(true) }

  async function handleDelete(id: string) {
    await db.exercises.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
    setConfirmDelete(null)
  }

  return (
    <div className="px-4 pt-6 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex-none w-9 h-9 rounded-full bg-app-bg border border-app-border flex items-center justify-center text-app-muted active:bg-app-border"
          aria-label="Back"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
        <h1 className="flex-1 text-2xl font-extrabold text-app-text">Exercises</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 rounded-2xl bg-accent text-app-text px-4 py-2 text-sm font-bold active:bg-accent-dark"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Add
        </button>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4">
        <svg viewBox="0 0 20 20" fill="currentColor"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-faint pointer-events-none">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full rounded-2xl border border-app-border bg-app-card text-app-text placeholder-app-faint pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* ── Category filter pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2 scrollbar-hide -mx-4 px-4">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setFilter(value); setMuscleFilter('all') }}
            className={[
              'flex-none rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap',
              filter === value
                ? 'bg-accent text-app-text'
                : 'bg-app-card border border-app-border text-app-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Muscle group filter pills ── */}
      {muscleGroups.length > 2 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide -mx-4 px-4">
          {muscleGroups.map((mg) => (
            <button
              key={mg}
              onClick={() => setMuscleFilter(mg)}
              className={[
                'flex-none rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap',
                activeMuscle === mg
                  ? 'bg-app-border text-app-text'
                  : 'bg-app-card border border-app-border text-app-faint',
              ].join(' ')}
            >
              {mg === 'all' ? 'All muscles' : mg}
            </button>
          ))}
        </div>
      )}

      {/* ── Count ── */}
      <p className="text-xs text-app-muted mb-3">
        {filtered.length} {filtered.length === 1 ? 'exercise' : 'exercises'}
      </p>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
          {search ? `No results for "${search}"` : 'No exercises in this category.'}
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((exercise) => (
            <li key={exercise.id}>
              {confirmDelete !== exercise.id ? (
                <div className={`flex items-center gap-3 rounded-2xl bg-app-card pl-0 pr-3 py-0 overflow-hidden border border-app-border border-l-4 ${ACCENT[exercise.category]}`}>
                  {/* Muscle icon */}
                  <div className="flex-none flex items-center justify-center w-12 py-2 pl-3">
                    <MuscleIcon muscleGroup={exercise.muscleGroup} width={28} height={42} />
                  </div>

                  {/* Name + badge */}
                  <div className="flex-1 min-w-0 py-3">
                    <p className="font-semibold text-sm text-app-text truncate">{exercise.name}</p>
                    <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 mt-0.5 ${BADGE[exercise.category]}`}>
                      {CATEGORY_LABELS[exercise.category]} · {exercise.muscleGroup}
                    </span>
                  </div>

                  {/* YouTube thumbnail */}
                  {exercise.videoUrl && (() => {
                    const vid   = getYouTubeId(exercise.videoUrl)
                    const thumb = vid ? getYouTubeThumbnail(vid) : null
                    return thumb ? (
                      <a
                        href={exercise.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex-none relative rounded-xl overflow-hidden w-14 h-10"
                        aria-label={`Watch ${exercise.name} demo`}
                      >
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 drop-shadow">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </a>
                    ) : null
                  })()}

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(exercise)}
                    className="flex-none text-app-faint active:text-accent-dark p-1.5"
                    aria-label={`Edit ${exercise.name}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                      <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setConfirmDelete(exercise.id)}
                    className="flex-none text-app-faint active:text-red-500 p-1.5"
                    aria-label={`Delete ${exercise.name}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="flex-1 text-sm text-red-700">
                    Delete <strong>{exercise.name}</strong>?
                  </p>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-app-muted px-2 py-1">Cancel</button>
                  <button onClick={() => handleDelete(exercise.id)} className="text-xs font-bold text-white bg-red-500 rounded-xl px-3 py-1.5 active:bg-red-600">Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {formOpen && (
        <ExerciseForm
          exercise={editing}
          onClose={() => { setFormOpen(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
