import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { Program } from '../db/db'
import ProgramForm from '../components/ProgramForm'

// Muscle group → icon path for dark thumbnails
const MUSCLE_ICONS: Record<string, JSX.Element> = {
  Chest:      <path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" />,
  Back:       <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0121 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 017.5 16.125V3.375z" />,
  Legs:       <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />,
  Shoulders:  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />,
  default:    <path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 101.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" />,
}

function DayIcon({ muscleGroup }: { muscleGroup?: string }) {
  const path = muscleGroup && MUSCLE_ICONS[muscleGroup]
    ? MUSCLE_ICONS[muscleGroup]
    : MUSCLE_ICONS.default
  return (
    <div className="w-[64px] h-[64px] rounded-xl bg-app-text flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">{path}</svg>
    </div>
  )
}

export default function Programs() {
  const navigate = useNavigate()
  const [formOpen,    setFormOpen]    = useState(false)
  const [editing,     setEditing]     = useState<Program | undefined>(undefined)
  const [showManage,  setShowManage]  = useState(false)
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)

  const programs  = useLiveQuery(() => db.programs.filter((p) => !p.deleted).toArray(), [])
  const allDays   = useLiveQuery(() => db.workoutDays.filter((d) => !d.deleted).toArray(), [])
  const allDayExs = useLiveQuery(() => db.dayExercises.filter((de) => !de.deleted).toArray(), [])

  const activeProgram = useMemo(
    () => programs?.find((p) => p.isActive) ?? null,
    [programs],
  )

  const activeDays = useMemo(() => {
    if (!activeProgram || !allDays) return []
    return allDays
      .filter((d) => d.programId === activeProgram.id)
      .sort((a, b) => a.order - b.order)
  }, [activeProgram, allDays])

  const exCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (allDayExs) {
      for (const de of allDayExs) {
        map[de.workoutDayId] = (map[de.workoutDayId] ?? 0) + 1
      }
    }
    return map
  }, [allDayExs])

  // Primary muscle group per day (most common across its exercises)
  const dayMuscleMap = useMemo(() => {
    const map: Record<string, string> = {}
    // Not needed for now — just using default icon
    return map
  }, [])

  if (!programs || !allDays || !allDayExs) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const sorted = [...programs].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.name.localeCompare(b.name)
  })

  async function setActive(program: Program) {
    const ts = now()
    await Promise.all(
      programs!.filter((p) => p.isActive)
        .map((p) => db.programs.update(p.id, { isActive: false, updatedAt: ts, syncedAt: null }))
    )
    await db.programs.update(program.id, { isActive: true, updatedAt: ts, syncedAt: null })
  }

  async function handleDelete(id: string) {
    await db.programs.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
    setConfirmDel(null)
  }

  return (
    <div className="pb-4">

      {/* ── Active program header ──────────────────────────────── */}
      {activeProgram ? (
        <div className="bg-app-bg px-5 pt-6 pb-3 border-b border-app-border">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted font-medium">{activeProgram.description || "Your Program"}</p>
              <h1 className="text-2xl font-extrabold text-app-text leading-tight">{activeProgram.name}</h1>
            </div>
            <button
              onClick={() => setShowManage((v) => !v)}
              className="w-9 h-9 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-muted mt-1"
              aria-label="Manage programs"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-app-muted mt-1">{activeDays.length} {activeDays.length === 1 ? 'day' : 'days'}</p>
        </div>
      ) : (
        <div className="px-5 pt-6 pb-3 border-b border-app-border flex items-center justify-between">
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
      )}

      {/* ── Section label ──────────────────────────────────────── */}
      {activeProgram && activeDays.length > 0 && (
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <p className="text-base font-extrabold text-app-text">This Week</p>
          <button
            onClick={() => navigate(`/programs/${activeProgram.id}`)}
            className="text-xs font-bold text-accent-dark"
          >
            Manage
          </button>
        </div>
      )}

      {/* ── Workout day rows ───────────────────────────────────── */}
      {activeProgram && activeDays.length > 0 && (
        <div className="bg-app-card border-t border-b border-app-border">
          {activeDays.map((day) => {
            const exCount = exCountMap[day.id] ?? 0
            return (
              <button
                key={day.id}
                onClick={() => navigate(`/programs/${activeProgram.id}/days/${day.id}`)}
                className="w-full flex items-center border-b border-app-border last:border-b-0 active:bg-gray-50 text-left"
              >
                {/* Blue left bar */}
                <div className="w-[3px] bg-blue-500 self-stretch flex-shrink-0" />

                {/* Thumbnail */}
                <div className="m-3">
                  <DayIcon muscleGroup={dayMuscleMap[day.id]} />
                </div>

                {/* Info */}
                <div className="flex-1 py-4 pr-4 min-w-0">
                  <p className="font-bold text-[15px] text-app-text truncate">{day.name}</p>
                  <p className="text-[13px] text-app-muted mt-0.5">
                    {exCount > 0 ? `${exCount} exercise${exCount !== 1 ? 's' : ''}` : 'No exercises yet'}
                  </p>
                </div>

                {/* Chevron */}
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-app-faint flex-shrink-0 mr-4">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {activeProgram && activeDays.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
          <p className="text-sm">No days in this program yet.</p>
          <button
            onClick={() => navigate(`/programs/${activeProgram.id}`)}
            className="mt-3 text-sm font-bold text-accent-dark"
          >
            Build it →
          </button>
        </div>
      )}

      {!activeProgram && programs.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
          No programs yet. Tap <strong className="text-app-text">New</strong> to create one.
        </div>
      )}

      {!activeProgram && programs.length > 0 && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          No active program. Tap ✓ on a program below to activate it.
        </div>
      )}

      {/* ── Manage programs (collapsible) ──────────────────────── */}
      {(showManage || !activeProgram) && programs.length > 0 && (
        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-base font-extrabold text-app-text">All Programs</p>
            <button
              onClick={() => { setEditing(undefined); setFormOpen(true) }}
              className="flex items-center gap-1 rounded-2xl bg-accent text-app-text px-3 py-1.5 text-xs font-bold active:bg-accent-dark"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {sorted.map((program) => {
              const days = allDays.filter((d) => d.programId === program.id).length
              return (
                <li key={program.id}>
                  {confirmDel !== program.id ? (
                    <div className={[
                      'rounded-2xl border overflow-hidden',
                      program.isActive ? 'bg-accent-light border-accent' : 'bg-app-card border-app-border',
                    ].join(' ')}>
                      {program.isActive && <div className="h-1 w-full bg-accent" />}
                      <div className="px-4 py-3 flex items-center gap-2">
                        <button onClick={() => navigate(`/programs/${program.id}`)} className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-app-text truncate">{program.name}</span>
                            {program.isActive && <span className="text-xs font-bold text-accent-dark bg-accent px-2 py-0.5 rounded-full flex-shrink-0">Active</span>}
                          </div>
                          <p className="text-xs text-app-muted mt-0.5">{days} {days === 1 ? 'day' : 'days'}</p>
                        </button>
                        {!program.isActive && (
                          <button onClick={() => setActive(program)} className="text-app-faint active:text-accent-dark p-1.5" title="Activate">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                          </button>
                        )}
                        <button onClick={() => { setEditing(program); setFormOpen(true) }} className="text-app-faint active:text-accent-dark p-1.5">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" /></svg>
                        </button>
                        <button onClick={() => setConfirmDel(program.id)} className="text-app-faint active:text-red-500 p-1.5">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                      <p className="flex-1 text-sm text-red-700">Delete <strong>{program.name}</strong>?</p>
                      <button onClick={() => setConfirmDel(null)} className="text-xs text-app-muted px-2 py-1">Cancel</button>
                      <button onClick={() => handleDelete(program.id)} className="text-xs font-bold text-white bg-red-500 rounded-xl px-3 py-1.5">Delete</button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
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
