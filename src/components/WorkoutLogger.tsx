/**
 * WorkoutLogger — active workout screen with table-based set logging.
 *
 * UI: Save/Cancel header, auto-fill toggle, per-exercise set table
 * (Set | Previous | Reps | Kg), sticky yellow Save button.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { WorkoutSession, SessionExercise, DayExercise, Exercise } from '../db/db'
import ExercisePicker from './ExercisePicker'
import RestTimer from './RestTimer'
import { useToast } from '../contexts/ToastContext'

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftRow = { reps: string; kg: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Category icon paths keyed by exercise.category
const CAT_ICONS: Record<string, JSX.Element> = {
  barbell: (
    <path d="M6.375 7.5C6.375 5.634 7.884 4.125 9.75 4.125h4.5c1.866 0 3.375 1.509 3.375 3.375v9c0 1.866-1.509 3.375-3.375 3.375h-4.5A3.375 3.375 0 016.375 16.5v-9z" />
  ),
  dumbbell: (
    <path d="M5.25 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15zM20.25 4.5a.75.75 0 00-1.5 0v15a.75.75 0 001.5 0v-15zM3.75 10.5A2.25 2.25 0 016 8.25h.75V15H6a2.25 2.25 0 01-2.25-2.25v-2.25zM18 8.25h.75a2.25 2.25 0 012.25 2.25v2.25A2.25 2.25 0 0118.75 15H18V8.25zM8.25 8.25H15.75v7.5H8.25V8.25z" />
  ),
  cable: (
    <path d="M12 3v1.5M12 19.5V21M6.22 6.22l1.06 1.06M16.72 16.72l1.06 1.06M3 12h1.5M19.5 12H21M6.22 17.78l1.06-1.06M16.72 7.28l1.06-1.06M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />
  ),
  machine: (
    <path
      fillRule="evenodd"
      d="M2.25 4.5A2.25 2.25 0 014.5 2.25h15a2.25 2.25 0 012.25 2.25v15a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25v-15zm5.25 0a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9zM6 12a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H6.75A.75.75 0 016 12zm.75 3.75a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9z"
      clipRule="evenodd"
    />
  ),
  bodyweight: (
    <path
      fillRule="evenodd"
      d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
      clipRule="evenodd"
    />
  ),
  default: (
    <path d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
  ),
}

function ExerciseThumb({ category }: { category?: string }) {
  const key  = category && CAT_ICONS[category] ? category : 'default'
  const icon = CAT_ICONS[key]
  const isStroke = key === 'cable'
  return (
    <div className="w-12 h-12 rounded-xl bg-app-text flex items-center justify-center flex-shrink-0">
      <svg
        viewBox="0 0 24 24"
        fill={isStroke ? 'none' : 'white'}
        stroke={isStroke ? 'white' : 'none'}
        strokeWidth={isStroke ? 1.5 : 0}
        className="w-6 h-6"
      >
        {icon}
      </svg>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  session: WorkoutSession
}

type SessionData = {
  sessionExercises: SessionExercise[]
  exerciseMap:      Map<string, Exercise>
  dayExerciseMap:   Map<string, DayExercise>
  dayName:          string | null
}

export default function WorkoutLogger({ session }: Props) {
  const navigate    = useNavigate()
  const { showToast } = useToast()

  // Draft rows: seId → array of { reps, kg }
  const [drafts,      setDrafts]      = useState<Map<string, DraftRow[]>>(new Map())
  // Previous session rows: exerciseId → array of { reps, kg }
  const [prevData,    setPrevData]    = useState<Map<string, DraftRow[]>>(new Map())
  const [autoFill,    setAutoFill]    = useState(false)
  const [elapsed,     setElapsed]     = useState(0)
  const [saving,      setSaving]      = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)
  const [showPicker,  setShowPicker]  = useState(false)
  const [restTimer,   setRestTimer]   = useState<{ secs: number; exerciseName: string } | null>(null)

  const draftsInit = useRef(false)

  // Elapsed timer
  useEffect(() => {
    const start = new Date(session.startedAt).getTime()
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.startedAt])

  // Live data from DB
  const data = useLiveQuery<SessionData>(async () => {
    const ses = await db.sessionExercises
      .where('workoutSessionId').equals(session.id)
      .filter((se) => !se.deleted)
      .toArray()
    ses.sort((a, b) => a.order - b.order)

    const exerciseIds = [...new Set(ses.map((se) => se.exerciseId))]
    const exercises   = exerciseIds.length > 0
      ? await db.exercises.where('id').anyOf(exerciseIds).toArray()
      : []

    let dayExercises: DayExercise[] = []
    let dayName: string | null = null
    if (session.workoutDayId) {
      dayExercises = await db.dayExercises
        .where('workoutDayId').equals(session.workoutDayId)
        .filter((de) => !de.deleted)
        .toArray()
      const day = await db.workoutDays.get(session.workoutDayId)
      dayName = day?.name ?? null
    }

    return {
      sessionExercises: ses,
      exerciseMap:      new Map(exercises.map((e) => [e.id, e])),
      dayExerciseMap:   new Map(dayExercises.map((de) => [de.exerciseId, de])),
      dayName,
    }
  }, [session.id, session.workoutDayId])

  // Initialise drafts once when data arrives
  useEffect(() => {
    if (!data || draftsInit.current) return
    draftsInit.current = true
    initDrafts(data.sessionExercises, data.dayExerciseMap)
    loadPrevious(data.sessionExercises)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Also add empty rows when a new exercise is added (after init)
  useEffect(() => {
    if (!data || !draftsInit.current) return
    setDrafts((prev) => {
      const next = new Map(prev)
      for (const se of data.sessionExercises) {
        if (!next.has(se.id)) {
          const n = data.dayExerciseMap.get(se.exerciseId)?.targetSets ?? 3
          next.set(se.id, Array.from({ length: n }, () => ({ reps: '', kg: '' })))
        }
      }
      return next
    })
  }, [data])

  async function initDrafts(
    seList: SessionExercise[],
    dayExMap: Map<string, DayExercise>,
  ) {
    const next = new Map<string, DraftRow[]>()
    for (const se of seList) {
      const existing = await db.sets
        .where('sessionExerciseId').equals(se.id)
        .filter((s) => !s.deleted)
        .toArray()
      existing.sort((a, b) => a.setNumber - b.setNumber)

      if (existing.length > 0) {
        next.set(se.id, existing.map((s) => ({ reps: String(s.reps), kg: String(s.weight) })))
      } else {
        const n = dayExMap.get(se.exerciseId)?.targetSets ?? 3
        next.set(se.id, Array.from({ length: n }, () => ({ reps: '', kg: '' })))
      }
    }
    setDrafts(next)
  }

  async function loadPrevious(seList: SessionExercise[]) {
    const prevMap = new Map<string, DraftRow[]>()
    for (const se of seList) {
      const allSes = await db.sessionExercises
        .filter((x) => x.exerciseId === se.exerciseId && !x.deleted && x.workoutSessionId !== session.id)
        .toArray()
      const sessIds = [...new Set(allSes.map((x) => x.workoutSessionId))]
      const sessions = (
        await Promise.all(sessIds.map((id) => db.workoutSessions.get(id)))
      )
        .filter(
          (s): s is WorkoutSession => !!s && !!s.finishedAt && !s.deleted,
        )
        .sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!))
      if (sessions.length === 0) continue
      const prevSe = allSes.find((x) => x.workoutSessionId === sessions[0].id)
      if (!prevSe) continue
      const sets = await db.sets
        .where('sessionExerciseId').equals(prevSe.id)
        .filter((s) => !s.deleted && !s.isWarmup)
        .toArray()
      sets.sort((a, b) => a.setNumber - b.setNumber)
      prevMap.set(se.exerciseId, sets.map((s) => ({ reps: String(s.reps), kg: String(s.weight) })))
    }
    setPrevData(prevMap)
  }

  // Auto fill when toggle turns on
  useEffect(() => {
    if (!autoFill || !data) return
    setDrafts((prev) => {
      const next = new Map(prev)
      for (const se of data.sessionExercises) {
        const pd = prevData.get(se.exerciseId)
        if (!pd || pd.length === 0) continue
        const existing = next.get(se.id) ?? []
        // Only fill rows that are still empty
        const filled = existing.map((row, i) =>
          row.reps === '' && row.kg === '' && pd[i]
            ? { reps: pd[i].reps, kg: pd[i].kg }
            : row
        )
        next.set(se.id, filled)
      }
      return next
    })
  }, [autoFill]) // eslint-disable-line react-hooks/exhaustive-deps

  const existingExerciseIds = useMemo(
    () => new Set(data?.sessionExercises.map((se) => se.exerciseId) ?? []),
    [data],
  )

  function updateDraft(seId: string, rowIdx: number, field: 'reps' | 'kg', value: string) {
    setDrafts((prev) => {
      const next = new Map(prev)
      const rows = [...(next.get(seId) ?? [])]
      rows[rowIdx] = { ...rows[rowIdx], [field]: value }
      next.set(seId, rows)
      return next
    })
  }

  function addRow(seId: string) {
    setDrafts((prev) => {
      const next = new Map(prev)
      const rows = next.get(seId) ?? []
      next.set(seId, [...rows, { reps: '', kg: '' }])
      return next
    })
  }

  async function addExercise(exercise: Exercise) {
    setShowPicker(false)
    try {
      const ts        = now()
      const nextOrder = data?.sessionExercises.length ?? 0
      const seId      = crypto.randomUUID()
      await db.sessionExercises.add({
        id:               seId,
        workoutSessionId: session.id,
        exerciseId:       exercise.id,
        order:            nextOrder,
        notes:            '',
        createdAt:        ts,
        updatedAt:        ts,
        syncedAt:         null,
        deleted:          false,
      })
      // Add empty rows straight away (the useEffect above will also catch it,
      // but this avoids a brief blank state)
      const n = 3
      setDrafts((prev) => {
        const next = new Map(prev)
        next.set(seId, Array.from({ length: n }, () => ({ reps: '', kg: '' })))
        return next
      })
    } catch {
      showToast('Failed to add exercise. Please try again.')
    }
  }

  async function removeExercise(seId: string) {
    try {
      await db.sessionExercises.update(seId, { deleted: true, updatedAt: now(), syncedAt: null })
      setDrafts((prev) => {
        const next = new Map(prev)
        next.delete(seId)
        return next
      })
    } catch {
      showToast('Failed to remove exercise.')
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const ts = now()
      for (const [seId, rows] of drafts) {
        const validRows = rows.filter(
          (r) => r.reps.trim() !== '' && r.kg.trim() !== '' &&
                 !isNaN(Number(r.reps)) && !isNaN(Number(r.kg)),
        )
        // Soft-delete all existing sets for this sessionExercise
        await db.sets
          .where('sessionExerciseId').equals(seId)
          .modify({ deleted: true, updatedAt: ts, syncedAt: null })
        // Bulk add the new sets
        if (validRows.length > 0) {
          await db.sets.bulkAdd(
            validRows.map((r, i) => ({
              id:                crypto.randomUUID(),
              sessionExerciseId: seId,
              setNumber:         i + 1,
              reps:              parseInt(r.reps, 10),
              weight:            parseFloat(r.kg),
              rpe:               null,
              rir:               null,
              notes:             '',
              isWarmup:          false,
              machineSetting:    '',
              createdAt:         ts,
              updatedAt:         ts,
              syncedAt:          null,
              deleted:           false,
            })),
          )
        }
      }
      await db.workoutSessions.update(session.id, {
        finishedAt: ts,
        updatedAt:  ts,
        syncedAt:   null,
      })
      navigate('/programs')
    } catch {
      showToast('Failed to save workout. Please try again.')
      setSaving(false)
    }
  }

  async function handleDiscard() {
    try {
      await db.workoutSessions.update(session.id, {
        deleted:   true,
        updatedAt: now(),
        syncedAt:  null,
      })
    } catch { /* best-effort */ }
    navigate('/programs')
  }

  if (!data) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const { sessionExercises, exerciseMap, dayExerciseMap } = data

  return (
    <div style={{ paddingBottom: 'calc(148px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Fixed header ── */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-app-card border-b border-app-border px-4 flex items-center h-14">
        <button
          onClick={() => setShowDiscard(true)}
          className="text-sm font-semibold text-app-muted w-16"
        >
          Cancel
        </button>

        <div className="flex-1 flex items-center justify-center gap-3 text-app-muted">
          {/* Clock icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-mono">{formatElapsed(elapsed)}</span>

          {/* Chat icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>

          {/* Dots icon */}
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
            <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
          </svg>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="text-sm font-bold text-accent-dark w-16 text-right disabled:opacity-50"
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>

      {/* ── Auto fill toggle ── */}
      <div className="mt-14 px-4 py-3 flex items-center justify-between bg-app-card border-b border-app-border">
        <span className="text-sm text-app-text">Auto fill stats</span>
        <button
          onClick={() => setAutoFill((v) => !v)}
          className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${autoFill ? 'bg-blue-500' : 'bg-gray-300'}`}
          role="switch"
          aria-checked={autoFill}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoFill ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>
      </div>

      {/* ── Exercise blocks ── */}
      {sessionExercises.length === 0 ? (
        <div className="mx-4 mt-4 rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
          Tap <strong className="text-app-text">Add Exercise</strong> to get started.
        </div>
      ) : (
        sessionExercises.map((se) => {
          const exercise = exerciseMap.get(se.exerciseId)
          const dayEx    = dayExerciseMap.get(se.exerciseId)
          const rows     = drafts.get(se.id) ?? []
          const prev     = prevData.get(se.exerciseId) ?? []
          if (!exercise) return null

          return (
            <div key={se.id} className="bg-app-card border-b border-app-border mb-2">
              {/* Exercise header */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <ExerciseThumb category={exercise.category} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] text-app-text truncate">{exercise.name}</p>
                  {dayEx && (
                    <p className="text-xs text-app-muted mt-0.5">
                      {dayEx.targetSets} sets × {dayEx.targetReps}
                    </p>
                  )}
                </div>
                {/* Dots menu — tapping removes the exercise */}
                <button
                  onClick={() => removeExercise(se.id)}
                  className="text-app-faint p-2 active:text-red-500"
                  aria-label={`Remove ${exercise.name}`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              {/* Rest row */}
              {dayEx?.restSecs != null && (
                <div className="flex items-center justify-between px-4 py-2 bg-app-bg border-t border-app-border">
                  <div className="flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-app-muted">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span className="text-xs text-app-muted">Rest between each set</span>
                  </div>
                  <button
                    onClick={() => setRestTimer({ secs: dayEx.restSecs!, exerciseName: exercise.name })}
                    className="rounded-full border border-blue-300 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 active:bg-blue-100"
                  >
                    {dayEx.restSecs}s
                  </button>
                </div>
              )}

              {/* Set table */}
              <div className="px-4 pb-2">
                {/* Table header */}
                <div className="flex items-center py-2 border-b border-app-border">
                  <span className="w-8 text-xs font-semibold text-app-faint">Set</span>
                  <span className="flex-1 text-xs font-semibold text-app-faint">Previous</span>
                  <span className="w-[68px] text-xs font-semibold text-app-faint text-center">Reps</span>
                  <span className="w-[68px] text-xs font-semibold text-app-faint text-center">Kg</span>
                </div>

                {/* Set rows */}
                {rows.map((row, i) => (
                  <div key={i} className="flex items-center py-2 border-b border-app-border/40">
                    <span className="w-8 text-sm text-app-muted">{i + 1}</span>
                    <span className="flex-1 text-xs text-app-faint">
                      {prev[i] ? `${prev[i].reps} × ${prev[i].kg} kg` : '—'}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={row.reps}
                      onChange={(e) => updateDraft(se.id, i, 'reps', e.target.value)}
                      className="w-[60px] h-8 rounded-lg border border-app-border bg-white text-app-text text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-blue-50 mx-1"
                      placeholder="—"
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.kg}
                      step={0.5}
                      onChange={(e) => updateDraft(se.id, i, 'kg', e.target.value)}
                      className="w-[60px] h-8 rounded-lg border border-app-border bg-white text-app-text text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-blue-50 mx-1"
                      placeholder="—"
                    />
                  </div>
                ))}

                {/* Add set button */}
                <button
                  onClick={() => addRow(se.id)}
                  className="flex items-center gap-2 py-3 text-blue-500 text-sm font-semibold"
                >
                  <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                  </span>
                  Add new set
                </button>
              </div>
            </div>
          )
        })
      )}

      {/* ── Add Exercise button ── */}
      <button
        onClick={() => setShowPicker(true)}
        className="w-full py-4 text-blue-500 text-sm font-semibold flex items-center justify-center gap-2 bg-app-card border-b border-app-border"
      >
        <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
        </span>
        Add Exercise
      </button>

      {/* ── Sticky bottom Save button ── */}
      <div className="fixed bottom-[72px] left-0 right-0 bg-app-card border-t border-app-border px-4 py-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-accent text-app-text py-3.5 font-bold text-sm active:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Discard confirmation modal ── */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDiscard(false)} />
          <div className="relative z-50 w-full max-w-sm mx-auto bg-app-card rounded-t-3xl px-5 pt-6 pb-8 safe-area-bottom">
            <h2 className="text-lg font-extrabold text-app-text mb-1">Discard workout?</h2>
            <p className="text-sm text-app-muted mb-6">Your progress will not be saved.</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDiscard}
                className="w-full rounded-2xl bg-red-500 text-white py-3.5 font-bold text-sm active:bg-red-600"
              >
                Discard
              </button>
              <button
                onClick={() => setShowDiscard(false)}
                className="w-full rounded-2xl bg-app-bg text-app-text py-3.5 font-bold text-sm active:bg-gray-100"
              >
                Keep Going
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exercise picker overlay ── */}
      {showPicker && (
        <ExercisePicker
          onSelect={addExercise}
          onClose={() => setShowPicker(false)}
          existingIds={existingExerciseIds}
        />
      )}

      {/* ── Rest timer overlay ── */}
      {restTimer && (
        <RestTimer
          defaultSecs={restTimer.secs}
          exerciseName={restTimer.exerciseName}
          onDismiss={() => setRestTimer(null)}
        />
      )}
    </div>
  )
}
