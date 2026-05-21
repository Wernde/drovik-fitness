/**
 * History — calendar view of all past workout sessions.
 *
 * Shows a month calendar with dots on days that had a workout.
 * Navigate between months with the arrows. Tap a session in the list below
 * to see its full detail.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

// ── Calendar helpers ───────────────────────────────────────────────────────────

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatDuration(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) return 'In progress'
  const mins = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Returns all the calendar cells for a given month (including padding from prev/next months).
function buildCalendarDays(year: number, month: number) {
  const firstDay  = new Date(year, month, 1)
  const lastDay   = new Date(year, month + 1, 0)

  // Monday = 0, Sunday = 6
  let startDow = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6

  const cells: (Date | null)[] = []

  // Padding before the first day.
  for (let i = 0; i < startDow; i++) cells.push(null)

  // Days in the month.
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))

  // Padding after the last day to complete the grid row.
  while (cells.length % 7 !== 0) cells.push(null)

  return cells
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function History() {
  const navigate = useNavigate()
  const now      = new Date()

  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const sessions = useLiveQuery(
    () => db.workoutSessions
      .filter((s) => !s.deleted && s.finishedAt !== null)
      .toArray()
      .then((list) => list.sort((a, b) => b.date.localeCompare(a.date))),
    [],
  )

  // Map programId → name for display.
  const programs = useLiveQuery(() => db.programs.toArray(), [])
  const days     = useLiveQuery(() => db.workoutDays.toArray(), [])

  if (!sessions || !programs || !days) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  const programMap = new Map(programs.map((p) => [p.id, p.name]))
  const dayMap     = new Map(days.map((d) => [d.id, d.name]))

  // Set of YYYY-MM-DD strings that have at least one completed session.
  const sessionDates = new Set(sessions.map((s) => s.date))

  // Sessions visible in the currently viewed month.
  const monthPrefix   = `${String(viewYear)}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthSessions = sessions.filter((s) => s.date.startsWith(monthPrefix))

  const calendarDays = buildCalendarDays(viewYear, viewMonth)

  const todayStr = isoDate(now)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-AU', {
    month: 'long', year: 'numeric',
  })

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">History</h1>

      {/* ── Calendar ── */}
      <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 mb-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700"
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-semibold">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 active:bg-gray-200 dark:active:bg-gray-700"
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-400 dark:text-gray-500 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {calendarDays.map((date, idx) => {
            if (!date) return <div key={idx} />

            const dateStr    = isoDate(date)
            const isToday    = dateStr === todayStr
            const hasSession = sessionDates.has(dateStr)

            return (
              <div
                key={dateStr}
                className="flex flex-col items-center py-1"
              >
                <span className={[
                  'w-7 h-7 flex items-center justify-center rounded-full text-xs',
                  isToday
                    ? 'bg-sky-500 text-white font-bold'
                    : 'text-gray-700 dark:text-gray-300',
                ].join(' ')}>
                  {date.getDate()}
                </span>
                {hasSession && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-0.5" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Session list for the viewed month ── */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        {monthSessions.length} {monthSessions.length === 1 ? 'session' : 'sessions'} in {monthLabel}
      </p>

      {monthSessions.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center text-gray-400">
          No workouts recorded this month.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {monthSessions.map((session) => {
            const dayName     = session.workoutDayId ? dayMap.get(session.workoutDayId) : null
            const programName = session.programId    ? programMap.get(session.programId) : null
            const displayDate = new Date(session.date + 'T12:00:00').toLocaleDateString('en-AU', {
              weekday: 'short', day: 'numeric', month: 'short',
            })

            return (
              <li key={session.id}>
                <button
                  onClick={() => navigate(`/history/${session.id}`)}
                  className="w-full flex items-center gap-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-left active:bg-gray-100 dark:active:bg-gray-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">
                      {dayName ?? 'Ad-hoc Workout'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {programName ? `${programName} · ` : ''}{displayDate}
                    </p>
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDuration(session.startedAt, session.finishedAt)}
                    </p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-none">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
