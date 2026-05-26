/**
 * Home — main dashboard.
 *
 * Layout inspired by the Fitness App UI Kit:
 *   – Bold greeting header + settings shortcut
 *   – Horizontal quick-access icon pills
 *   – Weekly stats strip (sessions + volume this Mon–Sun)
 *   – Featured "Start Workout" lime card — shows next recommended program day
 *     and starts it directly on tap (no detour via the Log screen)
 *   – Recent sessions list
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { WorkoutDay } from '../db/db'
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

// ── Icon components ───────────────────────────────────────────────────────────

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function IconCalculator() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="12" y1="10" x2="12" y2="10" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="16" y1="10" x2="16" y2="10" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="8" y1="14" x2="8" y2="14" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="12" y1="14" x2="12" y2="14" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="16" y1="14" x2="16" y2="14" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="8" y1="18" x2="8" y2="18" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="18" strokeWidth={2.5} strokeLinecap="round" />
      <line x1="16" y1="18" x2="16" y2="18" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function IconArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
      strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// ── Quick-access pills data ───────────────────────────────────────────────────

const PILLS = [
  { to: '/log',        label: 'Log',        Icon: IconPlay },
  { to: '/programs',   label: 'Programs',   Icon: IconGrid },
  { to: '/history',    label: 'History',    Icon: IconCalendar },
  { to: '/progress',   label: 'Progress',   Icon: IconChart },
  { to: '/exercises',  label: 'Exercises',  Icon: IconSearch },
  { to: '/calculator', label: 'Calculator', Icon: IconCalculator },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate  = useNavigate()
  const [starting, setStarting] = useState(false)

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

    const dayNames = await Promise.all(
      recentSessions.map(async (s) => {
        if (!s.workoutDayId) return 'Ad-hoc'
        const day = await db.workoutDays.get(s.workoutDayId)
        return day && !day.deleted ? day.name : 'Ad-hoc'
      })
    )

    // ── Next recommended day ──────────────────────────────────────────────────
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

    // ── Weekly stats (Mon–Sun of current week) ────────────────────────────────
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
      activeProgram,
      activeSession,
      recentSessions,
      dayNames,
      nextDay,
      weekStats: { sessions: weekSessions.length, volumeKg: weekVolume },
    }
  }, [])

  // ── Start next day directly ───────────────────────────────────────────────

  async function startNextDay(day: WorkoutDay, programId: string) {
    if (starting) return
    setStarting(true)
    try {
      const timestamp = now()
      const sessionId = crypto.randomUUID()

      await db.workoutSessions.add({
        id:           sessionId,
        workoutDayId: day.id,
        programId,
        date:         today(),
        startedAt:    timestamp,
        finishedAt:   null,
        notes:        '',
        createdAt:    timestamp,
        updatedAt:    timestamp,
        syncedAt:     null,
        deleted:      false,
      })

      const dayExercises = await db.dayExercises
        .where('workoutDayId').equals(day.id)
        .filter((de) => !de.deleted)
        .toArray()

      dayExercises.sort((a, b) => a.order - b.order)

      if (dayExercises.length > 0) {
        await db.sessionExercises.bulkAdd(
          dayExercises.map((de, idx) => ({
            id:               crypto.randomUUID(),
            workoutSessionId: sessionId,
            exerciseId:       de.exerciseId,
            order:            idx,
            notes:            '',
            createdAt:        timestamp,
            updatedAt:        timestamp,
            syncedAt:         null,
            deleted:          false,
          }))
        )
      }

      navigate('/log')
    } catch {
      setStarting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const todayLabel = new Date().toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-4">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Hi there <span className="text-lime-400">👋</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{todayLabel}</p>
        </div>
        <Link
          to="/settings"
          className="p-2.5 rounded-2xl bg-gray-800 text-gray-300 active:bg-gray-700"
          aria-label="Settings"
        >
          <IconSettings />
        </Link>
      </div>

      {/* ── Quick-access pills ─────────────────────────────────────── */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {PILLS.map(({ to, label, Icon }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-2 flex-none">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center text-lime-400">
              <Icon />
            </div>
            <span className="text-xs text-gray-400">{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Weekly stats strip ─────────────────────────────────────── */}
      {data && (
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl bg-gray-800/60 px-4 py-3 text-center">
            <p className="text-xl font-bold text-white">{data.weekStats.sessions}</p>
            <p className="text-xs text-gray-400 mt-0.5">sessions this week</p>
          </div>
          <div className="flex-1 rounded-2xl bg-gray-800/60 px-4 py-3 text-center">
            <p className="text-xl font-bold text-white">
              {data.weekStats.volumeKg > 0 ? formatVolume(data.weekStats.volumeKg) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">volume this week</p>
          </div>
        </div>
      )}

      {/* ── Start Workout card ─────────────────────────────────────── */}
      {data?.activeSession ? (
        /* Resume in-progress session */
        <Link
          to="/log"
          className="relative rounded-2xl bg-lime-400 px-5 py-6 active:bg-lime-500 overflow-hidden"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-lime-300/40 pointer-events-none" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-lime-300/30 pointer-events-none" />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 relative">
            In progress
          </p>
          <p className="text-2xl font-bold text-gray-900 relative">Resume Workout</p>
          <p className="text-sm text-gray-700 mt-1 relative">You have an unfinished session</p>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-800">
            <IconArrow />
          </div>
        </Link>
      ) : data?.nextDay && data?.activeProgram ? (
        /* Start next recommended day directly */
        <button
          onClick={() => startNextDay(data.nextDay!, data.activeProgram!.id)}
          disabled={starting}
          className="relative rounded-2xl bg-lime-400 px-5 py-6 active:bg-lime-500 overflow-hidden text-left w-full disabled:opacity-70"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-lime-300/40 pointer-events-none" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-lime-300/30 pointer-events-none" />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 relative">
            {data.activeProgram.name} · Next up
          </p>
          <p className="text-2xl font-bold text-gray-900 relative">
            {starting ? 'Starting…' : data.nextDay.name}
          </p>
          <p className="text-sm text-gray-700 mt-1 relative">Tap to start this session</p>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-800">
            <IconArrow />
          </div>
        </button>
      ) : (
        /* No active program — generic link to Log */
        <Link
          to="/log"
          className="relative rounded-2xl bg-lime-400 px-5 py-6 active:bg-lime-500 overflow-hidden"
        >
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-lime-300/40 pointer-events-none" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-lime-300/30 pointer-events-none" />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1 relative">
            Ad-hoc workout
          </p>
          <p className="text-2xl font-bold text-gray-900 relative">Start Workout</p>
          <p className="text-sm text-gray-700 mt-1 relative">No active program — go to Programs to set one</p>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-800">
            <IconArrow />
          </div>
        </Link>
      )}

      {/* ── Recent Sessions ────────────────────────────────────────── */}
      {data?.recentSessions && data.recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">Recent Sessions</h2>
            <Link to="/history" className="text-xs text-lime-400 font-medium">
              See All
            </Link>
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
                  className="flex items-center gap-4 bg-gray-800/60 rounded-2xl px-4 py-3 active:bg-gray-800"
                >
                  <div className="flex-none w-12 h-12 rounded-xl bg-lime-400/10 flex flex-col items-center justify-center">
                    <span className="text-lime-400 text-lg font-bold leading-none">{dayNum}</span>
                    <span className="text-lime-400/70 text-xs">{month}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white truncate">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                  </div>

                  <div className="flex-none text-right">
                    <p className="text-sm font-semibold text-white">{duration}</p>
                    <p className="text-xs text-gray-500">duration</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {data?.recentSessions?.length === 0 && (
        <div className="rounded-2xl bg-gray-800/40 px-5 py-8 text-center">
          <p className="text-gray-400 text-sm">No sessions logged yet.</p>
          <p className="text-gray-500 text-xs mt-1">Hit Start Workout to begin.</p>
        </div>
      )}

    </div>
  )
}
