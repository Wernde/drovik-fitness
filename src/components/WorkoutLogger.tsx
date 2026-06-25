import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { WorkoutSession, SessionExercise, DayExercise, Exercise, ExerciseVideo } from '../db/db'
import ExercisePicker from './ExercisePicker'
import RestTimer from './RestTimer'
import WorkoutSummary from './WorkoutSummary'
import { Button } from './ui'
import { PremiumIconTile } from './BrandIcon'
import { ExerciseThumb } from './ExerciseThumb'
import { useToast } from '../contexts/ToastContext'
import { useUnits } from '../contexts/UnitsContext'
import { kgToDisplay, displayToKg, weightLabel } from '../lib/units'
import { getYouTubeId, getYouTubeThumbnail } from '../lib/youtube'
import type { LoggedSet } from '../db/db'

// ── Types ─────────────────────────────────────────────────────────────────────

type DraftRow = { reps: string; kg: string; done: boolean; note: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const DEFAULT_REST_SECS = 90

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
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const { units }     = useUnits()

  const [drafts,          setDrafts]          = useState<Map<string, DraftRow[]>>(new Map())
  const [prevData,        setPrevData]        = useState<Map<string, DraftRow[]>>(new Map())
  const [autoFill,        setAutoFill]        = useState(() => localStorage.getItem('drovik:autoFill') === 'true')
  const [elapsed,         setElapsed]         = useState(0)
  const [saving,          setSaving]          = useState(false)
  const [showDiscard,     setShowDiscard]     = useState(false)
  const [showPicker,      setShowPicker]      = useState(false)
  const [showSummary,     setShowSummary]     = useState(false)
  const [lastSavedAt,     setLastSavedAt]     = useState<string | null>(null)
  const [saveError,       setSaveError]       = useState<string | null>(null)
  const [showOptions,     setShowOptions]     = useState(false)
  const [restTimer,       setRestTimer]       = useState<{ secs: number; exerciseName: string } | null>(null)
  const [expandedGuide,   setExpandedGuide]   = useState<Set<string>>(new Set())
  const [expandedExNote,  setExpandedExNote]  = useState<Set<string>>(new Set())
  const [exerciseNotes,   setExerciseNotes]   = useState<Map<string, string>>(new Map())
  const [expandedSetNote, setExpandedSetNote] = useState<Set<string>>(new Set())
  const [exerciseMenu,    setExerciseMenu]    = useState<string | null>(null)
  const [substituteSeId,  setSubstituteSeId]  = useState<string | null>(null)
  const [expandedVideos,  setExpandedVideos]  = useState<Set<string>>(new Set())
  const [localVideoUrls,  setLocalVideoUrls]  = useState<Map<string, string>>(new Map())

  const draftsInit    = useRef(false)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveSetsRef   = useRef<(silent?: boolean) => Promise<boolean>>(() => Promise.resolve(false))

  // Live data from DB — must be declared before any useEffect that uses it in deps
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

  // Elapsed timer
  useEffect(() => {
    const start = new Date(session.startedAt).getTime()
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session.startedAt])

  // Load local video blobs for all exercises in this session
  useEffect(() => {
    if (!data) return
    const exerciseIds = data.sessionExercises.map((se) => se.exerciseId)
    if (exerciseIds.length === 0) return

    db.exerciseVideos.where('exerciseId').anyOf(exerciseIds).toArray().then((rows: ExerciseVideo[]) => {
      if (rows.length === 0) return
      const map = new Map<string, string>()
      for (const row of rows) {
        map.set(row.exerciseId, URL.createObjectURL(row.data))
      }
      setLocalVideoUrls((prev) => {
        for (const [id, url] of prev) {
          if (!map.has(id)) URL.revokeObjectURL(url)
        }
        return map
      })
    })

    return () => {
      setLocalVideoUrls((prev) => {
        for (const url of prev.values()) URL.revokeObjectURL(url)
        return new Map()
      })
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialise drafts once when data arrives
  useEffect(() => {
    if (!data || draftsInit.current) return
    draftsInit.current = true
    initDrafts(data.sessionExercises, data.dayExerciseMap)
    loadPrevious(data.sessionExercises)
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Add empty rows when a new exercise is added after init
  useEffect(() => {
    if (!data || !draftsInit.current) return
    setDrafts((prev) => {
      const next = new Map(prev)
      for (const se of data.sessionExercises) {
        if (!next.has(se.id)) {
          const n = data.dayExerciseMap.get(se.exerciseId)?.targetSets ?? 3
          next.set(se.id, Array.from({ length: n }, () => ({ reps: '', kg: '', done: false, note: '' })))
        }
      }
      return next
    })
  }, [data])

  async function initDrafts(seList: SessionExercise[], dayExMap: Map<string, DayExercise>) {
    const next     = new Map<string, DraftRow[]>()
    const notesMap = new Map<string, string>()
    for (const se of seList) {
      notesMap.set(se.id, se.notes ?? '')
      const existing = await db.sets
        .where('sessionExerciseId').equals(se.id)
        .filter((s) => !s.deleted)
        .toArray()
      existing.sort((a, b) => a.setNumber - b.setNumber)

      if (existing.length > 0) {
        next.set(se.id, existing.map((s) => ({
          reps: String(s.reps),
          kg:   String(kgToDisplay(s.weight, units.weight)),
          done: true,
          note: s.notes ?? '',
        })))
      } else {
        const n = dayExMap.get(se.exerciseId)?.targetSets ?? 3
        next.set(se.id, Array.from({ length: n }, () => ({ reps: '', kg: '', done: false, note: '' })))
      }
    }
    setDrafts(next)
    setExerciseNotes(notesMap)
  }

  async function loadPrevious(seList: SessionExercise[]) {
    const prevMap = new Map<string, DraftRow[]>()
    for (const se of seList) {
      const allSes = await db.sessionExercises
        .filter((x) => x.exerciseId === se.exerciseId && !x.deleted && x.workoutSessionId !== session.id)
        .toArray()
      const sessIds = [...new Set(allSes.map((x) => x.workoutSessionId))]
      const sessions = (await Promise.all(sessIds.map((id) => db.workoutSessions.get(id))))
        .filter((s): s is WorkoutSession => !!s && !!s.finishedAt && !s.deleted)
        .sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!))
      if (sessions.length === 0) continue
      const prevSe = allSes.find((x) => x.workoutSessionId === sessions[0].id)
      if (!prevSe) continue
      const sets = await db.sets
        .where('sessionExerciseId').equals(prevSe.id)
        .filter((s) => !s.deleted && !s.isWarmup)
        .toArray()
      sets.sort((a, b) => a.setNumber - b.setNumber)
      prevMap.set(se.exerciseId, sets.map((s) => ({
        reps: String(s.reps),
        kg:   String(kgToDisplay(s.weight, units.weight)),
        done: false,
        note: '',
      })))
    }
    setPrevData(prevMap)
  }

  // Auto-fill empty rows when toggle turns on
  useEffect(() => {
    if (!autoFill || !data) return
    setDrafts((prev) => {
      const next = new Map(prev)
      for (const se of data.sessionExercises) {
        const pd = prevData.get(se.exerciseId)
        if (!pd || pd.length === 0) continue
        const existing = next.get(se.id) ?? []
        const filled = existing.map((row, i) =>
          row.reps === '' && row.kg === '' && pd[i]
            ? { ...row, reps: pd[i].reps, kg: pd[i].kg }
            : row,
        )
        next.set(se.id, filled)
      }
      return next
    })
  }, [autoFill]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref current so the timer always calls the latest closure
  useEffect(() => { saveSetsRef.current = saveSets })

  // Auto-save 1.5 s after the last draft change — protects against app close/crash
  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      if (!draftsInit.current) return
      saveSetsRef.current(true)
    }, 1500)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [drafts, exerciseNotes]) // eslint-disable-line react-hooks/exhaustive-deps

  const existingExerciseIds = useMemo(
    () => new Set(data?.sessionExercises.map((se) => se.exerciseId) ?? []),
    [data],
  )

  // When substituting, un-dim the exercise being replaced so it can be re-selected
  const substituteExistingIds = useMemo(() => {
    if (!substituteSeId || !data) return existingExerciseIds
    const sub = data.sessionExercises.find((se) => se.id === substituteSeId)
    if (!sub) return existingExerciseIds
    const ids = new Set(existingExerciseIds)
    ids.delete(sub.exerciseId)
    return ids
  }, [substituteSeId, data, existingExerciseIds])

  function updateDraft(seId: string, rowIdx: number, field: 'reps' | 'kg' | 'note', value: string) {
    setDrafts((prev) => {
      const next = new Map(prev)
      const rows = [...(next.get(seId) ?? [])]
      rows[rowIdx] = { ...rows[rowIdx], [field]: value }
      next.set(seId, rows)
      return next
    })
  }

  // Copy previous session's values for a single row
  function fillRowFromPrev(seId: string, rowIdx: number, exerciseId: string) {
    const pd = prevData.get(exerciseId)
    if (!pd?.[rowIdx]) return
    setDrafts((prev) => {
      const next = new Map(prev)
      const rows = [...(next.get(seId) ?? [])]
      rows[rowIdx] = { ...rows[rowIdx], reps: pd[rowIdx].reps, kg: pd[rowIdx].kg }
      next.set(seId, rows)
      return next
    })
  }

  function addRow(seId: string) {
    setDrafts((prev) => {
      const next = new Map(prev)
      const rows = next.get(seId) ?? []
      next.set(seId, [...rows, { reps: '', kg: '', done: false, note: '' }])
      return next
    })
  }

  function markDone(seId: string, rowIdx: number, restSecs: number | undefined, exerciseName: string) {
    const currentlyDone = drafts.get(seId)?.[rowIdx]?.done ?? false
    setDrafts((prev) => {
      const next = new Map(prev)
      const rows = [...(next.get(seId) ?? [])]
      rows[rowIdx] = { ...rows[rowIdx], done: !rows[rowIdx].done }
      next.set(seId, rows)
      return next
    })
    if (!currentlyDone) {
      setRestTimer({ secs: restSecs ?? DEFAULT_REST_SECS, exerciseName })
    }
  }

  async function handleSubstitute(exercise: Exercise) {
    if (!substituteSeId) return
    const seId = substituteSeId
    setSubstituteSeId(null)
    try {
      const ts = now()
      await db.transaction('rw', db.sessionExercises, db.sets, db.workoutSessions, async () => {
        await db.sessionExercises.update(seId, { exerciseId: exercise.id, updatedAt: ts, syncedAt: null })
        await db.sets
          .where('sessionExerciseId').equals(seId)
          .modify({ deleted: true, updatedAt: ts, syncedAt: null })
        await db.workoutSessions.update(session.id, { updatedAt: ts, syncedAt: null })
      })
      // Reset drafts for the new exercise
      setDrafts((prev) => {
        const next = new Map(prev)
        next.set(seId, Array.from({ length: 3 }, () => ({ reps: '', kg: '', done: false, note: '' })))
        return next
      })
      await loadPreviousSingle(seId, exercise.id)
    } catch {
      showToast('Failed to substitute exercise.')
    }
  }

  async function loadPreviousSingle(seId: string, exerciseId: string) {
    const allSes = await db.sessionExercises
      .filter((x) => x.exerciseId === exerciseId && !x.deleted && x.workoutSessionId !== session.id)
      .toArray()
    const sessIds = [...new Set(allSes.map((x) => x.workoutSessionId))]
    const sessions = (await Promise.all(sessIds.map((id) => db.workoutSessions.get(id))))
      .filter((s): s is WorkoutSession => !!s && !!s.finishedAt && !s.deleted)
      .sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!))
    if (sessions.length === 0) return
    const prevSe = allSes.find((x) => x.workoutSessionId === sessions[0].id)
    if (!prevSe) return
    const sets = await db.sets
      .where('sessionExerciseId').equals(prevSe.id)
      .filter((s) => !s.deleted && !s.isWarmup)
      .toArray()
    sets.sort((a, b) => a.setNumber - b.setNumber)
    setPrevData((prev) => {
      const next = new Map(prev)
      next.set(exerciseId, sets.map((s) => ({
        reps: String(s.reps),
        kg:   String(kgToDisplay(s.weight, units.weight)),
        done: false,
        note: '',
      })))
      return next
    })
  }

  async function addExercise(exercise: Exercise) {
    setShowPicker(false)
    try {
      const ts        = now()
      const nextOrder = data?.sessionExercises.length ?? 0
      const seId      = crypto.randomUUID()
      await db.transaction('rw', db.sessionExercises, db.workoutSessions, async () => {
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
        await db.workoutSessions.update(session.id, { updatedAt: ts, syncedAt: null })
      })
      setDrafts((prev) => {
        const next = new Map(prev)
        next.set(seId, Array.from({ length: 3 }, () => ({ reps: '', kg: '', done: false, note: '' })))
        return next
      })
    } catch {
      showToast('Failed to add exercise. Please try again.')
    }
  }

  async function removeExercise(seId: string) {
    try {
      const ts = now()
      await db.transaction('rw', db.sessionExercises, db.sets, db.workoutSessions, async () => {
        await db.sessionExercises.update(seId, { deleted: true, updatedAt: ts, syncedAt: null })
        await db.sets
          .where('sessionExerciseId').equals(seId)
          .modify({ deleted: true, updatedAt: ts, syncedAt: null })
        await db.workoutSessions.update(session.id, { updatedAt: ts, syncedAt: null })
      })
      setDrafts((prev) => {
        const next = new Map(prev)
        next.delete(seId)
        return next
      })
    } catch {
      showToast('Failed to remove exercise.')
    }
  }

  async function saveSets(silent = false): Promise<boolean> {
    if (!silent) setSaving(true)
    try {
      const ts = now()
      await db.transaction('rw', db.sets, db.sessionExercises, db.workoutSessions, async () => {
        if (data) {
          for (const se of data.sessionExercises) {
            const note = exerciseNotes.get(se.id) ?? ''
            await db.sessionExercises.update(se.id, { notes: note, updatedAt: ts, syncedAt: null })
          }
        }
        for (const [seId, rows] of drafts) {
          const validRows = rows.filter(
            (r) => r.reps.trim() !== '' && r.kg.trim() !== '' &&
                   !isNaN(Number(r.reps)) && !isNaN(Number(r.kg)),
          )
          const existing = await db.sets
            .where('sessionExerciseId').equals(seId)
            .toArray()
          existing.sort((a, b) => a.setNumber - b.setNumber)

          const usedIds = new Set<string>()
          for (const [i, r] of validRows.entries()) {
            const setNumber = i + 1
            const current =
              existing.find((set) => set.setNumber === setNumber && !set.deleted && !usedIds.has(set.id)) ??
              existing.find((set) => set.setNumber === setNumber && !usedIds.has(set.id))
            const payload: Omit<LoggedSet, 'id' | 'createdAt' | 'sessionExerciseId'> = {
              setNumber,
              reps:           parseInt(r.reps, 10),
              weight:         displayToKg(parseFloat(r.kg), units.weight),
              rpe:            current?.rpe ?? null,
              rir:            current?.rir ?? null,
              notes:          r.note,
              isWarmup:       current?.isWarmup ?? false,
              machineSetting: current?.machineSetting ?? '',
              updatedAt:      ts,
              syncedAt:       null,
              deleted:        false,
            }

            if (current) {
              usedIds.add(current.id)
              await db.sets.update(current.id, payload)
            } else {
              const id = crypto.randomUUID()
              usedIds.add(id)
              await db.sets.add({
                id,
                sessionExerciseId: seId,
                createdAt:         ts,
                ...payload,
              })
            }
          }

          for (const set of existing) {
            if (!usedIds.has(set.id) && !set.deleted) {
              await db.sets.update(set.id, { deleted: true, updatedAt: ts, syncedAt: null })
            }
          }
        }
        await db.workoutSessions.update(session.id, { updatedAt: ts, syncedAt: null })
      })
      setLastSavedAt(ts)
      setSaveError(null)
      if (!silent) setSaving(false)
      return true
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      if (!silent) {
        showToast('Failed to save workout. Please try again.')
        setSaving(false)
      }
      return false
    }
  }

  async function handleFinishPress() {
    const ok = await saveSets()
    if (ok) setShowSummary(true)
  }

  async function handleComplete() {
    setSaving(true)
    try {
      const ts = now()
      await db.workoutSessions.update(session.id, { finishedAt: ts, updatedAt: ts, syncedAt: null })
      navigate(`/history/${session.id}`)
    } catch {
      showToast('Failed to complete workout. Please try again.')
      setSaving(false)
    }
  }

  async function handleDiscard() {
    try {
      const ts = now()
      const sessionExercises = await db.sessionExercises
        .where('workoutSessionId').equals(session.id)
        .toArray()

      await db.transaction('rw', db.workoutSessions, db.sessionExercises, db.sets, async () => {
        await db.workoutSessions.update(session.id, { deleted: true, updatedAt: ts, syncedAt: null })
        await db.sessionExercises
          .where('workoutSessionId').equals(session.id)
          .modify({ deleted: true, updatedAt: ts, syncedAt: null })
        for (const se of sessionExercises) {
          await db.sets
            .where('sessionExerciseId').equals(se.id)
            .modify({ deleted: true, updatedAt: ts, syncedAt: null })
        }
      })
    } catch { /* best-effort */ }
    navigate(-1)
  }

  function toggleGuide(seId: string) {
    setExpandedGuide((prev) => {
      const next = new Set(prev)
      next.has(seId) ? next.delete(seId) : next.add(seId)
      return next
    })
  }

  function toggleExNote(seId: string) {
    setExpandedExNote((prev) => {
      const next = new Set(prev)
      next.has(seId) ? next.delete(seId) : next.add(seId)
      return next
    })
  }

  function toggleSetNote(key: string) {
    setExpandedSetNote((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  if (!data) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const { sessionExercises, exerciseMap, dayExerciseMap } = data
  const saveStatus = saveError
    ? 'Save failed'
    : lastSavedAt
      ? `Saved ${new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : null

  return (
    <div style={{ paddingBottom: 'calc(148px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Fixed header ── */}
      <div className="fixed top-0 left-0 right-0 md:left-60 z-40 bg-app-surface border-b border-app-border">
        {/* Row 1 — Cancel | Workout name | Finish */}
        <div className="px-4 flex items-center justify-between h-11 border-b border-app-border/40">
          <button
            onClick={() => setShowDiscard(true)}
            className="text-sm font-semibold text-app-muted w-16"
          >
            Cancel
          </button>
          <span className="text-sm font-extrabold text-app-text uppercase tracking-wide">
            {data.dayName ?? 'Workout'}
          </span>
          <button
            onClick={handleFinishPress}
            disabled={saving}
            className="text-sm font-bold text-accent-dark w-16 text-right disabled:opacity-50"
          >
            {saving ? '…' : 'Finish'}
          </button>
        </div>

        {/* Row 2 — Live timer (prominent) + options */}
        <div className="px-4 flex items-center justify-center h-14 relative">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse flex-shrink-0" />
            <span className="text-3xl font-mono font-extrabold text-app-text tabular-nums tracking-tight">
              {formatElapsed(elapsed)}
            </span>
          </div>
          {saveStatus && (
            <span className={`absolute left-4 bottom-1 text-[11px] font-semibold ${saveError ? 'text-red-500' : 'text-app-faint'}`}>
              {saveStatus}
            </span>
          )}
          <button
            onClick={() => setShowOptions(true)}
            className="absolute right-4 text-app-muted p-1"
            aria-label="Options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Exercise cards ── */}
      <div className="mt-[100px] px-3 pt-3 space-y-3">
        {sessionExercises.length === 0 ? (
          <div className="rounded-card border-2 border-dashed border-app-border p-8 text-center text-app-muted mt-4">
            Tap <strong className="text-app-text">Add Exercise</strong> to get started.
          </div>
        ) : (
          sessionExercises.map((se) => {
            const exercise = exerciseMap.get(se.exerciseId)
            const dayEx    = dayExerciseMap.get(se.exerciseId)
            const rows     = drafts.get(se.id) ?? []
            const prev     = prevData.get(se.exerciseId) ?? []
            if (!exercise) return null

            const guideOpen  = expandedGuide.has(se.id)
            const exNoteOpen = expandedExNote.has(se.id)
            const videoId    = exercise.videoUrl ? getYouTubeId(exercise.videoUrl) : null
            const hasVideo   = !!videoId
            const hasGuide   = !!exercise.instructions

            return (
              <div key={se.id} className="bg-app-surface rounded-card shadow-card border border-app-border overflow-hidden">

                {/* ── Exercise header ── */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <ExerciseThumb category={exercise.category} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-app-text leading-tight">{exercise.name}</p>
                    {dayEx && (
                      <p className="text-xs text-app-muted mt-0.5">
                        {dayEx.targetSets} sets × {dayEx.targetReps}
                        {dayEx.targetWeight
                          ? ` @ ${kgToDisplay(dayEx.targetWeight, units.weight)} ${weightLabel(units.weight)}`
                          : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setExerciseMenu(se.id)}
                    className="text-app-faint p-2 -mr-1 active:text-app-muted"
                    aria-label={`Options for ${exercise.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* ── Action chips (Guide / Notes) ── */}
                <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
                  {hasGuide && (
                    <button
                      onClick={() => toggleGuide(se.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors active:opacity-80 ${
                        guideOpen
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-blue-50 border-blue-200 text-blue-600'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                      </svg>
                      {guideOpen ? 'Hide Guide' : 'Guide'}
                    </button>
                  )}
                  <button
                    onClick={() => toggleExNote(se.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors active:opacity-80 ${
                      exNoteOpen
                        ? 'bg-accent border-accent text-app-text'
                        : exerciseNotes.get(se.id)
                          ? 'bg-accent-light border-accent text-accent-dark'
                          : 'bg-app-bg border-app-border text-app-muted'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                    Notes
                  </button>
                </div>

                {/* ── Video (local recording takes priority over YouTube) ── */}
                {(() => {
                  const localUrl = localVideoUrls.get(se.exerciseId)
                  if (localUrl) {
                    return (
                      <div className="mx-4 mb-3 rounded-input overflow-hidden bg-black">
                        <video
                          src={localUrl}
                          controls
                          playsInline
                          className="w-full max-h-52 object-contain"
                        />
                      </div>
                    )
                  }
                  if (!hasVideo || !videoId) return null
                  return expandedVideos.has(se.id) ? (
                    <div className="mx-4 mb-3 rounded-input overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <iframe
                        className="w-full h-full"
                        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
                        title={exercise.name}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedVideos((prev) => { const n = new Set(prev); n.add(se.id); return n })}
                      className="block relative mx-4 mb-3 rounded-input overflow-hidden active:opacity-80"
                      style={{ aspectRatio: '16/9' }}
                      aria-label={`Play ${exercise.name} tutorial`}
                    >
                      <img
                        src={getYouTubeThumbnail(videoId)}
                        alt={`${exercise.name} tutorial`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                          <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                            <path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  )
                })()}

                {/* ── Guide / Instructions panel ── */}
                {guideOpen && exercise.instructions && (
                  <div className="mx-4 mb-3 p-3 rounded-input bg-blue-50 border border-blue-100">
                    <p className="text-xs text-blue-800 leading-relaxed whitespace-pre-line">
                      {exercise.instructions}
                    </p>
                  </div>
                )}

                {/* ── Exercise notes textarea ── */}
                {exNoteOpen && (
                  <div className="mx-4 mb-3">
                    <textarea
                      value={exerciseNotes.get(se.id) ?? ''}
                      onChange={(e) =>
                        setExerciseNotes((prev) => {
                          const next = new Map(prev)
                          next.set(se.id, e.target.value)
                          return next
                        })
                      }
                      placeholder="Notes for this exercise (e.g. technique cues, machine settings)…"
                      rows={2}
                      className="w-full rounded-input border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder-app-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-label resize-none"
                    />
                  </div>
                )}

                {/* ── Rest indicator ── */}
                {dayEx?.restSecs != null && (
                  <div className="flex items-center justify-between px-4 py-2 bg-app-bg border-t border-app-border">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-app-muted flex-shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-app-muted">Rest between sets</span>
                    </div>
                    <button
                      onClick={() => setRestTimer({ secs: dayEx.restSecs!, exerciseName: exercise.name })}
                      className="rounded-full border border-blue-200 bg-blue-50 text-blue-600 text-xs font-bold px-3 py-1 active:bg-blue-100"
                    >
                      {dayEx.restSecs}s
                    </button>
                  </div>
                )}

                {/* ── Set table ── */}
                <div className="px-4 pb-2">
                  {/* Header row */}
                  <div className="flex items-center py-2 border-b border-app-border">
                    <span className="w-8 text-xs font-semibold text-app-faint">Set</span>
                    <span className="flex-1 text-xs font-semibold text-app-faint">
                      Previous
                      <span className="font-normal opacity-60 ml-1">↑ tap to fill</span>
                    </span>
                    <span className="w-[58px] text-xs font-semibold text-app-faint text-center">Reps</span>
                    <span className="w-[58px] text-xs font-semibold text-app-faint text-center">
                      {weightLabel(units.weight).toUpperCase()}
                    </span>
                    <span className="w-9" />
                  </div>

                  {/* Set rows */}
                  {rows.map((row, i) => {
                    const prevRow  = prev[i]
                    const noteKey  = `${se.id}-${i}`
                    const noteOpen = expandedSetNote.has(noteKey)
                    return (
                      <div key={i}>
                        <div
                          className={`flex items-center py-2.5 transition-colors rounded-lg my-0.5 ${
                            row.done ? 'bg-amber-50' : ''
                          }`}
                        >
                          {/* Set number */}
                          <span className={`w-8 text-sm font-bold ${row.done ? 'text-amber-600' : 'text-app-muted'}`}>
                            {i + 1}
                          </span>

                          {/* Previous — tappable pill to copy values */}
                          {prevRow ? (
                            <button
                              onClick={() => fillRowFromPrev(se.id, i, se.exerciseId)}
                              className="flex-1 text-left"
                              title="Tap to fill this set"
                            >
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs transition-colors ${
                                row.done
                                  ? 'bg-amber-100 border-amber-200 text-amber-700'
                                  : 'bg-app-bg border-app-border text-app-muted active:bg-accent/20 active:border-accent'
                              }`}>
                                {prevRow.reps} × {prevRow.kg}
                                <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-50 flex-shrink-0">
                                  <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
                                </svg>
                              </span>
                            </button>
                          ) : (
                            <span className="flex-1 text-xs text-app-faint px-2">—</span>
                          )}

                          {/* Reps input */}
                          <input
                            type="number"
                            inputMode="numeric"
                            value={row.reps}
                            onChange={(e) => updateDraft(se.id, i, 'reps', e.target.value)}
                            className={`w-[54px] h-10 rounded-input border text-center text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-label focus-visible:border-accent mx-1 transition-colors ${
                              row.done
                                ? 'bg-amber-100 border-amber-200 text-amber-800'
                                : 'bg-app-surface border-app-border text-app-text focus:bg-amber-50'
                            }`}
                            placeholder="—"
                          />

                          {/* Weight input */}
                          <input
                            type="number"
                            inputMode="decimal"
                            value={row.kg}
                            step={units.weight === 'lbs' ? 1 : 0.5}
                            onChange={(e) => updateDraft(se.id, i, 'kg', e.target.value)}
                            className={`w-[54px] h-10 rounded-input border text-center text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-label focus-visible:border-accent mx-1 transition-colors ${
                              row.done
                                ? 'bg-amber-100 border-amber-200 text-amber-800'
                                : 'bg-app-surface border-app-border text-app-text focus:bg-amber-50'
                            }`}
                            placeholder="—"
                          />

                          {/* Done checkmark */}
                          <button
                            onClick={() => markDone(se.id, i, dayEx?.restSecs, exercise.name)}
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                              row.done
                                ? 'bg-accent'
                                : 'bg-app-bg border-2 border-app-border'
                            }`}
                          >
                            {row.done && (
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-text">
                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        </div>

                        {/* Per-set note toggle */}
                        <div className="flex items-center gap-2 pl-8 pb-1">
                          <button
                            onClick={() => toggleSetNote(noteKey)}
                            className="flex items-center gap-1 text-[11px] text-app-faint active:text-app-muted"
                          >
                            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2 4h12M2 8h8M2 12h6" />
                            </svg>
                            {noteOpen ? 'Hide note' : row.note ? 'Edit note' : '+ note'}
                          </button>
                          {row.note && !noteOpen && (
                            <span className="text-[11px] text-app-muted truncate max-w-[200px] italic">
                              {row.note}
                            </span>
                          )}
                        </div>
                        {noteOpen && (
                          <div className="pl-8 pr-2 pb-2">
                            <input
                              type="text"
                              value={row.note}
                              onChange={(e) => updateDraft(se.id, i, 'note', e.target.value)}
                              placeholder="Note for this set…"
                              className="w-full rounded-input border border-app-border bg-app-bg px-3 py-1.5 text-xs text-app-text placeholder-app-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-label"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Add set */}
                  <button
                    onClick={() => addRow(se.id)}
                    className="flex items-center gap-2 py-3 text-blue-500 text-sm font-semibold"
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                      </svg>
                    </span>
                    Add set
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* ── Add Exercise button ── */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-4 text-blue-500 text-sm font-semibold flex items-center justify-center gap-2 bg-app-surface rounded-card border border-dashed border-blue-200 shadow-card active:bg-blue-50"
        >
          <PremiumIconTile name="plus" tone="blue" size="xs" usage="button" active iconSize={18} />
          Add Exercise
        </button>
      </div>

      {/* ── Sticky Finish Workout button ── */}
      <div
        className="fixed left-0 right-0 md:left-60 bg-app-surface/90 backdrop-blur-sm border-t border-app-border px-4 py-3"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Button variant="primary" fullWidth size="lg" onClick={handleFinishPress} disabled={saving}>
          {saving ? 'Saving…' : 'Finish Workout'}
        </Button>
      </div>

      {/* ── Options sheet ── */}
      {showOptions && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowOptions(false)} />
          <div className="relative z-50 w-full max-w-sm mx-auto bg-app-surface rounded-t-[24px] px-5 pt-4 pb-8">
            <div className="w-10 h-1 rounded-full bg-app-border mx-auto mb-5" />
            <h2 className="text-base font-extrabold text-app-text mb-4">Workout Options</h2>

            {/* Auto-fill toggle */}
            <div className="flex items-center justify-between py-3 border-b border-app-border">
              <div>
                <p className="text-sm font-semibold text-app-text">Auto-fill from last session</p>
                <p className="text-xs text-app-muted mt-0.5">Fill all empty sets with previous values</p>
              </div>
              <button
                onClick={() => {
                    const next = !autoFill
                    setAutoFill(next)
                    localStorage.setItem('drovik:autoFill', String(next))
                  }}
                className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${autoFill ? 'bg-blue-500' : 'bg-gray-300'}`}
                role="switch"
                aria-checked={autoFill}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoFill ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>

            {/* Discard */}
            <button
              onClick={() => { setShowOptions(false); setShowDiscard(true) }}
              className="w-full flex items-center gap-3 py-3 text-red-500"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              <span className="text-sm font-semibold">Discard Workout</span>
            </button>

            <Button variant="secondary" fullWidth size="lg" className="mt-2" onClick={() => setShowOptions(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* ── Discard confirmation modal ── */}
      {showDiscard && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDiscard(false)} />
          <div className="relative z-50 w-full max-w-sm mx-auto bg-app-surface rounded-t-[24px] px-5 pt-6 pb-8">
            <h2 className="text-lg font-extrabold text-app-text mb-1">Discard workout?</h2>
            <p className="text-sm text-app-muted mb-6">Your progress will not be saved.</p>
            <div className="flex flex-col gap-2">
              <Button variant="danger" fullWidth size="lg" onClick={handleDiscard}>
                Discard
              </Button>
              <Button variant="secondary" fullWidth size="lg" onClick={() => setShowDiscard(false)}>
                Keep Going
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exercise action sheet (substitute / remove) ── */}
      {exerciseMenu !== null && (() => {
        const menuSe = sessionExercises.find((se) => se.id === exerciseMenu)
        const menuEx = menuSe ? exerciseMap.get(menuSe.exerciseId) : null
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ paddingBottom: "calc(72px + env(safe-area-inset-bottom, 0px))" }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setExerciseMenu(null)} />
            <div className="relative z-50 w-full max-w-sm mx-auto bg-app-surface rounded-t-[24px] px-5 pt-4 pb-8">
              <div className="w-10 h-1 rounded-full bg-app-border mx-auto mb-4" />
              {menuEx && (
                <p className="text-base font-extrabold text-app-text mb-4 truncate">{menuEx.name}</p>
              )}

              {/* Substitute */}
              <button
                onClick={() => { setSubstituteSeId(exerciseMenu); setExerciseMenu(null) }}
                className="w-full flex items-center gap-3 py-3.5 border-b border-app-border active:bg-app-bg rounded-xl"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-blue-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-app-text">Substitute Exercise</p>
                  <p className="text-xs text-app-muted mt-0.5">Swap for a different exercise</p>
                </div>
              </button>

              {/* Remove */}
              <button
                onClick={() => { removeExercise(exerciseMenu); setExerciseMenu(null) }}
                className="w-full flex items-center gap-3 py-3.5 active:bg-red-50 rounded-xl"
              >
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-red-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-red-500">Remove Exercise</p>
              </button>

              <Button variant="secondary" fullWidth className="mt-3" onClick={() => setExerciseMenu(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )
      })()}

      {/* ── Exercise picker (add or substitute) ── */}
      {(showPicker || substituteSeId !== null) && (
        <ExercisePicker
          onSelect={substituteSeId ? handleSubstitute : addExercise}
          onClose={() => { setShowPicker(false); setSubstituteSeId(null) }}
          existingIds={substituteSeId ? substituteExistingIds : existingExerciseIds}
        />
      )}

      {/* ── Rest timer ── */}
      {restTimer && (
        <RestTimer
          defaultSecs={restTimer.secs}
          exerciseName={restTimer.exerciseName}
          onDismiss={() => setRestTimer(null)}
        />
      )}

      {/* ── Post-workout summary ── */}
      {showSummary && (
        <WorkoutSummary
          session={session}
          onFinish={handleComplete}
          onBack={() => setShowSummary(false)}
        />
      )}

    </div>
  )
}
