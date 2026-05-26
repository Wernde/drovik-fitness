import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { Program } from '../db/db'
import ProgramForm from '../components/ProgramForm'

export default function Programs() {
  const navigate = useNavigate()
  const [formOpen,      setFormOpen]      = useState(false)
  const [editing,       setEditing]       = useState<Program | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const programs  = useLiveQuery(() => db.programs.filter((p) => !p.deleted).toArray(), [])
  const dayCounts = useLiveQuery(() => db.workoutDays.filter((d) => !d.deleted).toArray(), [])

  if (!programs || !dayCounts) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const dayCountMap = dayCounts.reduce<Record<string, number>>((acc, d) => {
    acc[d.programId] = (acc[d.programId] ?? 0) + 1
    return acc
  }, {})

  const sorted = [...programs].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.name.localeCompare(b.name)
  })

  async function setActive(program: Program) {
    const timestamp = now()
    await Promise.all(
      programs
        .filter((p) => p.isActive)
        .map((p) => db.programs.update(p.id, { isActive: false, updatedAt: timestamp, syncedAt: null }))
    )
    await db.programs.update(program.id, { isActive: true, updatedAt: timestamp, syncedAt: null })
  }

  async function handleDelete(id: string) {
    await db.programs.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
    setConfirmDelete(null)
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-app-text">Plans</h1>
        <button
          onClick={() => { setEditing(undefined); setFormOpen(true) }}
          className="flex items-center gap-1.5 rounded-2xl bg-accent text-app-text px-4 py-2 text-sm font-bold active:bg-accent-dark"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          New
        </button>
      </div>

      {/* Quick link to log screen */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/log')}
          className="w-full flex items-center gap-3 rounded-2xl bg-accent px-4 py-4 text-left active:bg-accent-dark"
        >
          <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-app-text">
              <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256l-7.108-4.061C13.555 6.346 12 7.25 12 8.69v2.34L5.055 7.061z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-app-text">Start a Workout</p>
            <p className="text-xs text-app-text/70">Log screen with all program days</p>
          </div>
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
          No programs yet. Tap <strong className="text-app-text">New</strong> to create your first one.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((program) => {
            const days = dayCountMap[program.id] ?? 0
            return (
              <li key={program.id}>
                {confirmDelete !== program.id ? (
                  <div className={[
                    'rounded-2xl overflow-hidden border',
                    program.isActive
                      ? 'bg-accent-light border-accent'
                      : 'bg-app-card border-app-border',
                  ].join(' ')}>
                    {program.isActive && <div className="h-1 w-full bg-accent" />}

                    <div className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <button onClick={() => navigate(`/programs/${program.id}`)} className="flex-1 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-base text-app-text">{program.name}</span>
                            {program.isActive && (
                              <span className="text-xs font-bold text-accent-dark bg-accent px-2 py-0.5 rounded-full">Active</span>
                            )}
                          </div>
                          {program.description ? (
                            <p className="text-xs text-app-muted mt-0.5 line-clamp-1">{program.description}</p>
                          ) : null}
                        </button>

                        {!program.isActive && (
                          <button onClick={() => setActive(program)}
                            className="flex-none text-app-faint active:text-accent-dark p-1.5" title="Set as active">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                        <button onClick={() => { setEditing(program); setFormOpen(true) }}
                          className="flex-none text-app-faint active:text-accent-dark p-1.5">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmDelete(program.id)}
                          className="flex-none text-app-faint active:text-red-500 p-1.5">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>

                      <button onClick={() => navigate(`/programs/${program.id}`)}
                        className="w-full flex items-center justify-between mt-3 pt-3 border-t border-app-border">
                        <span className="text-xs text-app-muted">{days} {days === 1 ? 'day' : 'days'}</span>
                        <span className="text-xs text-accent-dark font-bold flex items-center gap-1">
                          View days
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="flex-1 text-sm text-red-700">Delete <strong>{program.name}</strong>?</p>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-app-muted px-2 py-1">Cancel</button>
                    <button onClick={() => handleDelete(program.id)} className="text-xs font-bold text-white bg-red-500 rounded-xl px-3 py-1.5 active:bg-red-600">Delete</button>
                  </div>
                )}
              </li>
            )
          })}
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
