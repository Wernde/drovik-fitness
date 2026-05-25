import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { Habit } from '../db/db'

// ── Color palette ──────────────────────────────────────────────────────────────

const COLORS: Record<string, { bg: string; dot: string }> = {
  lime:   { bg: 'bg-lime-400',   dot: 'bg-lime-400' },
  blue:   { bg: 'bg-blue-400',   dot: 'bg-blue-400' },
  amber:  { bg: 'bg-amber-400',  dot: 'bg-amber-400' },
  rose:   { bg: 'bg-rose-400',   dot: 'bg-rose-400' },
  purple: { bg: 'bg-purple-400', dot: 'bg-purple-400' },
  cyan:   { bg: 'bg-cyan-400',   dot: 'bg-cyan-400' },
}

// ── Streak helpers ─────────────────────────────────────────────────────────────

function currentStreak(dates: Set<string>): number {
  let streak = 0
  const d = new Date()
  // If today not yet completed, start counting from yesterday
  if (!dates.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (true) {
    const s = d.toISOString().slice(0, 10)
    if (!dates.has(s)) break
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

function bestStreak(sorted: string[]): number {
  if (sorted.length === 0) return 0
  let best = 1, run = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000
    if (diff === 1) { run++; if (run > best) best = run }
    else run = 1
  }
  return best
}

// Last 7 days as YYYY-MM-DD strings, oldest first
function last7(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })
}

// ── HabitForm — slide-up modal for creating or editing a habit ─────────────────

interface HabitFormProps {
  habit?: Habit
  onClose: () => void
}

function HabitForm({ habit, onClose }: HabitFormProps) {
  const [name,    setName]    = useState(habit?.name  ?? '')
  const [color,   setColor]   = useState(habit?.color ?? 'lime')
  const [saving,  setSaving]  = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) { setError('Habit name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const ts = now()
      if (habit) {
        await db.habits.update(habit.id, { name: trimmed, color, updatedAt: ts, syncedAt: null })
      } else {
        await db.habits.add({
          id: crypto.randomUUID(), name: trimmed, color, archived: false,
          createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
        })
      }
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!habit) return
    await db.habits.update(habit.id, { deleted: true, updatedAt: now(), syncedAt: null })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full bg-gray-900 rounded-t-2xl shadow-xl p-6 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">{habit ? 'Edit Habit' : 'New Habit'}</h2>
          <button onClick={onClose} className="text-gray-500 active:text-gray-300 p-1" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Habit name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning stretch, Drink water"
              autoFocus
              className="w-full rounded-xl border border-gray-700 bg-gray-800 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Colour</label>
            <div className="flex gap-3">
              {Object.keys(COLORS).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={[
                    'w-9 h-9 rounded-full transition-transform',
                    COLORS[c].dot,
                    color === c ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110' : '',
                  ].join(' ')}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-lime-400 text-gray-900 py-3 font-semibold text-sm disabled:opacity-60 active:bg-lime-500"
          >
            {saving ? 'Saving…' : habit ? 'Save' : 'Add Habit'}
          </button>

          {habit && !confirm && (
            <button
              onClick={() => setConfirm(true)}
              className="w-full rounded-2xl border border-red-900 text-red-400 py-2.5 text-sm active:bg-red-950"
            >
              Delete Habit
            </button>
          )}

          {habit && confirm && (
            <div className="rounded-2xl bg-red-950 p-4 flex flex-col gap-3">
              <p className="text-sm text-red-300 text-center">Delete this habit and all its history?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-700 text-gray-400 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-red-600 text-white py-2 text-sm font-semibold"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── HabitsTab ──────────────────────────────────────────────────────────────────

export default function HabitsTab() {
  // undefined = no modal, null = new habit form, Habit = edit form
  const [formTarget, setFormTarget] = useState<Habit | null | undefined>(undefined)

  const todayStr = today()
  const days7    = last7()

  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.deleted && !h.archived).toArray(),
  )

  const completions = useLiveQuery(
    () => db.habitCompletions.filter((c) => !c.deleted).toArray(),
  )

  if (!habits || !completions) {
    return <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Loading…</div>
  }

  // Build map: habitId → Set<date>  (all completions for streak calc)
  const byHabit = new Map<string, Set<string>>()
  for (const c of completions) {
    if (!byHabit.has(c.habitId)) byHabit.set(c.habitId, new Set())
    byHabit.get(c.habitId)!.add(c.date)
  }

  async function toggleToday(habit: Habit) {
    const dates = byHabit.get(habit.id) ?? new Set<string>()
    if (dates.has(todayStr)) {
      const existing = completions.find((c) => c.habitId === habit.id && c.date === todayStr)
      if (existing) {
        await db.habitCompletions.update(existing.id, { deleted: true, updatedAt: now(), syncedAt: null })
      }
    } else {
      const ts = now()
      await db.habitCompletions.add({
        id: crypto.randomUUID(), habitId: habit.id, date: todayStr,
        createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
      })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {habits.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-700 p-8 text-center text-gray-500 text-sm">
          No habits yet. Add one below to start tracking daily streaks.
        </div>
      )}

      {habits.map((habit) => {
        const dates     = byHabit.get(habit.id) ?? new Set<string>()
        const doneToday = dates.has(todayStr)
        const streak    = currentStreak(dates)
        const best      = bestStreak([...dates].sort())
        const colorCfg  = COLORS[habit.color] ?? COLORS.lime

        return (
          <div key={habit.id} className="bg-gray-800/60 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Colour dot — tappable to edit */}
              <button onClick={() => setFormTarget(habit)} aria-label="Edit habit">
                <div className={`w-3 h-3 rounded-full ${colorCfg.dot}`} />
              </button>

              {/* Name */}
              <button
                onClick={() => setFormTarget(habit)}
                className="flex-1 text-left text-white text-sm font-medium"
              >
                {habit.name}
              </button>

              {/* Streak badge */}
              {streak > 0 && (
                <span className="text-xs text-amber-400 font-semibold tabular-nums">
                  🔥 {streak}
                </span>
              )}

              {/* Today toggle */}
              <button
                onClick={() => toggleToday(habit)}
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  doneToday ? colorCfg.bg : 'border-2 border-gray-600',
                ].join(' ')}
                aria-label={doneToday ? 'Mark incomplete' : 'Mark complete'}
              >
                {doneToday && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-gray-900">
                    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>

            {/* 7-day completion bar */}
            <div className="flex gap-1 mt-2.5 pl-6">
              {days7.map((d) => (
                <div
                  key={d}
                  className={[
                    'flex-1 h-1.5 rounded-full',
                    dates.has(d)
                      ? colorCfg.dot
                      : d === todayStr
                      ? 'bg-gray-600'
                      : 'bg-gray-700',
                  ].join(' ')}
                />
              ))}
            </div>

            {/* Best streak — shown only if it differs from current */}
            {best > 0 && best !== streak && (
              <p className="text-xs text-gray-500 mt-1.5 pl-6">Best: {best} days</p>
            )}
          </div>
        )
      })}

      <button
        onClick={() => setFormTarget(null)}
        className="w-full rounded-2xl border border-gray-700 text-gray-300 py-3 text-sm font-medium active:bg-gray-800"
      >
        + Add Habit
      </button>

      {formTarget !== undefined && (
        <HabitForm
          habit={formTarget ?? undefined}
          onClose={() => setFormTarget(undefined)}
        />
      )}
    </div>
  )
}
