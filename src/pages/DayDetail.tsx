import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import DragList from '../components/DragList'
import { db, now, today } from '../db/db'
import type { DayExercise, Exercise } from '../db/db'
import ExercisePicker from '../components/ExercisePicker'
import DayExerciseForm from '../components/DayExerciseForm'
import { getYouTubeId, getYouTubeThumbnail } from '../lib/youtube'
import { CAT_ICON_PATHS } from '../components/ExerciseThumb'
import MuscleIcon from '../components/MuscleIcon'

const EQUIPMENT_LABELS: Record<string, string> = {
  barbell:    'Barbell',
  dumbbell:   'Dumbbell',
  cable:      'Cable',
  machine:    'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band:       'Resistance Band',
  cardio:     'Cardio',
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DayDetail() {
  const { programId, dayId } = useParams<{ programId: string; dayId: string }>()
  const navigate              = useNavigate()

  const [editMode,        setEditMode]        = useState(false)
  const [showMenu,        setShowMenu]        = useState(false)
  const [showPicker,      setShowPicker]      = useState(false)
  const [pendingExercise, setPendingExercise] = useState<Exercise | null>(null)
  const [editingDE,       setEditingDE]       = useState<DayExercise | null>(null)
  const [confirmDelete,   setConfirmDelete]   = useState<string | null>(null)
  const [starting,        setStarting]        = useState(false)
  const [startError,      setStartError]      = useState<string | null>(null)
  // Detail sheet state
  const [detailDE,        setDetailDE]        = useState<DayExercise | null>(null)
  const [guideOpen,       setGuideOpen]       = useState(false)
  const [detailVideoOpen, setDetailVideoOpen] = useState(false)

  const day     = useLiveQuery(() => (dayId     ? db.workoutDays.get(dayId)     : undefined), [dayId])
  const program = useLiveQuery(() => (programId ? db.programs.get(programId)    : undefined), [programId])

  const dayExercises = useLiveQuery(
    () => dayId
      ? db.dayExercises
          .where('workoutDayId').equals(dayId)
          .filter((de) => !de.deleted)
          .toArray()
          .then((list) => list.sort((a, b) => a.order - b.order))
      : [],
    [dayId],
  )

  const allExercises = useLiveQuery(() => db.exercises.filter((e) => !e.deleted).toArray(), [])

  const exerciseMap = useMemo(
    () => new Map<string, Exercise>(allExercises?.map((e) => [e.id, e]) ?? []),
    [allExercises],
  )

  const existingExerciseIds = useMemo(
    () => new Set((dayExercises ?? []).map((de) => de.exerciseId)),
    [dayExercises],
  )

  const equipmentList = useMemo(() => {
    if (!dayExercises || !allExercises) return []
    const seen = new Set<string>()
    for (const de of dayExercises) {
      const ex = exerciseMap.get(de.exerciseId)
      if (ex?.category) seen.add(ex.category)
    }
    return [...seen]
  }, [dayExercises, allExercises, exerciseMap])

  const estMin = useMemo(() => {
    if (!dayExercises || dayExercises.length === 0) return null
    let totalSecs = 0
    for (const de of dayExercises) {
      const sets = de.targetSets ?? 3
      const rest = de.restSecs ?? 90
      totalSecs += sets * 40 + sets * rest
    }
    return Math.max(5, Math.round(totalSecs / 60 / 5) * 5)
  }, [dayExercises])

  if (!day || !program || !dayExercises || !allExercises) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const nextOrder = dayExercises.length > 0 ? Math.max(...dayExercises.map((de) => de.order)) + 1 : 0

  async function handleExerciseReorder(from: number, to: number) {
    const reordered = [...dayExercises]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const timestamp = now()
    await Promise.all(
      reordered.map((de, idx) =>
        db.dayExercises.update(de.id, { order: idx, updatedAt: timestamp, syncedAt: null })
      )
    )
  }

  async function handleDelete(id: string) {
    await db.dayExercises.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
    setConfirmDelete(null)
  }

  async function startNow() {
    if (!dayId || !programId) return
    setStarting(true)
    setStartError(null)
    try {
      const ts        = now()
      const sessionId = crypto.randomUUID()
      await db.workoutSessions.add({
        id:           sessionId,
        workoutDayId: dayId,
        programId:    programId,
        date:         today(),
        startedAt:    ts,
        finishedAt:   null,
        notes:        '',
        createdAt:    ts,
        updatedAt:    ts,
        syncedAt:     null,
        deleted:      false,
      })
      const des = await db.dayExercises
        .where('workoutDayId').equals(dayId)
        .filter((de) => !de.deleted)
        .toArray()
      des.sort((a, b) => a.order - b.order)
      if (des.length > 0) {
        await db.sessionExercises.bulkAdd(
          des.map((de, idx) => ({
            id:               crypto.randomUUID(),
            workoutSessionId: sessionId,
            exerciseId:       de.exerciseId,
            order:            idx,
            notes:            '',
            createdAt:        ts,
            updatedAt:        ts,
            syncedAt:         null,
            deleted:          false,
          }))
        )
      }
      navigate('/log')
    } catch (err) {
      setStarting(false)
      setStartError(err instanceof Error ? err.message : 'Failed to start session. Try again.')
    }
  }

  function openDetail(de: DayExercise) {
    setDetailDE(de)
    setGuideOpen(false)
    setDetailVideoOpen(false)
  }

  function closeDetail() {
    setDetailDE(null)
    setGuideOpen(false)
    setDetailVideoOpen(false)
  }

  // Exercise for the open detail sheet
  const detailExercise = detailDE ? exerciseMap.get(detailDE.exerciseId) : null

  return (
    <div style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}>

      {/* ── Fixed header ── */}
      <div className="sticky top-0 z-40 bg-app-card border-b border-app-border px-4 flex items-center justify-between h-14">
        <button
          onClick={() => navigate('/programs')}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-app-bg text-app-muted active:text-app-text"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>

        <span className="text-sm font-bold text-app-text truncate mx-3">{day.name}</span>

        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-9 h-9 flex items-center justify-center text-app-muted"
            aria-label="More options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
            </svg>
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-10 z-50 w-40 bg-app-card rounded-2xl shadow-lg border border-app-border overflow-hidden">
                <button
                  onClick={() => { setShowMenu(false); setEditMode(true) }}
                  className="w-full text-left px-4 py-3 text-sm text-app-text active:bg-app-bg"
                >
                  Edit Day
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="page-x pt-5">

        {/* ── Edit mode header ── */}
        {editMode && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-base font-extrabold text-app-text">Edit Exercises</p>
            <button
              onClick={() => setEditMode(false)}
              className="flex items-center gap-1.5 text-sm font-bold text-app-text bg-app-bg border border-app-border rounded-2xl px-3 py-1.5 active:bg-gray-100"
            >
              Done
            </button>
          </div>
        )}

        {/* ── View mode hero ── */}
        {!editMode && (
          <div className="mb-5">
            {/* Day name + program name */}
            <h1 className="text-2xl font-extrabold text-app-text leading-tight">{day.name}</h1>
            <p className="text-sm text-app-muted mt-0.5">{program.name}</p>

            {/* Stats chips row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <div className="flex items-center gap-1.5 bg-app-card border border-app-border rounded-full px-3 py-1.5 shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-app-muted">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
                <span className="text-xs font-semibold text-app-text">
                  {dayExercises.length} {dayExercises.length === 1 ? 'exercise' : 'exercises'}
                </span>
              </div>

              {estMin != null && (
                <div className="flex items-center gap-1.5 bg-app-card border border-app-border rounded-full px-3 py-1.5 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5 text-app-muted">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-semibold text-app-text">~{estMin} min</span>
                </div>
              )}

              {equipmentList.slice(0, 3).map((cat) => (
                <div key={cat} className="flex items-center gap-1.5 bg-app-card border border-app-border rounded-full px-3 py-1.5 shadow-sm">
                  <div className="w-3.5 h-3.5 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-app-muted">
                      <path d={CAT_ICON_PATHS[cat] ?? CAT_ICON_PATHS.default} fillRule="evenodd" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-app-text">{EQUIPMENT_LABELS[cat] ?? cat}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Exercise list ── */}
        {dayExercises.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
            {editMode
              ? <span>Tap <strong className="text-app-text">Add Exercise</strong> below.</span>
              : <span>Tap ⋯ → Edit Day to add exercises.</span>
            }
          </div>
        ) : editMode ? (
            <DragList
              items={dayExercises}
              keyOf={(de) => de.id}
              onReorder={handleExerciseReorder}
              renderItem={(de, dragHandleProps) => {
                const exercise = exerciseMap.get(de.exerciseId)
                if (!exercise) return null
                return (
                  <div className="bg-app-card rounded-2xl border border-app-border shadow-sm overflow-hidden">
                    {confirmDelete !== de.id ? (
                      <div className="flex items-center gap-2 px-3 py-3">
                        <div {...dragHandleProps} className="text-app-faint p-1.5 flex-none select-none" aria-label="Drag to reorder">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M7 2a1 1 0 000 2 1 1 0 000-2zM7 8a1 1 0 000 2 1 1 0 000-2zM7 14a1 1 0 000 2 1 1 0 000-2zM13 2a1 1 0 000 2 1 1 0 000-2zM13 8a1 1 0 000 2 1 1 0 000-2zM13 14a1 1 0 000 2 1 1 0 000-2z" />
                          </svg>
                        </div>
                        <div className="flex-none flex items-center justify-center w-10 h-10 rounded-xl bg-app-bg">
                          <MuscleIcon muscleGroup={exercise.muscleGroup} width={24} height={36} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-app-text truncate">{exercise.name}</p>
                          <p className="text-xs text-app-muted mt-0.5">
                            {de.targetSets} × {de.targetReps}
                            {de.targetWeight != null ? ` @ ${de.targetWeight} kg` : ''}
                            {de.restSecs != null ? ` · ${de.restSecs}s rest` : ''}
                          </p>
                        </div>
                        <button onClick={() => setEditingDE(de)} className="text-app-faint active:text-accent-dark p-2" aria-label="Edit targets">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmDelete(de.id)} className="text-app-faint active:text-red-500 p-2" aria-label="Remove">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 bg-red-50">
                        <p className="flex-1 text-sm text-red-700">Remove <strong>{exercise.name}</strong>?</p>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-app-muted px-2 py-1">Cancel</button>
                        <button onClick={() => handleDelete(de.id)} className="text-xs font-bold text-white bg-red-500 rounded-xl px-3 py-1.5 active:bg-red-600">Remove</button>
                      </div>
                    )}
                  </div>
                )
              }}
            />
          ) : (
          <div className="space-y-2">
            {dayExercises.map((de) => {
              const exercise = exerciseMap.get(de.exerciseId)
              if (!exercise) return null

              // ── View mode row — fully tappable ──
              const listVid = exercise.videoUrl ? getYouTubeId(exercise.videoUrl) : null
              return (
                <button
                  key={de.id}
                  onClick={() => openDetail(de)}
                  className="w-full bg-app-card rounded-2xl border border-app-border shadow-sm overflow-hidden active:bg-app-bg text-left"
                >
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <div className="flex-none flex items-center justify-center w-11 h-11 rounded-xl bg-app-bg">
                      <MuscleIcon muscleGroup={exercise.muscleGroup} width={26} height={40} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[15px] text-app-text truncate">{exercise.name}</p>
                      <p className="text-xs text-app-muted mt-0.5">
                        {de.targetSets} sets × {de.targetReps}
                        {de.targetWeight != null ? ` · ${de.targetWeight} kg` : ''}
                        {de.restSecs != null ? ` · ${de.restSecs}s rest` : ''}
                      </p>
                      {exercise.instructions && (
                        <span className="inline-flex items-center gap-1 mt-1.5 bg-blue-50 border border-blue-200 text-blue-500 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                          <svg viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5">
                            <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zM6.92 6.085c.081-.16.19-.299.34-.398.145-.097.371-.187.74-.187.28 0 .553.087.738.225A.613.613 0 019 6.25c0 .058-.037.209-.169.371a1.677 1.677 0 01-.54.463c-.187.111-.39.203-.54.316A1.988 1.988 0 007 8.5a.75.75 0 001.5 0 .49.49 0 01.172-.365c.112-.09.274-.165.469-.287.197-.123.411-.273.581-.487C9.912 7.058 10 6.662 10 6.25c0-.655-.316-1.226-.88-1.613C8.558 4.27 7.886 4 7 4c-.636 0-1.245.16-1.72.478-.477.318-.79.747-.99 1.152a.75.75 0 001.63.455z" clipRule="evenodd" />
                          </svg>
                          Guide
                        </span>
                      )}
                    </div>

                    {/* Right side: compact thumbnail preview or chevron — tap the row to open detail with inline video */}
                    {listVid ? (
                      <div className="relative flex-shrink-0 w-16 h-9 rounded-lg overflow-hidden pointer-events-none">
                        <img src={getYouTubeThumbnail(listVid)} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center">
                            <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5 ml-0.5">
                              <path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-faint flex-shrink-0">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Add exercise (edit mode) */}
        {editMode && (
          <button
            onClick={() => setShowPicker(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent text-accent-dark text-sm font-bold py-4 active:bg-accent-light"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
            </svg>
            Add Exercise
          </button>
        )}
      </div>

      {/* ── Sticky Start Now button (view mode) ── */}
      {!editMode && (
        <div
          className="fixed left-0 right-0 md:left-60 bg-app-card border-t border-app-border px-4 py-3 z-30"
          style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
        >
          {startError && (
            <p className="text-xs text-red-600 text-center mb-2">{startError}</p>
          )}
          {dayExercises.length === 0 ? (
            <p className="text-center text-sm text-app-muted py-2">
              Add exercises above before starting.
            </p>
          ) : (
            <button
              onClick={startNow}
              disabled={starting}
              className="w-full rounded-2xl bg-accent text-app-text py-3.5 font-bold text-sm active:bg-accent-dark disabled:opacity-60"
            >
              {starting ? 'Starting…' : 'Start Now'}
            </button>
          )}
        </div>
      )}

      {/* ── Exercise detail sheet ── */}
      {detailDE && detailExercise && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
          <div className="relative z-50 w-full max-w-lg mx-auto bg-app-card rounded-t-3xl pb-8 max-h-[80vh] overflow-y-auto">
            {/* Handle */}
            <div className="sticky top-0 bg-app-card pt-3 pb-2 px-5 flex items-center justify-between border-b border-app-border/50 z-10">
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <div />
              <button onClick={closeDetail} className="ml-auto text-app-muted p-1 active:text-app-text">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="page-x pt-4">
              {/* Exercise header */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-none flex items-center justify-center w-16 h-16 rounded-2xl bg-app-bg">
                  <MuscleIcon muscleGroup={detailExercise.muscleGroup} width={36} height={54} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-lg text-app-text leading-tight">{detailExercise.name}</p>
                  <p className="text-sm text-app-muted mt-0.5 capitalize">{detailExercise.category ?? 'Exercise'}</p>
                </div>
              </div>

              {/* Thumbnail / Watch */}
              {detailExercise.videoUrl && (() => {
                const vid = getYouTubeId(detailExercise.videoUrl)
                if (!vid) return null
                return detailVideoOpen ? (
                  <div className="relative w-full rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                    <iframe
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0&playsinline=1`}
                      title={detailExercise.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setDetailVideoOpen(true)}
                    className="relative w-full rounded-2xl overflow-hidden mb-4 active:opacity-80"
                    style={{ aspectRatio: '16/9' }}
                    aria-label={`Play ${detailExercise.name} tutorial`}
                  >
                    <img
                      src={getYouTubeThumbnail(vid)}
                      alt={`${detailExercise.name} tutorial`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-0.5">
                          <path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
                        </svg>
                      </div>
                    </div>
                  </button>
                )
              })()}

              {/* Guide chip */}
              {(detailExercise.instructions) && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {detailExercise.instructions && (
                    <button
                      onClick={() => setGuideOpen((v) => !v)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-semibold transition-colors active:opacity-80 ${
                        guideOpen
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-blue-50 border-blue-200 text-blue-600'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                      </svg>
                      {guideOpen ? 'Hide Guide' : 'Show Guide'}
                    </button>
                  )}
                </div>
              )}

              {/* Instructions panel */}
              {guideOpen && detailExercise.instructions && (
                <div className="mb-4 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-line">
                    {detailExercise.instructions}
                  </p>
                </div>
              )}

              {/* Targets grid */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Sets',   value: String(detailDE.targetSets) },
                  { label: 'Reps',   value: detailDE.targetReps },
                  { label: 'Weight', value: detailDE.targetWeight != null ? `${detailDE.targetWeight} kg` : '—' },
                  { label: 'Rest',   value: detailDE.restSecs != null ? `${detailDE.restSecs}s` : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-app-bg rounded-xl p-3 flex flex-col items-center">
                    <span className="text-[11px] font-semibold text-app-muted uppercase tracking-wide">{label}</span>
                    <span className="text-base font-extrabold text-app-text mt-1">{value}</span>
                  </div>
                ))}
              </div>

              {/* Day exercise notes */}
              {detailDE.notes && (
                <div className="mb-4 p-3 rounded-xl bg-accent-light border border-accent">
                  <p className="text-xs font-semibold text-accent-dark mb-0.5">Notes</p>
                  <p className="text-sm text-app-text">{detailDE.notes}</p>
                </div>
              )}

              {/* Edit targets button */}
              <button
                onClick={() => { closeDetail(); setEditingDE(detailDE) }}
                className="w-full rounded-2xl bg-accent text-app-text py-3.5 font-bold text-sm active:bg-accent-dark"
              >
                Edit Targets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlays ── */}
      {showPicker && (
        <ExercisePicker
          onSelect={(ex) => { setShowPicker(false); setPendingExercise(ex) }}
          onClose={() => setShowPicker(false)}
          existingIds={existingExerciseIds}
        />
      )}

      {pendingExercise && (
        <DayExerciseForm
          mode="add"
          exerciseId={pendingExercise.id}
          exerciseName={pendingExercise.name}
          dayId={dayId!}
          nextOrder={nextOrder}
          onClose={() => setPendingExercise(null)}
        />
      )}

      {editingDE && (
        <DayExerciseForm
          mode="edit"
          dayExercise={editingDE}
          exerciseName={exerciseMap.get(editingDE.exerciseId)?.name ?? ''}
          onClose={() => setEditingDE(null)}
        />
      )}

    </div>
  )
}
