/**
 * DayExerciseForm — slide-up modal for setting targets when adding or editing
 * an exercise within a workout day.
 *
 * Add mode: pass exerciseName + dayId + nextOrder. Creates a new DayExercise.
 * Edit mode: pass dayExercise (existing record). Updates it in Dexie.
 */

import { useState } from 'react'
import { db, now } from '../db/db'
import type { DayExercise } from '../db/db'

interface AddProps {
  mode:         'add'
  exerciseId:   string
  exerciseName: string
  dayId:        string
  nextOrder:    number
  onClose:      () => void
}

interface EditProps {
  mode:         'edit'
  dayExercise:  DayExercise
  exerciseName: string
  onClose:      () => void
}

type Props = AddProps | EditProps

export default function DayExerciseForm(props: Props) {
  const existing = props.mode === 'edit' ? props.dayExercise : undefined

  const [targetSets,   setTargetSets]   = useState(String(existing?.targetSets ?? 3))
  const [targetReps,   setTargetReps]   = useState(existing?.targetReps ?? '8–12')
  const [targetWeight, setTargetWeight] = useState(existing?.targetWeight != null ? String(existing.targetWeight) : '')
  const [notes,        setNotes]        = useState(existing?.notes ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  async function handleSave() {
    const sets = parseInt(targetSets, 10)
    if (isNaN(sets) || sets < 1) { setError('Sets must be a number greater than 0.'); return }
    if (!targetReps.trim())      { setError('Reps field is required (e.g. 5, 8–12, AMRAP).'); return }

    const weight = targetWeight.trim() === '' ? null : parseFloat(targetWeight)
    if (targetWeight.trim() !== '' && isNaN(weight!)) { setError('Target weight must be a number.'); return }

    setSaving(true)
    setError('')

    try {
      const timestamp = now()

      if (props.mode === 'edit') {
        await db.dayExercises.update(props.dayExercise.id, {
          targetSets:   sets,
          targetReps:   targetReps.trim(),
          targetWeight: weight,
          notes:        notes.trim(),
          updatedAt:    timestamp,
          syncedAt:     null,
        })
      } else {
        await db.dayExercises.add({
          id:            crypto.randomUUID(),
          workoutDayId:  props.dayId,
          exerciseId:    props.exerciseId,
          order:         props.nextOrder,
          targetSets:    sets,
          targetReps:    targetReps.trim(),
          targetWeight:  weight,
          notes:         notes.trim(),
          createdAt:     timestamp,
          updatedAt:     timestamp,
          syncedAt:      null,
          deleted:       false,
        })
      }

      props.onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose() }}
    >
      <div className="w-full bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl p-6 pb-10">

        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">{props.mode === 'edit' ? 'Edit Targets' : 'Set Targets'}</h2>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{props.exerciseName}</p>

        <div className="flex flex-col gap-4">
          {/* Sets + Reps on one row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sets</label>
              <input
                type="number"
                inputMode="numeric"
                value={targetSets}
                onChange={(e) => setTargetSets(e.target.value)}
                min={1}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reps</label>
              <input
                type="text"
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
                placeholder="e.g. 8–12 or AMRAP"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target weight (kg) <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="e.g. 80"
              min={0}
              step={0.5}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pause at bottom"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-lg bg-sky-500 text-white py-3 font-semibold text-sm disabled:opacity-60 active:bg-sky-600"
          >
            {saving ? 'Saving…' : props.mode === 'edit' ? 'Save Changes' : 'Add Exercise'}
          </button>
        </div>
      </div>
    </div>
  )
}
