/**
 * Home (Dash) — main dashboard.
 *
 * Order:
 *   Top bar (avatar, greeting, bell)
 *   7-day date strip with workout dots
 *   Weekly stats (sessions + volume)
 *   Today's Workout hero card (next program day, starts directly)
 *   Recent sessions list
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { WorkoutDay } from '../db/db'
import { useAuth } from '../contexts/AuthContext'
import { formatDuration } from '../lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-AU', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function getWeekBounds(): { from: string; to: string } {
  const d   = new Date()
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  return { from: fmt(mon), to: fmt(sun) }
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${+(kg / 1000).toFixed(1)} t`
  return `${Math.round(kg)} kg`
}

function buildDateStrip(): Array<{ date: Date; iso: string; dow: string }> {
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dow = today.getDay()
  const mon = new Date(today)
  mon.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return {
      date: d,
      iso:  d.toISOString().slice(0, 10),
      dow:  d.toLocaleDateString('en-AU', { weekday: 'short' }),
    }
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { session } = useAuth()
  const navigate    = useNavigate()
  const [starting, setStarting] = useState(false)

  // Derive display name from email: "dewaldhwerner@gmail.com" → "Dewald"
  const email       = session?.user?.email ?? ''
  const rawName     = email.split('@')[0].split(/[._\-]/)[0]
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initials    = displayName.slice(0, 2).toUpperCase()

  const todayIso   = today()
  const dateStrip  = buildDateStrip()
  const todayLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const data = useLiveQuery(async () => {
    const activeProgram = await db.programs
      .filter((p) => p.isActive && !p.deleted)
      .first()

    const activeSession = await db.workoutSessions
      .filter((s) => !s.deleted && s.finishedAt === null)
      .first()

    const allSessions = await db.workoutSessions
      .filter((s) => !s.deleted && s.finishedAt !== null)
      .toArray()

    const sorted         = allSessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const recentSessions = sorted.slice(0, 4)
    const sessionDateSet = new Set(allSessions.map((s) => s.date))

    const dayNames = await Promise.all(
      recentSessions.map(async (s) => {
        if (!s.workoutDayId) return 'Ad-hoc'
        const day = await db.workoutDays.get(s.workoutDayId)
        return day && !day.deleted ? day.name : 'Ad-hoc'
      })
    )

    // Next recommended day
    let nextDay: WorkoutDay | null = null
    if (activeProgram) {
      const programDays = await db.workoutDays
        .where('programId').equals(activeProgram.id)
        .filter((d) => !d.deleted)
        .toArray()
        .then((list) => list.sort((a, b) => a.order - b.order))

      if (programDays.length > 0) {
        const lastProgramSession = sorted.find(
          (s) => s.programId === activeProgram.id && s.workoutDayId != null
        )
        if (lastProgramSession) {
          const idx = programDays.findIndex((d) => d.id === lastProgramSession.workoutDayId)
          nextDay = programDays[(idx + 1) % programDays.length]
        } else {
          nextDay = programDays[0]
        }
      }
    }

    // Weekly stats
    const { from, to } = getWeekBounds()
    const weekSessions  = allSessions.filter((s) => s.date >= from && s.date <= to)
    let weekVolume = 0
    if (weekSessions.length > 0) {
      const weekSessionIdSet = new Set(weekSessions.map((s) => s.id))
      const weekSEs = await db.sessionExercises
        .filter((se) => !se.deleted && weekSessionIdSet.has(se.workoutSessionId))
        .toArray()
      if (weekSEs.length > 0) {
        const seIdSet  = new Set(weekSEs.map((se) => se.id))
        const weekSets = await db.sets
          .filter((s) =>
            !s.deleted && !s.isWarmup &&
            s.weight > 0 && s.reps > 0 &&
            seIdSet.has(s.sessionExerciseId)
          )
          .toArray()
        weekVolume = weekSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      }
    }

    return {
      activeProgram, activeSession, recentSessions, dayNames,
      nextDay, sessionDateSet,
      weekStats: { sessions: weekSessions.length, volumeKg: weekVolume },
    }
  }, [])

  // Start the recommended next day directly
  async function startNextDay(day: WorkoutDay, programId: string) {
    if (starting) return
    setStarting(true)
    try {
      const timestamp = now()
      const sessionId = crypto.randomUUID()
      await db.workoutSessions.add({
        id: sessionId, workoutDayId: day.id, programId,
        date: today(), startedAt: timestamp, finishedAt: null,
        notes: '', createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
      })
      const dayExercises = await db.dayExercises
        .where('workoutDayId').equals(day.id)
        .filter((de) => !de.deleted)
        .toArray()
      dayExercises.sort((a, b) => a.order - b.order)
      if (dayExercises.length > 0) {
        await db.sessionExercises.bulkAdd(
          dayExercises.map((de, idx) => ({
            id: crypto.randomUUID(), workoutSessionId: sessionId,
            exerciseId: de.exerciseId, order: idx, notes: '',
            createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
          }))
        )
      }
      navigate('/log')
    } catch {
      setStarting(false)
    }
  }

  return (
    <div className="flex flex-col pb-4">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="bg-app-bg px-5 pt-5 pb-3 flex items-center gap-3 border-b border-app-border">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-xs font-extrabold text-app-text flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <p className="text-xs text-app-muted font-medium">Let's Go,</p>
          <p className="text-xl font-extrabold text-app-text leading-tight">{displayName}</p>
        </div>
        <Link to="/settings" className="w-9 h-9 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-muted active:bg-gray-100" aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" />
          </svg>
        </Link>
      </div>

      {/* ── Date strip ──────────────────────────────────────────────── */}
      <div className="bg-app-bg px-4 pt-3 pb-3 border-b border-app-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-app-text">
            {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
          </p>
          <span className="text-xs font-bold text-app-text bg-accent px-3 py-1 rounded-full">Today</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {dateStrip.map(({ date, iso, dow }) => {
            const isToday      = iso === todayIso
            const hasWorkout   = data?.sessionDateSet.has(iso) ?? false
            return (
              <div
                key={iso}
                className={[
                  'flex-shrink-0 w-11 rounded-2xl py-2 text-center border',
                  isToday
                    ? 'bg-accent border-accent'
                    : 'bg-app-card border-app-border',
                ].join(' ')}
              >
                <p className={`text-[10px] font-semibold uppercase mb-0.5 ${isToday ? 'text-app-text/60' : 'text-app-muted'}`}>
                  {dow}
                </p>
                <p className={`text-base font-extrabold ${isToday ? 'text-app-text' : 'text-app-text'}`}>
                  {date.getDate()}
                </p>
                <div className={`w-1 h-1 rounded-full mx-auto mt-1 ${hasWorkout ? (isToday ? 'bg-app-text/40' : 'bg-green-500') : 'bg-app-border'}`} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4">

        {/* ── Weekly stats ────────────────────────────────────────────── */}
        {data && (
          <div className="flex gap-3">
            <div className="flex-1 bg-app-card rounded-2xl border border-app-border px-4 py-3 text-center">
              <p className="text-xl font-extrabold text-app-text">{data.weekStats.sessions}</p>
              <p className="text-xs text-app-muted mt-0.5">sessions this week</p>
            </div>
            <div className="flex-1 bg-app-card rounded-2xl border border-app-border px-4 py-3 text-center">
              <p className="text-xl font-extrabold text-app-text">
                {data.weekStats.volumeKg > 0 ? formatVolume(data.weekStats.volumeKg) : '—'}
              </p>
              <p className="text-xs text-app-muted mt-0.5">volume this week</p>
            </div>
          </div>
        )}

        {/* ── Today's Workout hero card ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-extrabold text-app-text">Today's Workout</p>
          </div>

          {data?.activeSession ? (
            <Link to="/log" className="block rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#241F20,#3A3540)' }}>
              <div className="px-5 py-5 relative">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-1">In progress</p>
                <p className="text-2xl font-extrabold text-white mb-3">Resume Workout</p>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2 rounded-xl">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Continue
                </div>
              </div>
            </Link>
          ) : data?.nextDay && data?.activeProgram ? (
            <button
              onClick={() => startNextDay(data.nextDay!, data.activeProgram!.id)}
              disabled={starting}
              className="w-full rounded-2xl overflow-hidden text-left disabled:opacity-70 active:opacity-80"
              style={{ background: 'linear-gradient(135deg,#241F20,#3A3540)' }}
            >
              <div className="px-5 py-5 relative">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-1">
                  {data.activeProgram.name} · Next Up
                </p>
                <p className="text-2xl font-extrabold text-white mb-1">
                  {starting ? 'Starting…' : data.nextDay.name}
                </p>
                <div className="flex items-center gap-4 mb-4">
                  <span className="flex items-center gap-1 text-white/70 text-xs">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-accent"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" /></svg>
                    Tap to start
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2 rounded-xl">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Start Now
                </div>
              </div>
            </button>
          ) : (
            <Link to="/log" className="block rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#241F20,#3A3540)' }}>
              <div className="px-5 py-5 relative">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
                <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-1">Ad-hoc</p>
                <p className="text-2xl font-extrabold text-white mb-3">Start Workout</p>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2 rounded-xl">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Start Now
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* ── Recent Sessions ──────────────────────────────────────────── */}
        {data?.recentSessions && data.recentSessions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-extrabold text-app-text">Recent Sessions</p>
              <Link to="/history" className="text-xs text-accent-dark font-bold">See All</Link>
            </div>

            <div className="flex flex-col gap-2">
              {data.recentSessions.map((session, i) => {
                const name     = data.dayNames[i]
                const duration = formatDuration(session.startedAt, session.finishedAt)
                const date     = dayLabel(session.date)
                const dayNum   = new Date(session.date + 'T12:00:00').getDate()
                const month    = new Date(session.date + 'T12:00:00').toLocaleDateString('en-AU', { month: 'short' })

                return (
                  <Link
                    key={session.id}
                    to={`/history/${session.id}`}
                    className="flex items-center gap-3 bg-app-card rounded-2xl border border-app-border px-4 py-3 active:bg-gray-50"
                  >
                    <div className="flex-none w-11 h-11 rounded-xl bg-accent-light flex flex-col items-center justify-center">
                      <span className="text-accent-dark text-base font-extrabold leading-none">{dayNum}</span>
                      <span className="text-accent-dark/70 text-[10px] font-medium">{month}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-app-text truncate">{name}</p>
                      <p className="text-xs text-app-muted mt-0.5">{date}</p>
                    </div>
                    <div className="flex-none text-right">
                      <p className="text-sm font-bold text-app-text">{duration}</p>
                      <p className="text-xs text-app-muted">duration</p>
                    </div>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-faint flex-none">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {data?.recentSessions?.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-app-border px-5 py-8 text-center">
            <p className="text-app-muted text-sm">No sessions logged yet.</p>
            <p className="text-app-faint text-xs mt-1">Tap Start Workout above to begin.</p>
          </div>
        )}

      </div>
    </div>
  )
}
