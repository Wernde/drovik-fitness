import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { Program } from '../db/db'
import ProgramForm from '../components/ProgramForm'
import BrandIcon, { brandIconTileStyle } from '../components/BrandIcon'
import type { BrandIconName, BrandIconTone } from '../components/BrandIcon'

function getDayIconKind(muscleGroup: string) {
  const muscle = muscleGroup.toLowerCase()
  if (!muscle) return 'template'
  if (['quad', 'hamstring', 'glute', 'calf', 'inner thigh'].some((m) => muscle.includes(m))) return 'legs'
  if (['back', 'trap', 'bicep'].some((m) => muscle.includes(m))) return 'pull'
  if (['chest', 'shoulder', 'tricep'].some((m) => muscle.includes(m))) return 'push'
  if (muscle.includes('core')) return 'core'
  if (muscle.includes('cardio')) return 'cardio'
  if (muscle.includes('full')) return 'full'
  return 'lift'
}

const DAY_ICON_CONFIG: Record<string, { icon: BrandIconName; tone: BrandIconTone }> = {
  push:     { icon: 'push',     tone: 'gold' },
  pull:     { icon: 'pull',     tone: 'blue' },
  legs:     { icon: 'legs',     tone: 'flame' },
  core:     { icon: 'core',     tone: 'purple' },
  cardio:   { icon: 'cardio',   tone: 'blue' },
  full:     { icon: 'full',     tone: 'gold' },
  lift:     { icon: 'lift',     tone: 'gold' },
  template: { icon: 'template', tone: 'steel' },
}

function ProgramDayIcon({ muscleGroup, empty }: { muscleGroup: string; empty: boolean }) {
  const kind = empty ? 'template' : getDayIconKind(muscleGroup)
  const config = DAY_ICON_CONFIG[kind] ?? DAY_ICON_CONFIG.lift

  return (
    <div
      className="relative m-3 ml-4 flex items-center justify-center w-14 h-14 rounded-2xl border flex-shrink-0 overflow-hidden"
      style={brandIconTileStyle(config.tone)}
    >
      <span className="absolute inset-x-2 top-1.5 h-2.5 rounded-full bg-white/45 blur-[1px]" />
      <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-orange-200/45" />
      <BrandIcon name={config.icon} tone={config.tone} size={34} className="relative z-10" />
    </div>
  )
}

export default function Programs() {
  const navigate = useNavigate()
  const [formOpen,   setFormOpen]   = useState(false)
  const [editing,    setEditing]    = useState<Program | undefined>(undefined)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const programs    = useLiveQuery(() => db.programs.filter((p) => !p.deleted).toArray(), [])
  const allDays     = useLiveQuery(() => db.workoutDays.filter((d) => !d.deleted).toArray(), [])
  const allDayExs   = useLiveQuery(() => db.dayExercises.filter((de) => !de.deleted).toArray(), [])
  const allExercises = useLiveQuery(() => db.exercises.filter((e) => !e.deleted).toArray(), [])

  const activePrograms = useMemo(
    () => programs?.filter((p) => p.isActive) ?? [],
    [programs],
  )

  const activeDaysByProgram = useMemo(() => {
    if (!allDays) return new Map<string, typeof allDays>()
    const map = new Map<string, typeof allDays>()
    for (const p of activePrograms) {
      map.set(
        p.id,
        allDays.filter((d) => d.programId === p.id).sort((a, b) => a.order - b.order),
      )
    }
    return map
  }, [activePrograms, allDays])

  const exCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (allDayExs) {
      for (const de of allDayExs) {
        map[de.workoutDayId] = (map[de.workoutDayId] ?? 0) + 1
      }
    }
    return map
  }, [allDayExs])

  // Estimated time per day in minutes (rounded to nearest 5)
  // Formula: sum over exercises of (targetSets × 40s active + targetSets × restSecs)
  const estMinMap = useMemo(() => {
    const map: Record<string, number> = {}
    if (!allDayExs) return map
    for (const de of allDayExs) {
      const sets = de.targetSets ?? 3
      const rest = de.restSecs ?? 90
      const totalSecs = sets * 40 + sets * rest
      map[de.workoutDayId] = (map[de.workoutDayId] ?? 0) + totalSecs
    }
    // Convert to minutes, round to nearest 5
    for (const dayId of Object.keys(map)) {
      map[dayId] = Math.max(5, Math.round(map[dayId] / 60 / 5) * 5)
    }
    return map
  }, [allDayExs])

  // Primary muscle group per day — most-frequent muscle among that day's exercises
  const dayMuscleMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (!allDayExs || !allExercises) return map
    const exerciseMap = new Map(allExercises.map((e) => [e.id, e]))
    const tally: Record<string, Record<string, number>> = {}
    for (const de of allDayExs) {
      const muscle = exerciseMap.get(de.exerciseId)?.muscleGroup
      if (!muscle) continue
      tally[de.workoutDayId] ??= {}
      tally[de.workoutDayId][muscle] = (tally[de.workoutDayId][muscle] ?? 0) + 1
    }
    for (const [dayId, counts] of Object.entries(tally)) {
      map[dayId] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    }
    return map
  }, [allDayExs, allExercises])

  if (!programs || !allDays || !allDayExs || !allExercises) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const sorted = [...programs].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1
    if (!a.isActive && b.isActive) return 1
    return a.name.localeCompare(b.name)
  })

  async function toggleActive(program: Program) {
    await db.programs.update(program.id, { isActive: !program.isActive, updatedAt: now(), syncedAt: null })
  }

  async function handleDelete(id: string) {
    await db.programs.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
    setConfirmDel(null)
  }

  return (
    <div>

      {/* ── Page heading (always "Program") ───────────────────── */}
      <div className="page-x pt-6 pb-3 border-b border-app-border flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-app-text">Program</h1>
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

      {/* ── No programs at all ────────────────────────────────── */}
      {programs.length === 0 && (
        <div className="page-x mt-4">
          <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
            No programs yet. Tap <strong className="text-app-text">New</strong> to create one.
          </div>
        </div>
      )}

      {/* ── No active program notice ──────────────────────────── */}
      {activePrograms.length === 0 && programs.length > 0 && (
        <div className="page-x mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
            No active program. Tap ✓ on a program below to activate it.
          </div>
        </div>
      )}

      {/* ── All Programs ───────────────────────────────────────── */}
      {programs.length > 0 && (
        <div className="page-x mt-4">
          <p className="text-base font-extrabold text-app-text mb-2">All Programs</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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
                        <button
                          onClick={() => toggleActive(program)}
                          className={`p-1.5 ${program.isActive ? 'text-accent-dark' : 'text-app-faint active:text-accent-dark'}`}
                          title={program.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                        </button>
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

      {/* ── Active programs: days or empty state (one section per active program) ── */}
      {activePrograms.map((program) => {
        const days = activeDaysByProgram.get(program.id) ?? []
        return (
          <div key={program.id}>
            <div className="page-x pt-5 pb-1 flex items-center justify-between">
              <p className="text-base font-extrabold text-app-text">{program.name}</p>
              <button
                onClick={() => navigate(`/programs/${program.id}`)}
                className="text-xs font-bold text-accent-dark"
              >
                Manage
              </button>
            </div>
            {days.length > 0 ? (
              <div className="bg-app-card border-t border-b border-app-border md:border md:rounded-2xl md:mx-6 md:mt-2 overflow-hidden lg:mx-8 shadow-card">
                {days.map((day) => {
                  const exCount = exCountMap[day.id] ?? 0
                  const estMin  = estMinMap[day.id]
                  const subtitle = exCount > 0
                    ? estMin != null
                      ? `${exCount} exercise${exCount !== 1 ? 's' : ''} · est. ${estMin}m`
                      : `${exCount} exercise${exCount !== 1 ? 's' : ''}`
                    : 'No exercises yet'
                  return (
                    <button
                      key={day.id}
                      onClick={() => navigate(`/programs/${program.id}/days/${day.id}`)}
                      className="w-full flex items-center border-b border-app-border last:border-b-0 active:bg-accent-light hover:bg-app-bg/70 text-left transition-colors"
                    >
                      <ProgramDayIcon muscleGroup={dayMuscleMap[day.id] ?? ''} empty={exCount === 0} />
                      <div className="flex-1 py-4 pr-2 min-w-0">
                        <p className="font-bold text-[15px] text-app-text truncate">{day.name}</p>
                        <p className="text-[13px] text-app-muted mt-0.5">{subtitle}</p>
                      </div>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-app-faint flex-shrink-0 mr-4">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="page-x mt-2 mb-2">
                <div className="rounded-2xl border-2 border-dashed border-app-border p-6 text-center text-app-muted">
                  <p className="text-sm">No days in this program yet.</p>
                  <button
                    onClick={() => navigate(`/programs/${program.id}`)}
                    className="mt-2 text-sm font-bold text-accent-dark"
                  >
                    Build it →
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {formOpen && (
        <ProgramForm
          program={editing}
          onClose={() => { setFormOpen(false); setEditing(undefined) }}
        />
      )}
    </div>
  )
}
