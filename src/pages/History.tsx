/**
 * History — calendar view of all past workout sessions.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatDuration } from '../lib/utils'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Year heatmap ──────────────────────────────────────────────────────────────

function YearHeatmap({ sessionDates }: { sessionDates: Set<string> }) {
  // Start from the Monday 51 full weeks before the current week's Monday
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dow        = today.getDay()                        // 0=Sun … 6=Sat
  const toMonday   = dow === 0 ? 6 : dow - 1              // days since last Monday
  const weekStart  = new Date(today)
  weekStart.setDate(today.getDate() - toMonday - 51 * 7)  // Monday 52 weeks ago

  // Build 52 weeks × 7 days
  const weeks: string[][] = Array.from({ length: 52 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + w * 7 + d)
      return date.toISOString().slice(0, 10)
    })
  )

  // Month labels: one per week when the month changes
  const monthLabels = new Map<number, string>()
  let lastMonth = -1
  for (let w = 0; w < 52; w++) {
    const m = new Date(weeks[w][0]).getMonth()
    if (m !== lastMonth) {
      monthLabels.set(w, new Date(weeks[w][0]).toLocaleDateString('en-AU', { month: 'short' }))
      lastMonth = m
    }
  }

  const todayStr   = isoDate(today)
  const allDays    = weeks.flat()
  const totalInRange = allDays.filter((d) => sessionDates.has(d)).length

  // Longest streak in the visible range
  let longest = 0, run = 0
  for (const d of allDays) {
    if (sessionDates.has(d)) { run++; if (run > longest) longest = run }
    else run = 0
  }

  return (
    <div className="rounded-2xl bg-gray-800/60 p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400">Last 52 weeks</p>
        <div className="flex gap-3">
          <span className="text-xs text-lime-400 font-semibold">{totalInRange} sessions</span>
          {longest > 1 && (
            <span className="text-xs text-amber-400 font-semibold">🔥 {longest}-day streak</span>
          )}
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Month labels row */}
          <div style={{ display: 'flex', gap: 2 }}>
            {weeks.map((_, wi) => (
              <div key={wi} style={{ width: 12, flexShrink: 0 }}>
                {monthLabels.has(wi) && (
                  <span style={{ fontSize: 8, color: '#6b7280', whiteSpace: 'nowrap',
                    display: 'block', transform: 'translateX(-2px)' }}>
                    {monthLabels.get(wi)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 7 day rows */}
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} style={{ display: 'flex', gap: 2 }}>
              {weeks.map((week, wi) => {
                const day        = week[d]
                const hasSession = sessionDates.has(day)
                const isToday    = day === todayStr
                const isFuture   = day > todayStr
                return (
                  <div
                    key={wi}
                    style={{ width: 12, height: 12, borderRadius: 2, flexShrink: 0 }}
                    className={
                      isFuture ? 'bg-gray-800'
                      : isToday ? 'bg-lime-400 ring-1 ring-lime-300 ring-offset-0'
                      : hasSession ? 'bg-lime-500'
                      : 'bg-gray-700'
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  let startDow   = firstDay.getDay() - 1
  if (startDow < 0) startDow = 6
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function History() {
  const navigate  = useNavigate()
  const now       = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const sessions = useLiveQuery(
    () => db.workoutSessions
      .filter((s) => !s.deleted && s.finishedAt !== null)
      .toArray()
      .then((list) => list.sort((a, b) => b.date.localeCompare(a.date))),
    [],
  )

  const programs = useLiveQuery(() => db.programs.toArray(), [])
  const days     = useLiveQuery(() => db.workoutDays.toArray(), [])

  if (!sessions || !programs || !days) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading…</div>
  }

  const dayMap        = new Map(days.map((d) => [d.id, d.name]))
  const sessionDates  = new Set(sessions.map((s) => s.date))
  const monthPrefix   = `${String(viewYear)}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthSessions = sessions.filter((s) => s.date.startsWith(monthPrefix))
  const calendarDays  = buildCalendarDays(viewYear, viewMonth)
  const todayStr      = isoDate(now)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const monthLabel = new Date(viewYear, viewMonth, 1)
    .toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-white mb-5">History</h1>

      {/* ── Year heatmap ── */}
      <YearHeatmap sessionDates={sessionDates} />

      {/* ── Calendar ── */}
      <div className="rounded-2xl bg-gray-800/60 p-4 mb-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-gray-700/60 text-gray-300 active:bg-gray-700"
            aria-label="Previous month"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-bold text-white">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-gray-700/60 text-gray-300 active:bg-gray-700"
            aria-label="Next month"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d) => (
            <div key={d} className="text-center text-xs text-gray-500 font-medium py-1">{d}</div>
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
              <div key={dateStr} className="flex flex-col items-center py-0.5">
                <span className={[
                  'w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium',
                  isToday
                    ? 'bg-lime-400 text-gray-900 font-bold'
                    : hasSession
                    ? 'text-white'
                    : 'text-gray-400',
                ].join(' ')}>
                  {date.getDate()}
                </span>
                {hasSession && !isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 mt-0.5" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Session list ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-white">
          {monthLabel}
        </h2>
        <span className="text-xs text-gray-500">
          {monthSessions.length} {monthSessions.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      {monthSessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-700 p-8 text-center text-gray-500">
          No workouts recorded this month.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {monthSessions.map((session) => {
            const dayName  = session.workoutDayId ? (dayMap.get(session.workoutDayId) ?? 'Ad-hoc') : 'Ad-hoc'
            const dayNum   = new Date(session.date + 'T12:00:00').getDate()
            const month    = new Date(session.date + 'T12:00:00').toLocaleDateString('en-AU', { month: 'short' })
            const dateStr  = new Date(session.date + 'T12:00:00').toLocaleDateString('en-AU', {
              weekday: 'short', day: 'numeric', month: 'short',
            })
            const duration = formatDuration(session.startedAt, session.finishedAt)

            return (
              <li key={session.id}>
                <button
                  onClick={() => navigate(`/history/${session.id}`)}
                  className="w-full flex items-center gap-4 rounded-2xl bg-gray-800/60 px-4 py-3 text-left active:bg-gray-800"
                >
                  {/* Date bubble */}
                  <div className="flex-none w-12 h-12 rounded-xl bg-lime-400/10 flex flex-col items-center justify-center">
                    <span className="text-lime-400 text-lg font-bold leading-none">{dayNum}</span>
                    <span className="text-lime-400/70 text-xs">{month}</span>
                  </div>

                  {/* Name + date */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{dayName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>
                  </div>

                  {/* Duration */}
                  <div className="flex-none text-right">
                    <p className="text-sm font-semibold text-white">{duration}</p>
                    <p className="text-xs text-gray-500">duration</p>
                  </div>

                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-600 flex-none">
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
