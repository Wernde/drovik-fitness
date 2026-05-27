/**
 * ProgramForm — slide-up modal for creating or editing a program.
 */

import { useState } from 'react'
import { db, now } from '../db/db'
import type { Program } from '../db/db'

interface Props {
  program?: Program
  onClose: () => void
}

export default function ProgramForm({ program, onClose }: Props) {
  const [name,        setName]        = useState(program?.name ?? '')
  const [description, setDescription] = useState(program?.description ?? '')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  async function handleSave() {
    const trimmedName = name.trim()
    if (!trimmedName) { setError('Program name is required.'); return }

    setSaving(true)
    setError('')

    try {
      const timestamp = now()
      if (program) {
        await db.programs.update(program.id, {
          name: trimmedName, description: description.trim(),
          updatedAt: timestamp, syncedAt: null,
        })
      } else {
        await db.programs.add({
          id: crypto.randomUUID(), name: trimmedName, description: description.trim(),
          isActive: false, createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
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
      <div className="w-full bg-app-card rounded-t-2xl shadow-xl p-6 pb-10">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-app-text">{program ? 'Edit Program' : 'New Program'}</h2>
          <button onClick={onClose} className="text-app-muted active:text-app-text p-1" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-app-text mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push Pull Legs"
              autoFocus
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-app-text mb-1">
              Description <span className="text-app-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 6-day PPL, 2 days on 1 day off"
              rows={2}
              className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-accent text-app-text py-3 font-semibold text-sm disabled:opacity-60 active:bg-accent-dark"
          >
            {saving ? 'Saving…' : program ? 'Save Changes' : 'Create Program'}
          </button>
        </div>
      </div>
    </div>
  )
}
