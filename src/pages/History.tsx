/**
 * History — calendar view of all past workout sessions.
 */

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { formatDuration } from '../lib/utils'

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Year heatmap ──────────────────────────────────────────────────────────────

// Colour scale by session count (0 = no workout, 4+ = max intensity)
function heatColor(count: number, isToday: boolean, isFuture: boolean): string {
  if (isFuture) return '#EEF0F3'
  if (count === 0) return isToday ? '#D1D5DB' : '#EEF0F3'
  if (count === 1) return '#FDE68A'  // amber-200 — light
  if (count === 2) return '#FBBF24'  // amber-400 — medium
  if (count === 3) return '#F59E0B'  // amber-500 — strong
  return '#B45309'                   // amber-700 — max
}

function YearHeatmap({ sessionCountMap }: { sessionCountMap: Map<string, number> }) {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dow       = today.getDay()
  const toMonday  = dow === 0 ? 6 : dow - 1
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - toMonday - 51 * 7)

  const weeks: string[][] = Array.from({ length: 52 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(weekStart)
      date.setDate(weekStart.getDate() + w * 7 + d)
      return date.toISOString().slice(0, 10)
    })
  )

  const monthLabels = new Map<number, string>()
  let lastMonth = -1
  for (let w = 0; w < 52; w++) {
    const m = new Date(weeks[w][0]).getMonth()
    if (m !== lastMonth) {
      monthLabels.set(w, new Date(weeks[w][0]).toLocaleDateString('en-AU', { month: 'short' }))
      lastMonth = m
    }
  }

  const todayStr     = isoDate(today)
  const allDays      = weeks.flat()
  const totalInRange = allDays.filter((d) => (sessionCountMap.get(d) ?? 0) > 0).length

  // Current streak: consecutive workout days ending today (or yesterday if rest day)
  let currentStreak = 0
  const streakCheck = new Date(today)
  if (!sessionCountMap.has(isoDate(streakCheck))) {
    streakCheck.setDate(streakCheck.getDate() - 1)
  }
  while (sessionCountMap.has(isoDate(streakCheck))) {
    currentStreak++
    streakCheck.setDate(streakCheck.getDate() - 1)
  }

  // Responsive cell sizing — measure container, compute cell width to fit exactly
  const containerRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState(10)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const GAP = 2
    const WEEKS = 52
    const measure = () => {
      const w = el.clientWidth
      setCellSize(Math.max(6, Math.floor((w - GAP * (WEEKS - 1)) / WEEKS)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const GAP = 2

  return (
    <div className="rounded-2xl bg-app-card border border-app-border p-4 mb-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-app-muted font-medium">Last 52 weeks</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-accent-dark font-semibold">{totalInRange} sessions</span>
          {currentStreak > 0 && (
            <span className="text-xs text-amber-600 font-semibold">🔥 {currentStreak}-day streak</span>
          )}
        </div>
      </div>

      {/* Responsive grid — no scroll, fills container width */}
      <div ref={containerRef}>
        {/* Month labels */}
        <div style={{ display: 'flex', gap: GAP, marginBottom: 4 }}>
          {weeks.map((_, wi) => (
            <div key={wi} style={{ width: cellSize, flexShrink: 0, overflow: 'visible' }}>
              {monthLabels.has(wi) && (
                <span style={{ fontSize: 9, color: '#7A7980', whiteSpace: 'nowrap', display: 'block' }}>
                  {monthLabels.get(wi)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* 7 day rows */}
        {Array.from({ length: 7 }, (_, d) => (
          <div key={d} style={{ display: 'flex', gap: GAP, marginBottom: d < 6 ? GAP : 0 }}>
            {weeks.map((week, wi) => {
              const day     = week[d]
              const count   = sessionCountMap.get(day) ?? 0
              const isToday = day === todayStr
              const isFuture = day > todayStr
              const bg      = heatColor(count, isToday, isFuture)
              return (
                <div
                  key={wi}
                  title={count > 0 ? `${day}: ${count} session${count !== 1 ? 's' : ''}` : day}
                  style={{
                    width:        cellSize,
                    height:       cellSize,
                    flexShrink:   0,
                    borderRadius: Math.max(2, Math.floor(cellSize / 4)),
                    backgroundColor: bg,
                    outline:      isToday ? '2px solid #B8900A' : undefined,
                    outlineOffset: isToday ? 1 : undefined,
                  }}
                />
              )
            })}
          </div>
        ))}

        {/* Colour legend */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] text-app-faint">Less</span>
          {['#EEF0F3', '#FDE68A', '#FBBF24', '#F59E0B', '#B45309'].map((c) => (
            <div
              key={c}
              style={{ width: cellSize, height: cellSize, borderRadius: 2, backgroundColor: c, flexShrink: 0 }}
            />
          ))}
          <span className="text-[10px] text-app-faint">More</span>
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
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  const dayMap = new Map(days.map((d) => [d.id, d.name]))

  // Count sessions per date for heatmap colour intensity
  const sessionCountMap = sessions.reduce((map, s) => {
    map.set(s.date, (map.get(s.date) ?? 0) + 1)
    return map
  }, new Map<string, number>())

  const sessionDates = new Set(sessions.map((s) => s.date))
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
    <div className="px-4 pt-6 pb-24">
      <h1 className="text-2xl font-extrabold text-app-text mb-5">History</h1>

      {/* ── Year heatmap ── */}
      <YearHeatmap sessionCountMap={sessionCountMap} />

      {/* ── Calendar ── */}
      <div className="rounded-2xl bg-app-card border border-app-border p-4 mb-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl bg-app-bg border border-app-border text-app-muted active:bg-app-border"
            aria-label="Previous month"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-bold text-app-text">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-xl bg-app-bg border border-app-border text-app-muted active:bg-app-border"
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
            <div key={d} className="text-center text-xs text-app-faint font-medium py-1">{d}</div>
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
                    ? 'bg-accent text-app-text font-bold'
                    : hasSession
                    ? 'text-app-text'
                    : 'text-app-muted',
                ].join(' ')}>
                  {date.getDate()}
                </span>
                {hasSession && !isToday && (
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-dark mt-0.5" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Session list ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-app-text">
          {monthLabel}
        </h2>
        <span className="text-xs text-app-muted">
          {monthSessions.length} {monthSessions.length === 1 ? 'session' : 'sessions'}
        </span>
      </div>

      {monthSessions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted">
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
                  className="w-full flex items-center gap-4 rounded-2xl bg-app-card border border-app-border px-4 py-3 text-left active:bg-accent-light"
                >
                  {/* Date bubble */}
                  <div className="flex-none w-12 h-12 rounded-xl bg-accent-light flex flex-col items-center justify-center">
                    <span className="text-accent-dark text-lg font-bold leading-none">{dayNum}</span>
                    <span className="text-accent-dark/70 text-xs">{month}</span>
                  </div>

                  {/* Name + date */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-app-text truncate">{dayName}</p>
                    <p className="text-xs text-app-muted mt-0.5">{dateStr}</p>
                  </div>

                  {/* Duration */}
                  <div className="flex-none text-right">
                    <p className="text-sm font-semibold text-app-text">{duration}</p>
                    <p className="text-xs text-app-muted">duration</p>
                  </div>

                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-faint flex-none">
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
