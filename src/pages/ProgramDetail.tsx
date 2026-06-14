/**
 * ProgramDetail — shows the workout days inside a program, grouped by phase.
 */

import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now } from '../db/db'
import type { WorkoutDay, ProgramPhase } from '../db/db'
import DayForm from '../components/DayForm'
import PhaseForm from '../components/PhaseForm'
import DragList from '../components/DragList'

// ── Reusable day row ──────────────────────────────────────────────────────────

interface DayRowProps {
  day:              WorkoutDay
  exerciseCount:    number
  programId:        string
  dragHandleProps:  React.HTMLAttributes<HTMLElement>
  onEdit:           () => void
  onDelete:         () => void
  confirmingDelete: boolean
  onCancelDelete:   () => void
  onConfirmDelete:  () => void
}

function DayRow({
  day, exerciseCount, programId, dragHandleProps,
  onEdit, onDelete, confirmingDelete, onCancelDelete, onConfirmDelete,
}: DayRowProps) {
  const navigate = useNavigate()

  if (confirmingDelete) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="flex-1 text-sm text-red-700">Delete <strong>{day.name}</strong>?</p>
        <button onClick={onCancelDelete} className="text-xs text-app-muted px-2 py-1">Cancel</button>
        <button onClick={onConfirmDelete} className="text-xs font-bold text-white bg-red-500 rounded-xl px-3 py-1.5 active:bg-red-600">Delete</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl bg-app-card border border-app-border px-3 py-3">
      <div {...dragHandleProps} className="touch-none cursor-grab active:cursor-grabbing text-app-faint p-1.5 flex-none" aria-label="Drag to reorder">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M7 2a1 1 0 000 2 1 1 0 000-2zM7 8a1 1 0 000 2 1 1 0 000-2zM7 14a1 1 0 000 2 1 1 0 000-2zM13 2a1 1 0 000 2 1 1 0 000-2zM13 8a1 1 0 000 2 1 1 0 000-2zM13 14a1 1 0 000 2 1 1 0 000-2z" />
        </svg>
      </div>

      <button onClick={() => navigate(`/programs/${programId}/days/${day.id}`)} className="flex-1 text-left min-w-0">
        <p className="font-semibold text-sm text-app-text truncate">{day.name}</p>
        <p className="text-xs text-app-muted">{exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}</p>
      </button>

      <button onClick={onEdit} className="flex-none text-app-faint active:text-accent-dark p-1" aria-label={`Rename ${day.name}`}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      </button>
      <button onClick={onDelete} className="flex-none text-app-faint active:text-red-500 p-1" aria-label={`Delete ${day.name}`}>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProgramDetail() {
  const { programId } = useParams<{ programId: string }>()
  const navigate       = useNavigate()

  const [dayForm,       setDayForm]       = useState<{ phaseId: string | null } | null>(null)
  const [editingDay,    setEditingDay]    = useState<WorkoutDay | undefined>(undefined)
  const [phaseForm,     setPhaseForm]     = useState(false)
  const [editingPhase,  setEditingPhase]  = useState<ProgramPhase | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmDeletePhase, setConfirmDeletePhase] = useState<string | null>(null)

  const program = useLiveQuery(() => (programId ? db.programs.get(programId) : undefined), [programId])

  const phases = useLiveQuery(
    () => programId
      ? db.programPhases
          .where('programId').equals(programId)
          .filter((p) => !p.deleted)
          .toArray()
          .then((list) => list.sort((a, b) => a.order - b.order))
      : [],
    [programId],
  )

  const days = useLiveQuery(
    () => programId
      ? db.workoutDays
          .where('programId').equals(programId)
          .filter((d) => !d.deleted)
          .toArray()
          .then((list) => list.sort((a, b) => a.order - b.order))
      : [],
    [programId],
  )

  const exerciseCounts = useLiveQuery(() => db.dayExercises.filter((de) => !de.deleted).toArray(), [])

  if (!program || !phases || !days || !exerciseCounts) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  if (program.deleted) {
    navigate('/programs', { replace: true })
    return null
  }

  const exerciseCountMap = exerciseCounts.reduce<Record<string, number>>((acc, de) => {
    acc[de.workoutDayId] = (acc[de.workoutDayId] ?? 0) + 1
    return acc
  }, {})

  const nextDayOrder   = days.length > 0 ? Math.max(...days.map((d) => d.order)) + 1 : 0
  const nextPhaseOrder = phases.length > 0 ? Math.max(...phases.map((p) => p.order)) + 1 : 0

  const daysByPhase = new Map<string, WorkoutDay[]>()
  const unassigned: WorkoutDay[] = []
  for (const day of days) {
    if (day.phaseId) {
      const bucket = daysByPhase.get(day.phaseId) ?? []
      bucket.push(day)
      daysByPhase.set(day.phaseId, bucket)
    } else {
      unassigned.push(day)
    }
  }

  async function handleDayReorder(group: WorkoutDay[], from: number, to: number) {
    const reordered = [...group]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const timestamp = now()
    await Promise.all(
      reordered.map((d, idx) =>
        db.workoutDays.update(d.id, { order: idx, updatedAt: timestamp, syncedAt: null })
      )
    )
  }

  async function handleDeleteDay(id: string) {
    await db.workoutDays.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
    setConfirmDelete(null)
  }

  async function handleDeletePhase(phaseId: string) {
    const timestamp = now()
    const phaseDays = daysByPhase.get(phaseId) ?? []
    await Promise.all(phaseDays.map((d) =>
      db.workoutDays.update(d.id, { phaseId: null, updatedAt: timestamp, syncedAt: null })
    ))
    await db.programPhases.update(phaseId, { deleted: true, updatedAt: timestamp, syncedAt: null })
    setConfirmDeletePhase(null)
  }

  function openDayForm(phaseId: string | null) {
    setEditingDay(undefined)
    setDayForm({ phaseId })
  }

  function renderDayList(group: WorkoutDay[]) {
    return (
      <DragList
        items={group}
        keyOf={(d) => d.id}
        onReorder={(from, to) => handleDayReorder(group, from, to)}
        renderItem={(day, dragHandleProps) => (
          <DayRow
            day={day}
            exerciseCount={exerciseCountMap[day.id] ?? 0}
            programId={programId!}
            dragHandleProps={dragHandleProps}
            onEdit={() => { setEditingDay(day); setDayForm({ phaseId: day.phaseId }) }}
            onDelete={() => setConfirmDelete(day.id)}
            confirmingDelete={confirmDelete === day.id}
            onCancelDelete={() => setConfirmDelete(null)}
            onConfirmDelete={() => handleDeleteDay(day.id)}
          />
        )}
      />
    )
  }

  const hasPhases = phases.length > 0

  return (
    <div className="px-4 pt-6 pb-24">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-1">
        <button onClick={() => navigate('/programs')} className="flex-none text-app-muted active:text-app-text p-1 -ml-1" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold text-app-text truncate">{program.name}</h1>
          {program.description ? <p className="text-xs text-app-muted mt-0.5">{program.description}</p> : null}
        </div>
        <div className="flex gap-2 flex-none">
          <button
            onClick={() => { setEditingPhase(undefined); setPhaseForm(true) }}
            className="flex items-center gap-1 rounded-2xl border border-app-border text-app-muted px-3 py-1.5 text-sm font-semibold active:bg-app-border flex-none"
          >
            + Phase
          </button>
          <button
            onClick={() => openDayForm(null)}
            className="flex items-center gap-1 rounded-2xl bg-accent text-app-text px-3 py-1.5 text-sm font-bold active:bg-accent-dark flex-none"
          >
            + Day
          </button>
        </div>
      </div>

      <p className="text-xs text-app-muted mb-5 ml-8">
        {hasPhases ? `${phases.length} ${phases.length === 1 ? 'phase' : 'phases'} · ` : ''}
        {days.length} {days.length === 1 ? 'day' : 'days'}
      </p>

      {/* ── No phases: flat list ── */}
      {!hasPhases && (
        days.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
            No days yet. Tap <strong className="text-app-text">+ Day</strong> to get started,
            or <strong className="text-app-text">+ Phase</strong> to add a training block first.
          </div>
        ) : renderDayList(days)
      )}

      {/* ── With phases: grouped sections ── */}
      {hasPhases && (
        <div className="flex flex-col gap-5">
          {phases.map((phase) => {
            const phaseDays = daysByPhase.get(phase.id) ?? []
            const isDeleting = confirmDeletePhase === phase.id

            return (
              <div key={phase.id}>
                {/* Phase header */}
                {isDeleting ? (
                  <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 mb-2">
                    <p className="flex-1 text-sm text-red-700">
                      Delete <strong>{phase.name}</strong>? Its days will become unassigned.
                    </p>
                    <button onClick={() => setConfirmDeletePhase(null)} className="text-xs text-app-muted px-2 py-1">Cancel</button>
                    <button onClick={() => handleDeletePhase(phase.id)} className="text-xs font-bold text-white bg-red-500 rounded-xl px-3 py-1.5 active:bg-red-600">Delete</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-app-text uppercase tracking-wide truncate">{phase.name}</h2>
                        {phase.weeks != null && (
                          <span className="flex-none text-xs font-medium text-accent-dark bg-accent-light rounded-full px-2 py-0.5">
                            {phase.weeks}w
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-app-muted">{phaseDays.length} {phaseDays.length === 1 ? 'day' : 'days'}</p>
                    </div>
                    <button
                      onClick={() => { setEditingPhase(phase); setPhaseForm(true) }}
                      className="flex-none text-app-faint active:text-accent-dark p-1"
                      aria-label={`Edit ${phase.name}`}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setConfirmDeletePhase(phase.id)}
                      className="flex-none text-app-faint active:text-red-500 p-1"
                      aria-label={`Delete ${phase.name}`}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                )}

                {phaseDays.length > 0 && renderDayList(phaseDays)}

                <button
                  onClick={() => openDayForm(phase.id)}
                  className="w-full mt-2 rounded-xl border border-dashed border-app-border text-app-faint text-xs py-2 active:border-accent active:text-accent-dark"
                >
                  + Add day to {phase.name}
                </button>
              </div>
            )
          })}

          {unassigned.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-app-muted uppercase tracking-wide mb-2">Unassigned</h2>
              {renderDayList(unassigned)}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {dayForm !== null && (
        <DayForm
          programId={programId!}
          phaseId={editingDay ? editingDay.phaseId : dayForm.phaseId}
          day={editingDay}
          nextOrder={nextDayOrder}
          onClose={() => { setDayForm(null); setEditingDay(undefined) }}
        />
      )}

      {phaseForm && (
        <PhaseForm
          programId={programId!}
          phase={editingPhase}
          nextOrder={nextPhaseOrder}
          onClose={() => { setPhaseForm(false); setEditingPhase(undefined) }}
        />
      )}
    </div>
  )
}
