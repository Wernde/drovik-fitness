/**
 * ExercisePicker — full-screen modal for searching and selecting an exercise.
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise, ExerciseCategory } from '../db/db'
import MuscleIcon from './MuscleIcon'

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

interface Props {
  onSelect:     (exercise: Exercise) => void
  onClose:      () => void
  existingIds?: Set<string>
}

export default function ExercisePicker({ onSelect, onClose, existingIds = new Set() }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterCategory>('all')

  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => !e.deleted).toArray(),
    [],
  )

  const filtered = (exercises ?? [])
    .filter((e) => filter === 'all' || e.category === filter)
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app-bg">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 border-b border-app-border">
        <button
          onClick={onClose}
          className="text-app-muted active:text-app-text p-1 -ml-1"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-app-text">Select Exercise</h2>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <svg viewBox="0 0 20 20" fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-muted pointer-events-none">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search exercises…"
            autoFocus
            className="w-full rounded-2xl border border-app-border bg-app-card text-app-text placeholder-app-faint pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={[
              'flex-none rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap',
              filter === value
                ? 'bg-accent text-app-text'
                : 'bg-app-card border border-app-border text-app-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {!exercises ? (
          <div className="flex items-center justify-center h-20 text-app-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
            {search ? `No results for "${search}"` : 'No exercises in this category.'}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {filtered.map((exercise) => {
              const alreadyAdded = existingIds.has(exercise.id)
              return (
                <li key={exercise.id}>
                  <button
                    onClick={() => onSelect(exercise)}
                    className={[
                      'w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left',
                      alreadyAdded
                        ? 'bg-app-card/40 opacity-50'
                        : 'bg-app-card border border-app-border active:bg-accent-light',
                    ].join(' ')}
                  >
                    <MuscleIcon muscleGroup={exercise.muscleGroup} width={32} height={48} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-app-text truncate">{exercise.name}</p>
                      <p className="text-xs text-app-muted">{exercise.muscleGroup}</p>
                    </div>
                    {alreadyAdded && (
                      <span className="flex-none text-xs text-app-muted">Added</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
