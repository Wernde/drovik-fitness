/**
 * DayExerciseForm — slide-up modal for setting targets when adding or editing
 * an exercise within a workout day.
 */

import { useState } from 'react'
import { db, now } from '../db/db'
import type { DayExercise } from '../db/db'

const REST_PRESETS = [
  { label: '30s',   secs: 30  },
  { label: '60s',   secs: 60  },
  { label: '90s',   secs: 90  },
  { label: '2 min', secs: 120 },
  { label: '3 min', secs: 180 },
  { label: '5 min', secs: 300 },
]

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
  const [restSecs,     setRestSecs]     = useState(existing?.restSecs != null ? String(existing.restSecs) : '')
  const [notes,        setNotes]        = useState(existing?.notes ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const [customMode, setCustomMode] = useState(() =>
    !!(existing?.restSecs && !REST_PRESETS.some(p => p.secs === existing.restSecs))
  )

  async function handleSave() {
    const sets = parseInt(targetSets, 10)
    if (isNaN(sets) || sets < 1) { setError('Sets must be a number greater than 0.'); return }
    if (!targetReps.trim())      { setError('Reps field is required (e.g. 5, 8–12, AMRAP).'); return }

    const weight = targetWeight.trim() === '' ? null : parseFloat(targetWeight)
    if (targetWeight.trim() !== '' && isNaN(weight!)) { setError('Target weight must be a number.'); return }

    const rest = restSecs.trim() === '' ? null : parseInt(restSecs, 10)
    if (restSecs.trim() !== '' && (isNaN(rest!) || rest! < 1)) { setError('Rest time must be a whole number of seconds.'); return }

    setSaving(true)
    setError('')

    try {
      const timestamp = now()
      if (props.mode === 'edit') {
        await db.dayExercises.update(props.dayExercise.id, {
          targetSets: sets, targetReps: targetReps.trim(), targetWeight: weight,
          restSecs: rest, notes: notes.trim(), updatedAt: timestamp, syncedAt: null,
        })
      } else {
        await db.dayExercises.add({
          id: crypto.randomUUID(), workoutDayId: props.dayId, exerciseId: props.exerciseId,
          order: props.nextOrder, targetSets: sets, targetReps: targetReps.trim(),
          targetWeight: weight, restSecs: rest, notes: notes.trim(), createdAt: timestamp,
          updatedAt: timestamp, syncedAt: null, deleted: false,
        })
      }
      props.onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center" onClick={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="absolute inset-0 bg-black/40 md:block hidden" onClick={props.onClose} />
      <div className="relative w-full md:max-w-md md:rounded-2xl md:shadow-2xl bg-app-card rounded-t-2xl shadow-xl p-6 pb-10 max-h-[90vh] overflow-y-auto" style={{ marginBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
        onClick={(e) => e.stopPropagation()}
      >

        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-app-text">{props.mode === 'edit' ? 'Edit Targets' : 'Set Targets'}</h2>
          <button onClick={props.onClose} className="text-app-muted active:text-app-text p-1" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-app-muted mb-5">{props.exerciseName}</p>

        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-app-text mb-1">Sets</label>
              <input
                type="number"
                inputMode="numeric"
                value={targetSets}
                onChange={(e) => setTargetSets(e.target.value)}
                min={1}
                className="w-full rounded-xl border border-app-border bg-app-bg text-app-text px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-app-text mb-1">Reps</label>
              <input
                type="text"
                value={targetReps}
                onChange={(e) => setTargetReps(e.target.value)}
                placeholder="e.g. 8–12 or AMRAP"
                className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Target weight (kg) <span className="text-app-muted font-normal">(optional)</span>
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="e.g. 80"
              min={0}
              step={0.5}
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-2">
              Rest between sets <span className="text-app-muted font-normal">(optional)</span>
            </label>

            {/* Preset pills */}
            <div className="flex flex-wrap gap-2 mb-2">
              {/* None */}
              <button
                type="button"
                onClick={() => { setRestSecs(''); setCustomMode(false) }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  !restSecs.trim() && !customMode
                    ? 'bg-accent border-accent text-app-text'
                    : 'bg-app-bg border-app-border text-app-muted active:bg-app-border'
                }`}
              >
                None
              </button>

              {REST_PRESETS.map(({ label, secs }) => (
                <button
                  key={secs}
                  type="button"
                  onClick={() => { setRestSecs(String(secs)); setCustomMode(false) }}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                    !customMode && parseInt(restSecs, 10) === secs
                      ? 'bg-accent border-accent text-app-text'
                      : 'bg-app-bg border-app-border text-app-muted active:bg-app-border'
                  }`}
                >
                  {label}
                </button>
              ))}

              {/* Custom */}
              <button
                type="button"
                onClick={() => { setCustomMode(true); setRestSecs('') }}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  customMode
                    ? 'bg-accent border-accent text-app-text'
                    : 'bg-app-bg border-app-border text-app-muted active:bg-app-border'
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom input — shown only when Custom pill is active */}
            {customMode && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  inputMode="numeric"
                  value={restSecs}
                  onChange={(e) => setRestSecs(e.target.value)}
                  placeholder="e.g. 240"
                  min={1}
                  className="w-28 rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
                <span className="text-sm text-app-muted">seconds</span>
                {restSecs.trim() && parseInt(restSecs, 10) > 0 && (
                  <span className="text-sm text-app-muted">
                    ({Math.floor(parseInt(restSecs, 10) / 60)}:{String(parseInt(restSecs, 10) % 60).padStart(2, '0')} min)
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Notes <span className="text-app-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pause at bottom"
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-accent text-app-text py-3 font-semibold text-sm disabled:opacity-60 active:bg-accent-dark"
          >
            {saving ? 'Saving…' : props.mode === 'edit' ? 'Save Changes' : 'Add Exercise'}
          </button>
        </div>
      </div>
    </div>
  )
}
