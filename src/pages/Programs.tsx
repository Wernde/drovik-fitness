/**
 * Programs — list of all training programs.
 *
 * Create, edit, delete programs and mark one as active.
 * Tap a program card to open its workout days.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { Program } from '../db/db'
import ProgramForm from '../components/ProgramForm'

export default function Programs() {
  const navigate = useNavigate()

  const [formOpen,       setFormOpen]       = useState(false)
  const [editing,        setEditing]        = useState<Program | undefined>(undefined)
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null)

  const programs = useLiveQuery(
    () => db.programs.filter((p) => !p.deleted).toArray(),
    [],
  )

  // Count of non-deleted days per program.
  const dayCounts = useLiveQuery(
    () => db.workoutDays.filter((d) => !d.deleted).toArray(),
    [],
  )

  if (!programs || !dayCounts) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  const dayCountMap = dayCounts.reduce<Record<string, number>>((acc, d) => {
    acc[d.programId] = (acc[d.programId] ?? 0) + 1
    return acc
  }, {})

  const sorted = [...programs].sort((a, b) => {
    // Active program always first, then alphabetical.
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.name.localeCompare(b.name)
  })

  async function setActive(program: Program) {
    const timestamp = now()
    // Deactivate all, then activate the chosen one.
    await Promise.all(
      programs
        .filter((p) => p.isActive)
        .map((p) => db.programs.update(p.id, { isActive: false, updatedAt: timestamp, syncedAt: null }))
    )
    await db.programs.update(program.id, { isActive: true, updatedAt: timestamp, syncedAt: null })
  }

  async function handleDelete(id: string) {
    await db.programs.update(id, {
      deleted:   true,
      updatedAt: now(),
      syncedAt:  null,
    })
    setConfirmDelete(null)
  }

  function openAdd() {
    setEditing(undefined)
    setFormOpen(true)
  }

  function openEdit(program: Program) {
    setEditing(program)
    setFormOpen(true)
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Programs</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 rounded-lg bg-sky-500 text-white px-3 py-1.5 text-sm font-semibold active:bg-sky-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          New
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
          No programs yet. Tap <strong>New</strong> to create your first one.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((program) => (
            <li key={program.id}>
              {confirmDelete !== program.id ? (
                /* Program card */
                <div
                  className={[
                    'rounded-xl border px-4 py-3',
                    program.isActive
                      ? 'border-sky-400 bg-sky-50 dark:bg-sky-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60',
                  ].join(' ')}
                >
                  {/* Top row: name + action buttons */}
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => navigate(`/programs/${program.id}`)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{program.name}</span>
                        {program.isActive && (
                          <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/40 rounded-full px-2 py-0.5">
                            Active
                          </span>
                        )}
                      </div>
                      {program.description ? (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{program.description}</p>
                      ) : null}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {dayCountMap[program.id] ?? 0} {(dayCountMap[program.id] ?? 0) === 1 ? 'day' : 'days'}
                      </p>
                    </button>

                    {/* Set active */}
                    {!program.isActive && (
                      <button
                        onClick={() => setActive(program)}
                        className="flex-none text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 p-1"
                        aria-label={`Set ${program.name} as active`}
                        title="Set as active"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(program)}
                      className="flex-none text-gray-400 hover:text-sky-500 dark:hover:text-sky-400 p-1"
                      aria-label={`Edit ${program.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setConfirmDelete(program.id)}
                      className="flex-none text-gray-400 hover:text-red-500 p-1"
                      aria-label={`Delete ${program.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                /* Inline delete confirmation */
                <div className="flex items-center gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
                  <p className="flex-1 text-sm text-red-700 dark:text-red-300">
                    Delete <strong>{program.name}</strong>?
                  </p>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2 py-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(program.id)}
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

      {formOpen && (
        <ProgramForm
          program={editing}
          onClose={() => { setFormOpen(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
