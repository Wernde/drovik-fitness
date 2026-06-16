/**
 * DayForm — slide-up modal for creating or renaming a workout day.
 */

import { useState } from 'react'
import { db, now } from '../db/db'
import type { WorkoutDay } from '../db/db'
import { Button, Field } from './ui'

interface Props {
  programId: string
  phaseId?:  string | null
  day?:      WorkoutDay
  nextOrder: number
  onClose:   () => void
}

export default function DayForm({ programId, phaseId = null, day, nextOrder, onClose }: Props) {
  const [name,   setName]   = useState(day?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Day name is required.'); return }

    setSaving(true)
    setError('')

    try {
      const timestamp = now()
      if (day) {
        await db.workoutDays.update(day.id, { name: trimmed, updatedAt: timestamp, syncedAt: null })
      } else {
        await db.workoutDays.add({
          id: crypto.randomUUID(), programId, phaseId, name: trimmed, order: nextOrder,
          createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
        })
      }
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full bg-app-surface rounded-t-card shadow-modal p-6 pb-10">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-app-text">{day ? 'Rename Day' : 'Add Day'}</h2>
          <button onClick={onClose} className="text-app-muted active:text-app-text p-1" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Field
            label="Day name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Push, Pull, Legs A"
            autoFocus
            error={error}
          />

          <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : day ? 'Save' : 'Add Day'}
          </Button>
        </div>
      </div>
    </div>
  )
}
