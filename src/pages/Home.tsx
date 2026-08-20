/**
 * Home (Dash) - premium Drovik dashboard.
 */

import { useState, useMemo, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { WorkoutDay } from '../db/db'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { loadProfile, calcBMR, calcTDEE, calcMacros, DIET_PROGRAMS } from '../lib/tdee'
import { useUnits } from '../contexts/UnitsContext'
import { kgToDisplay, weightLabel, fmtVolume, mlToDisplay, waterLabel, displayToKg } from '../lib/units'
import { PremiumIconTile, brandIconTileStyle } from '../components/BrandIcon'
import type { BrandIconName, BrandIconTone } from '../components/BrandIcon'

const WATER_GOAL_ML = 2500
const DEFAULT_GOALS = { calories: 2400, proteinG: 150, carbsG: 250, fatG: 70 }

function getWeekBounds() {
  const d = new Date()
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  return { from: fmt(mon), to: fmt(sun) }
}

function buildDateStrip() {
  const t = new Date()
  t.setHours(12, 0, 0, 0)
  const dow = t.getDay()
  const mon = new Date(t)
  mon.setDate(t.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return {
      date: d,
      iso: d.toISOString().slice(0, 10),
      dow: d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase(),
    }
  })
}

function buildMobileDateStrip() {
  const t = new Date()
  t.setHours(12, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(t)
    d.setDate(t.getDate() + i - 2)
    return {
      date: d,
      iso: d.toISOString().slice(0, 10),
      dow: d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase(),
    }
  })
}

function Donut({ pct, color, size = 66 }: { pct: number; color: string; size?: number }) {
  const r = 20
  const c = 2 * Math.PI * r
  const arc = Math.min(pct / 100, 1) * c
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="drop-shadow-sm">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--dash-ring-track)" strokeWidth="5" />
      <circle
        cx="24"
        cy="24"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={`${arc} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
    </svg>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-xs font-extrabold uppercase tracking-widest text-app-muted">{children}</h2>
}

function MetricRing({
  label,
  value,
  target,
  pct,
  color,
}: {
  label: string
  value: string
  target: string
  pct: number
  color: string
}) {
  return (
    <div className="metric-ring flex items-center gap-3 min-w-0">
      <div className="relative flex-none">
        <Donut pct={pct} color={color} />
        <p className="absolute inset-0 flex items-center justify-center text-xl font-extrabold text-app-text leading-none">{value}</p>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase text-app-text">{label}</p>
        <p className="text-xs font-medium text-app-muted">{target}</p>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  tone,
  label,
  value,
  detail,
  to,
}: {
  icon: BrandIconName
  tone: BrandIconTone
  label: string
  value: string
  detail: string
  to: string
}) {
  return (
    <Link to={to} className="dashboard-panel flex items-center gap-4 p-4 min-h-[120px] active:scale-[0.99] transition-transform">
      <PremiumIconTile name={icon} tone={tone} size="xl" usage="card" active iconSize={44} />
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase text-app-muted">{label}</p>
        <p className="text-3xl font-extrabold text-accent-label leading-tight">{value}</p>
        <p className="text-sm font-medium text-app-muted leading-tight whitespace-pre-line">{detail}</p>
      </div>
    </Link>
  )
}

function WaterGraph({ pct }: { pct: number }) {
  const width = Math.max(0, Math.min(100, pct))
  return (
    <div className="water-graph">
      <svg viewBox="0 0 1000 86" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 56 C80 18 145 80 225 42 C300 8 358 82 440 44 C520 10 585 72 665 38 C750 2 825 70 1000 35 L1000 86 L0 86 Z" className="water-fill" style={{ clipPath: `inset(0 ${100 - width}% 0 0)` }} />
        <path d="M0 56 C80 18 145 80 225 42 C300 8 358 82 440 44 C520 10 585 72 665 38 C750 2 825 70 1000 35" className="water-line" />
        {Array.from({ length: 31 }, (_, i) => (
          <line key={i} x1={i * 33.3} x2={i * 33.3} y1="66" y2={i % 5 === 0 ? '84' : '76'} className="water-tick" />
        ))}
      </svg>
      <div className="flex justify-between text-xs font-medium text-app-muted px-1">
        <span>0</span>
        <span>750</span>
        <span>1500</span>
        <span>2500</span>
      </div>
    </div>
  )
}

function RailCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <aside className={`dashboard-panel p-5 ${className}`}>{children}</aside>
}

function FlameIconTile() {
  return (
    <PremiumIconTile name="streak" tone="flame" size="xl" usage="card" active iconSize={42} />
  )
}

function TrophyIconTile() {
  return (
    <PremiumIconTile name="achievement" tone="gold" size="lg" usage="card" active iconSize={36} />
  )
}

function HeroAthlete() {
  const base = import.meta.env.BASE_URL
  return (
    <div className="hero-athlete-wrap" aria-hidden="true">
      <img
        src={`${base}assets/bodybuilder-hero.webp`}
        alt=""
        className="hero-athlete-img"
        draggable={false}
      />
    </div>
  )
}

function OutlineButton({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Link to={to} className="inline-flex items-center justify-center rounded-input border border-orange-500/80 px-5 py-2.5 text-sm font-extrabold text-accent-label shadow-[0_0_16px_-10px_rgba(255,112,0,0.9)] transition hover:bg-accent-light active:scale-[0.98]">
      {children}
    </Link>
  )
}

export default function Home() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { units } = useUnits()
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [savingWt, setSavingWt] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const email = session?.user?.email ?? ''
  const rawName = email.split('@')[0].split(/[._\-]/)[0]
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initials = displayName.slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url) })
  }, [session])

  const todayIso = today()
  const dateStrip = buildDateStrip()
  const mobileDateStrip = buildMobileDateStrip()
  const fullDate = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })

  const data = useLiveQuery(async () => {
    const [activeProgram, activeSession, allSessions] = await Promise.all([
      db.programs.filter((p) => p.isActive && !p.deleted).first(),
      db.workoutSessions.filter((s) => !s.deleted && s.finishedAt === null).first(),
      db.workoutSessions.filter((s) => !s.deleted && s.finishedAt !== null).toArray(),
    ])

    const sorted = allSessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const sessionDateSet = new Set(allSessions.map((s) => s.date))
    let nextDay: WorkoutDay | null = null
    let nextDayExCount = 0

    if (activeProgram) {
      const programDays = await db.workoutDays
        .where('programId').equals(activeProgram.id)
        .filter((d) => !d.deleted)
        .toArray()
        .then((list) => list.sort((a, b) => a.order - b.order))

      if (programDays.length > 0) {
        const last = sorted.find((s) => s.programId === activeProgram.id && s.workoutDayId != null)
        if (last) {
          const idx = programDays.findIndex((d) => d.id === last.workoutDayId)
          nextDay = programDays[(idx + 1) % programDays.length]
        } else {
          nextDay = programDays[0]
        }
      }

      if (nextDay) {
        nextDayExCount = await db.dayExercises
          .where('workoutDayId').equals(nextDay.id)
          .filter((de) => !de.deleted)
          .count()
      }
    }

    const { from, to } = getWeekBounds()
    const weekSessions = allSessions.filter((s) => s.date >= from && s.date <= to)
    let weekVolume = 0
    if (weekSessions.length > 0) {
      const weekIds = new Set(weekSessions.map((s) => s.id))
      const weekSEs = await db.sessionExercises
        .filter((se) => !se.deleted && weekIds.has(se.workoutSessionId))
        .toArray()
      if (weekSEs.length > 0) {
        const seIds = new Set(weekSEs.map((se) => se.id))
        const wkSets = await db.sets
          .filter((s) => !s.deleted && !s.isWarmup && s.weight > 0 && s.reps > 0 && seIds.has(s.sessionExerciseId))
          .toArray()
        weekVolume = wkSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      }
    }

    return {
      activeProgram,
      activeSession,
      nextDay,
      nextDayExCount,
      sessionDateSet,
      weekStats: { sessions: weekSessions.length, volumeKg: weekVolume },
    }
  }, [])

  const todayNutrition = useLiveQuery(
    () => db.nutritionLogs.filter((l) => l.date === todayIso && !l.deleted).first(),
    [todayIso],
  )

  const latestWeight = useLiveQuery(async () => {
    const logs = await db.bodyWeightLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => list.sort((a, b) => b.date.localeCompare(a.date)))
    return logs[0] ?? null
  }, [])

  const todayFoodTotals = useLiveQuery(async () => {
    const logs = await db.foodLogs
      .where('date').equals(todayIso)
      .filter((l) => !l.deleted)
      .toArray()
    if (logs.length === 0) return null
    const foodIds = [...new Set(logs.map((l) => l.foodId))]
    const foods = await db.foods.where('id').anyOf(foodIds).toArray()
    const foodMap = new Map(foods.map((f) => [f.id, f]))
    return logs.reduce(
      (acc, log) => {
        const food = foodMap.get(log.foodId)
        if (!food) return acc
        const f = log.amountG / 100
        return {
          calories: acc.calories + food.caloriesPer100g * f,
          proteinG: acc.proteinG + food.proteinPer100g * f,
          carbsG: acc.carbsG + food.carbsPer100g * f,
          fatG: acc.fatG + food.fatPer100g * f,
        }
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    )
  }, [todayIso])

  const todayHealth = useLiveQuery(
    () => db.healthMetrics.filter(h => !h.deleted && h.date === todayIso).first(),
    [todayIso],
  )

  const latestHealthWorkout = useLiveQuery(
    () => db.healthWorkouts.filter(h => !h.deleted).toArray()
      .then(a => a.sort((x, y) => y.workoutDate.localeCompare(x.workoutDate))[0] ?? null),
    [],
  )

  // ── Achievements + streak ─────────────────────────────────────────────────
  const achievementStats = useLiveQuery(async () => {
    const [
      allSessions, allBodyWeights, allFoodLogs, allNutritionLogs,
      allPrograms, allSets, allSessionExercises, allHealthMetrics,
    ] = await Promise.all([
      db.workoutSessions.filter(s => !s.deleted && s.finishedAt !== null).toArray(),
      db.bodyWeightLogs.filter(l => !l.deleted).toArray(),
      db.foodLogs.filter(l => !l.deleted).toArray(),
      db.nutritionLogs.filter(l => !l.deleted).toArray(),
      db.programs.filter(p => !p.deleted).toArray(),
      db.sets.filter(s => !s.deleted && !s.isWarmup && s.weight > 0 && s.reps > 0).toArray(),
      db.sessionExercises.filter(se => !se.deleted).toArray(),
      db.healthMetrics.filter(h => !h.deleted).toArray(),
    ])
    const sessionCount = allSessions.length
    const sessionDates = new Set(allSessions.map(s => s.date))
    // Streak
    const todayD = new Date(); todayD.setHours(12, 0, 0, 0)
    const isoD = (d: Date) => d.toISOString().slice(0, 10)
    let streak = 0
    const sc = new Date(todayD)
    if (!sessionDates.has(isoD(sc))) sc.setDate(sc.getDate() - 1)
    while (sessionDates.has(isoD(sc))) { streak++; sc.setDate(sc.getDate() - 1) }
    // Last 7 days for dot indicators
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(todayD); d.setDate(todayD.getDate() - 6 + i)
      return sessionDates.has(isoD(d))
    })
    const totalVolumeKg   = allSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
    const uniqueExercises = new Set(allSessionExercises.map(se => se.exerciseId)).size
    const bwDays          = new Set(allBodyWeights.map(l => l.date)).size
    const foodDays        = new Set(allFoodLogs.map(l => l.date)).size
    const hitWaterGoal    = allNutritionLogs.some(l => (l.waterMl ?? 0) >= WATER_GOAL_ML)
    const { from, to }   = getWeekBounds()
    const weekCount       = allSessions.filter(s => s.date >= from && s.date <= to).length
    const TOTAL = 24
    const achievements = [
      { id: 'first-workout',  unlocked: sessionCount >= 1   },
      { id: '5-workouts',     unlocked: sessionCount >= 5   },
      { id: '10-workouts',    unlocked: sessionCount >= 10  },
      { id: '25-workouts',    unlocked: sessionCount >= 25  },
      { id: '50-workouts',    unlocked: sessionCount >= 50  },
      { id: '100-workouts',   unlocked: sessionCount >= 100 },
      { id: '3-streak',       unlocked: streak >= 3         },
      { id: '7-streak',       unlocked: streak >= 7         },
      { id: '14-streak',      unlocked: streak >= 14        },
      { id: '30-streak',      unlocked: streak >= 30        },
      { id: '10k-volume',     unlocked: totalVolumeKg >= 10000  },
      { id: '100k-volume',    unlocked: totalVolumeKg >= 100000 },
      { id: 'first-weight',   unlocked: bwDays >= 1         },
      { id: '7-weights',      unlocked: bwDays >= 7         },
      { id: '30-weights',     unlocked: bwDays >= 30        },
      { id: 'first-meal',     unlocked: foodDays >= 1       },
      { id: '7-food',         unlocked: foodDays >= 7       },
      { id: '30-food',        unlocked: foodDays >= 30      },
      { id: 'water-goal',     unlocked: hitWaterGoal        },
      { id: 'week-beast',     unlocked: weekCount >= 5      },
      { id: 'first-program',  unlocked: allPrograms.length >= 1      },
      { id: 'apple-watch',    unlocked: allHealthMetrics.length >= 1 },
      { id: '10-exercises',   unlocked: uniqueExercises >= 10 },
      { id: '20-exercises',   unlocked: uniqueExercises >= 20 },
    ]
    return { streak, last7, unlockedCount: achievements.filter(a => a.unlocked).length, total: TOTAL }
  }, [])

  const macroTargets = useMemo(() => {
    const profile = loadProfile()
    const weightKg = latestWeight?.weight
    if (!profile || !weightKg) return DEFAULT_GOALS
    const bmr = calcBMR(weightKg, profile.heightCm, profile.age, profile.sex)
    const tdee = calcTDEE(bmr, profile.activityLevel)
    const diet = DIET_PROGRAMS.find((d) => d.id === profile.dietId) ?? DIET_PROGRAMS[0]
    return calcMacros(weightKg, tdee, diet)
  }, [latestWeight])

  const waterMl = todayNutrition?.waterMl ?? 0
  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100))

  async function addWater(ml: number) {
    const newTotal = Math.min(waterMl + ml, WATER_GOAL_ML * 2)
    const ts = now()
    if (todayNutrition) {
      await db.nutritionLogs.update(todayNutrition.id, { waterMl: newTotal, updatedAt: ts, syncedAt: null })
    } else {
      await db.nutritionLogs.add({
        id: crypto.randomUUID(),
        date: todayIso,
        calories: null,
        proteinG: null,
        carbsG: null,
        fatG: null,
        waterMl: newTotal,
        notes: '',
        createdAt: ts,
        updatedAt: ts,
        syncedAt: null,
        deleted: false,
      })
    }
  }

  async function saveWeight() {
    const val = parseFloat(weightInput)
    if (isNaN(val) || val <= 0) return
    setSavingWt(true)
    try {
      const ts = now()
      const kg = displayToKg(val, units.weight)
      const existing = await db.bodyWeightLogs.filter((l) => l.date === todayIso && !l.deleted).first()
      if (existing) {
        await db.bodyWeightLogs.update(existing.id, { weight: kg, updatedAt: ts, syncedAt: null })
      } else {
        await db.bodyWeightLogs.add({
          id: crypto.randomUUID(),
          date: todayIso,
          weight: kg,
          notes: '',
          createdAt: ts,
          updatedAt: ts,
          syncedAt: null,
          deleted: false,
        })
      }
      setWeightInput('')
    } finally {
      setSavingWt(false)
    }
  }

  async function startNextDay(day: WorkoutDay, programId: string) {
    if (starting) return
    setStarting(true)
    setStartError(null)
    try {
      const ts = now()
      const sessionId = crypto.randomUUID()
      await db.workoutSessions.add({
        id: sessionId,
        workoutDayId: day.id,
        programId,
        date: todayIso,
        startedAt: ts,
        finishedAt: null,
        notes: '',
        createdAt: ts,
        updatedAt: ts,
        syncedAt: null,
        deleted: false,
      })
      const des = await db.dayExercises
        .where('workoutDayId').equals(day.id)
        .filter((de) => !de.deleted)
        .toArray()
      des.sort((a, b) => a.order - b.order)
      if (des.length > 0) {
        await db.sessionExercises.bulkAdd(
          des.map((de, idx) => ({
            id: crypto.randomUUID(),
            workoutSessionId: sessionId,
            exerciseId: de.exerciseId,
            order: idx,
            notes: '',
            createdAt: ts,
            updatedAt: ts,
            syncedAt: null,
            deleted: false,
          })),
        )
      }
      navigate('/log')
    } catch (err) {
      setStarting(false)
      setStartError(err instanceof Error ? err.message : 'Failed to start. Try again.')
    }
  }

  const cals = todayFoodTotals ? Math.round(todayFoodTotals.calories) : (todayNutrition?.calories ?? 0)
  const protein = todayFoodTotals ? Math.round(todayFoodTotals.proteinG) : (todayNutrition?.proteinG ?? 0)
  const carbs = todayFoodTotals ? Math.round(todayFoodTotals.carbsG) : (todayNutrition?.carbsG ?? 0)
  const fat = todayFoodTotals ? Math.round(todayFoodTotals.fatG) : (todayNutrition?.fatG ?? 0)
  const calPct = Math.min(100, Math.round((cals / macroTargets.calories) * 100))
  const proPct = Math.min(100, Math.round((protein / macroTargets.proteinG) * 100))
  const crbPct = Math.min(100, Math.round((carbs / macroTargets.carbsG) * 100))
  const fatPct = Math.min(100, Math.round((fat / macroTargets.fatG) * 100))

  const wt = latestWeight?.weight ?? null
  const wtDate = latestWeight?.date
    ? new Date(latestWeight.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : null

  const hasActiveSession = Boolean(data?.activeSession)
  const heroTitle = hasActiveSession ? 'Resume Your' : 'Start Your'
  const heroButton = hasActiveSession ? 'Resume Workout' : data?.nextDay ? `Start ${data.nextDay.name}` : 'Start Workout'

  const streak        = achievementStats?.streak ?? 0
  const last7         = achievementStats?.last7 ?? Array(7).fill(false)
  const unlockedCount = achievementStats?.unlockedCount ?? 0
  const totalAch      = achievementStats?.total ?? 24
  const achPct        = Math.round((unlockedCount / totalAch) * 100)

  const weekSessions = data?.weekStats.sessions ?? 0
  const insightMsg = weekSessions === 0
    ? { head: 'Time to train!',     body: 'No sessions logged yet this week. Head to the gym and start building momentum.' }
    : weekSessions <= 2
    ? { head: 'Good start!',        body: `${weekSessions} session${weekSessions > 1 ? 's' : ''} this week. Keep the momentum going.` }
    : weekSessions <= 4
    ? { head: 'Keep going strong!', body: "You're on track to crush your goals this week. Consistency is building champions." }
    : { head: 'Outstanding week!',  body: `${weekSessions} sessions — you're absolutely crushing it. Elite consistency.` }

  const healthSyncLabel = todayHealth?.updatedAt
    ? `Synced ${new Date(todayHealth.updatedAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}`
    : null
  const healthWorkoutSummary = latestHealthWorkout
    ? `${latestHealthWorkout.workoutType || 'Workout'}${latestHealthWorkout.durationSecs ? ` · ${Math.round(latestHealthWorkout.durationSecs / 60)} min` : ''}`
    : null

  return (
    <div className="dashboard-page page-x min-h-full py-4 md:py-5">
      {/* Mobile is intentionally a launchpad, not a stacked desktop dashboard. */}
      <div className="md:hidden space-y-3 pb-3">
        <header
          className="dashboard-panel flex items-center justify-between gap-3 px-3 py-2"
          style={{ background: 'linear-gradient(110deg, var(--color-info-bg), var(--dash-panel-strong) 55%, var(--color-accent-light))' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/profile" className="profile-orb !h-12 !w-12 flex-none" aria-label="Profile">
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="h-full w-full rounded-full object-cover" />
                : <span className="!text-sm">{initials}</span>}
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-info-text">Let's Go, {displayName}</p>
              <p className="truncate text-sm font-semibold text-app-muted">{fullDate}</p>
            </div>
          </div>
          <Link to="/settings" className="flex-none" aria-label="Settings">
            <PremiumIconTile name="settings" tone="steel" size="xs" usage="button" active iconSize={22} />
          </Link>
        </header>

        <div className="dashboard-panel grid grid-cols-5 overflow-hidden p-0">
          {mobileDateStrip.map(({ date, iso, dow }) => {
            const isToday = iso === todayIso
            const hasWorkout = data?.sessionDateSet.has(iso) ?? false
            return (
              <div key={iso} className={`relative flex min-h-[58px] flex-col items-center justify-center border-r border-app-border last:border-r-0 ${isToday ? 'bg-info-bg text-info-text' : 'text-app-text'}`}>
                <p className="text-[10px] font-extrabold">{dow}</p>
                <p className="text-xl font-extrabold leading-none">{date.getDate()}</p>
                <span className={`absolute bottom-1.5 h-1 w-1 rounded-full ${hasWorkout ? 'bg-accent' : 'bg-transparent'}`} />
              </div>
            )
          })}
        </div>

        <section
          className="relative min-h-[142px] overflow-hidden rounded-card border border-orange-500/70 p-4 shadow-card"
          style={{ background: 'radial-gradient(circle at 92% 18%, rgba(0,168,255,0.28), transparent 31%), radial-gradient(circle at 8% 110%, rgba(255,107,0,0.22), transparent 38%), linear-gradient(135deg, #07111A, #0C1824)' }}
        >
          <PremiumIconTile name="workout" tone="blue" size="sm" usage="card" active iconSize={28} className="absolute right-3 top-3" />
          <div className="flex h-full min-h-[110px] flex-col justify-between">
            <div className="min-w-0 pr-12">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-sky-300">Today's Workout</p>
              <h1 className="mt-1 truncate text-2xl font-extrabold italic leading-tight text-white">
                {hasActiveSession ? 'Resume workout' : data?.nextDay?.name ?? 'Start your workout'}
              </h1>
            </div>
            <div className="flex items-end justify-between gap-3">
              <p className="min-w-0 text-xs font-semibold text-slate-300">
                {data?.nextDayExCount ? `${data.nextDayExCount} exercises` : 'Ready when you are'}
              </p>
            {hasActiveSession ? (
              <Link to="/log" className="flex-none rounded-input bg-accent px-4 py-2.5 text-sm font-extrabold text-[var(--color-on-accent)]">Resume</Link>
            ) : data?.nextDay && data?.activeProgram ? (
              <button
                onClick={() => startNextDay(data.nextDay!, data.activeProgram!.id)}
                disabled={starting}
                className="flex-none rounded-input bg-accent px-4 py-2.5 text-sm font-extrabold text-[var(--color-on-accent)] disabled:opacity-60"
              >
                {starting ? 'Starting…' : 'Start Workout'}
              </button>
            ) : (
              <Link to="/log" className="flex-none rounded-input bg-accent px-4 py-2.5 text-sm font-extrabold text-[var(--color-on-accent)]">Start Workout</Link>
            )}
            </div>
          </div>
        </section>

        <section className="dashboard-panel border-info-text/30 bg-info-bg p-3 shadow-[0_14px_30px_-24px_rgba(0,132,255,0.65)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PremiumIconTile name="cardio" tone="blue" size="xs" usage="card" active iconSize={19} />
              <SectionTitle>Health Today</SectionTitle>
            </div>
            {healthSyncLabel ? (
              <span className="text-[10px] font-semibold text-info-text">{healthSyncLabel}</span>
            ) : (
              <Link to="/settings" className="text-[10px] font-bold text-info-text">Connect Apple Health →</Link>
            )}
          </div>
          {todayHealth ? (
            <>
              <div className="mt-2 grid grid-cols-3 divide-x divide-app-border">
                <div className="px-2 first:pl-0">
                  <p className="text-[10px] font-extrabold uppercase text-app-muted">Steps</p>
                  <p className="truncate text-lg font-extrabold text-app-text">{todayHealth.steps?.toLocaleString() ?? '—'}</p>
                </div>
                <div className="px-2">
                  <p className="text-[10px] font-extrabold uppercase text-app-muted">Active</p>
                  <p className="truncate text-lg font-extrabold text-app-text">{todayHealth.activeCalories ?? '—'} <span className="text-[10px] text-app-muted">kcal</span></p>
                </div>
                <div className="px-2 pr-0">
                  <p className="text-[10px] font-extrabold uppercase text-app-muted">Resting HR</p>
                  <p className="truncate text-lg font-extrabold text-info-text">{todayHealth.restingHr ?? '—'} <span className="text-[10px] text-app-muted">bpm</span></p>
                </div>
              </div>
              {healthWorkoutSummary && <p className="mt-2 truncate border-t border-app-border pt-2 text-[10px] font-semibold text-app-muted">Latest: {healthWorkoutSummary}</p>}
            </>
          ) : (
            <p className="mt-2 text-xs font-medium text-app-muted">No synced health data for today.</p>
          )}
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <SectionTitle>Today at a glance</SectionTitle>
            <span className="text-[10px] font-semibold text-app-faint">Tap for details</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Link
              to="/nutrition"
              className="dashboard-panel relative min-w-0 overflow-hidden border-orange-400/35 p-2.5 text-center"
              style={{ background: 'linear-gradient(160deg, var(--dash-panel-strong), var(--color-accent-light))' }}
            >
              <PremiumIconTile name="nutrition" tone="flame" size="xs" usage="card" active iconSize={18} className="mx-auto mb-1" />
              <p className="text-[10px] font-extrabold uppercase text-app-muted">Nutrition</p>
              <p className="truncate text-lg font-extrabold text-app-text">{cals.toLocaleString()}</p>
              <p className="text-[10px] font-semibold text-app-faint">of {macroTargets.calories.toLocaleString()} cal</p>
            </Link>
            <Link
              to="/nutrition"
              className="dashboard-panel min-w-0 border-info-text/35 bg-info-bg p-2.5 text-center"
            >
              <PremiumIconTile name="water" tone="blue" size="xs" usage="card" active iconSize={18} className="mx-auto mb-1" />
              <p className="text-[10px] font-extrabold uppercase text-app-muted">Water</p>
              <p className="truncate text-lg font-extrabold text-info-text">{waterPct}%</p>
              <p className="text-[10px] font-semibold text-app-faint">{mlToDisplay(waterMl, units.water)} {waterLabel(units.water)}</p>
            </Link>
            <Link
              to="/body"
              className="dashboard-panel min-w-0 border-slate-400/35 p-2.5 text-center"
              style={{ background: 'linear-gradient(160deg, var(--dash-panel-strong), var(--color-app-raised))' }}
            >
              <PremiumIconTile name="body" tone="steel" size="xs" usage="card" active iconSize={18} className="mx-auto mb-1" />
              <p className="text-[10px] font-extrabold uppercase text-app-muted">Weight</p>
              <p className="truncate text-lg font-extrabold text-app-text">{wt != null ? kgToDisplay(wt, units.weight) : '—'}</p>
              <p className="text-[10px] font-semibold text-app-faint">{weightLabel(units.weight)} · {wtDate ?? 'not logged'}</p>
            </Link>
          </div>
        </section>

        <section>
          <SectionTitle>This week</SectionTitle>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([
              { label: 'Sessions', value: String(weekSessions), to: '/history', colour: 'text-info-text', icon: 'workout', tone: 'blue', edge: 'border-l-info-text' },
              { label: 'Volume', value: data && data.weekStats.volumeKg > 0 ? fmtVolume(data.weekStats.volumeKg, units.weight) : '—', to: '/progress', colour: 'text-app-text', icon: 'progress', tone: 'steel', edge: 'border-l-slate-400' },
              { label: 'Calories', value: cals > 0 ? cals.toLocaleString() : '—', to: '/nutrition', colour: 'text-app-text', icon: 'meal', tone: 'flame', edge: 'border-l-orange-400' },
              { label: 'Streak', value: `${streak} day${streak === 1 ? '' : 's'}`, to: '/history', colour: 'text-app-text', icon: 'streak', tone: 'flame', edge: 'border-l-orange-400' },
            ] as const).map((item) => (
              <Link key={item.label} to={item.to} className={`dashboard-panel flex min-h-[62px] items-center gap-2 border-l-2 px-2.5 py-2 ${item.edge}`}>
                <PremiumIconTile name={item.icon} tone={item.tone} size="xs" usage="card" active iconSize={17} />
                <p className="min-w-0 flex-1 text-[10px] font-extrabold uppercase text-app-muted">{item.label}</p>
                <p className={`truncate text-lg font-extrabold ${item.colour}`}>{item.value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section
          className="dashboard-panel min-h-[74px] overflow-hidden border-info-text/25 px-4 py-3"
          style={{ background: 'linear-gradient(110deg, var(--color-info-bg), var(--dash-panel-strong) 58%, var(--color-accent-light))' }}
        >
          <Link to="/history" className="flex min-w-0 items-center gap-3">
            <PremiumIconTile name="achievement" tone="gold" size="xs" usage="card" active iconSize={20} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase text-app-muted">Achievements</p>
              <div className="flex items-end justify-between gap-3">
                <p className="text-base font-extrabold text-app-text">{unlockedCount} <span className="text-xs text-app-muted">/ {totalAch} unlocked</span></p>
                <span className="text-[10px] font-bold text-info-text">View all →</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-app-border">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${achPct}%`, background: 'linear-gradient(90deg, var(--color-info-text), var(--color-accent))' }}
                />
              </div>
            </div>
          </Link>
        </section>
      </div>

      <div className="hidden md:block">
      <header className="dashboard-topbar mb-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link to="/profile" className="profile-orb flex-none" aria-label="Profile">
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" className="h-full w-full rounded-full object-cover" />
              : <span>{initials}</span>}
          </Link>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-accent-label">Let's Go,</p>
            <h1 className="truncate text-2xl md:text-3xl font-extrabold text-app-text leading-tight">{displayName}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-app-muted">
              <span aria-hidden="true">▦</span>
              {fullDate}
            </p>
          </div>
        </div>

        <div className="date-strip-card">
          {dateStrip.map(({ date, iso, dow }) => {
            const isToday = iso === todayIso
            const hasWorkout = data?.sessionDateSet.has(iso) ?? false
            return (
              <div key={iso} className={`date-tile ${isToday ? 'is-today' : ''}`}>
                <p className="text-xs font-extrabold">{dow}</p>
                <p className="text-2xl font-extrabold leading-none">{date.getDate()}</p>
                <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${hasWorkout ? 'bg-accent' : 'bg-transparent'}`} />
              </div>
            )
          })}
        </div>

        <div className="dashboard-top-actions flex items-center gap-3">
          <button className="today-button">Today</button>
          <button className="arrow-button" aria-label="Previous day">‹</button>
          <button className="arrow-button" aria-label="Next day">›</button>
          <Link to="/settings" className="settings-button" aria-label="Settings">
            <PremiumIconTile name="settings" tone="steel" size="xs" usage="button" active iconSize={24} />
          </Link>
        </div>
      </header>

      <div className="home-dashboard-grid">
        <div className="min-w-0 space-y-4">

          <section className="dashboard-panel nutrition-band">
            <div className="flex items-center gap-4 min-w-[230px]">
              <PremiumIconTile name="nutrition" tone="flame" size="xl" usage="card" active iconSize={44} />
              <div className="min-w-0">
                <SectionTitle>TODAY'S NUTRITION</SectionTitle>
                <p className="mt-3 text-base font-extrabold text-app-text">Daily Nutrition</p>
                <Link to="/nutrition" className="text-sm font-bold text-accent-label">{todayFoodTotals ? 'From food diary' : 'Tap to log food'}</Link>
              </div>
            </div>
            <div className="nutrition-metrics">
              <MetricRing label="Calories" value={String(cals)} target={`/ ${macroTargets.calories.toLocaleString()} cal`} pct={calPct} color="var(--color-app-muted)" />
              <MetricRing label="Protein" value={`${protein}g`} target={`/ ${macroTargets.proteinG}g`} pct={proPct} color="#8B5CF6" />
              <MetricRing label="Carbs" value={`${carbs}g`} target={`/ ${macroTargets.carbsG}g`} pct={crbPct} color="#22C55E" />
              <MetricRing label="Fat" value={`${fat}g`} target={`/ ${macroTargets.fatG}g`} pct={fatPct} color="#F97316" />
            </div>
            <Link to="/nutrition" className="text-3xl text-app-muted active:text-accent-label" aria-label="Open nutrition">›</Link>
          </section>

          <section className="space-y-3">
            <SectionTitle>This Week</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon="workout" tone="blue" label="Sessions" value={String(data?.weekStats.sessions ?? 0)} detail={'workouts\nthis week'} to="/history" />
              <StatCard
                icon="body"
                tone="gold"
                label="Body Weight"
                value={wt != null ? `${kgToDisplay(wt, units.weight)} ${weightLabel(units.weight)}` : '—'}
                detail={wtDate ?? 'Not logged'}
                to="/body"
              />
              <StatCard
                icon="progress"
                tone="gold"
                label="Volume"
                value={data && data.weekStats.volumeKg > 0 ? fmtVolume(data.weekStats.volumeKg, units.weight) : '—'}
                detail="lifted"
                to="/progress"
              />
              <StatCard
                icon="meal"
                tone="flame"
                label="Calorie Intake"
                value={cals > 0 ? `${cals.toLocaleString()} cal` : '— cal'}
                detail={`/ ${macroTargets.calories.toLocaleString()} goal`}
                to="/nutrition"
              />
            </div>
          </section>

          <section className="dashboard-panel p-4">
            <div className="flex items-start gap-4">
              <PremiumIconTile name="water" tone="blue" size="sm" usage="card" active iconSize={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <SectionTitle>Track Water</SectionTitle>
                    <p className="text-sm font-bold text-app-muted">
                      <span className="text-info-text">{mlToDisplay(waterMl, units.water)}</span> / {mlToDisplay(WATER_GOAL_ML, units.water)} {waterLabel(units.water)}
                    </p>
                  </div>
                  <p className="text-xl font-extrabold text-info-text">{waterPct}%</p>
                </div>
                <WaterGraph pct={waterPct} />
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {(units.water === 'fl_oz' ? [237, 473, 710] : [250, 500, 750]).map((ml) => (
                    <button key={ml} onClick={() => addWater(ml)} className="water-button">
                      +{mlToDisplay(ml, units.water)} {waterLabel(units.water)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="dashboard-panel p-5 flex gap-4">
              <PremiumIconTile name="cardio" tone="flame" size="xl" usage="card" active iconSize={46} />
              <div className="min-w-0">
                <SectionTitle>Apple Watch</SectionTitle>
                <p className="mt-2 text-base font-extrabold text-app-text">{todayHealth ? "Today's Stats" : 'Health Data'}</p>
                <p className="mt-2 text-sm text-app-muted">
                  {todayHealth
                    ? `${todayHealth.restingHr ?? '—'} bpm resting · ${todayHealth.steps ?? '—'} steps`
                    : 'No data yet - set up your Apple Shortcut to sync Watch stats automatically.'}
                </p>
                {latestHealthWorkout && <p className="mt-2 text-xs font-bold text-accent-label">{latestHealthWorkout.workoutType || 'Latest workout'}</p>}
                <OutlineButton to="/settings">Set up in Settings →</OutlineButton>
              </div>
            </div>

            <div className="dashboard-panel p-5">
              <div className="flex items-center gap-4">
                <PremiumIconTile name="body" tone="gold" size="lg" usage="card" active iconSize={38} />
                <div className="min-w-0">
                  <SectionTitle>Body Stats</SectionTitle>
                  <p className="mt-1 text-sm text-app-muted">Log today's weight</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder={`Enter weight (${weightLabel(units.weight)})`}
                  step={0.1}
                  min={0}
                  className="dashboard-input flex-1"
                />
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-accent-label">
                    {wt != null ? kgToDisplay(wt, units.weight) : '—'} <span className="text-sm">{weightLabel(units.weight)}</span>
                  </p>
                  <p className="text-xs text-app-muted">{wtDate ?? 'Not logged'}</p>
                </div>
              </div>
              <button onClick={saveWeight} disabled={savingWt || !weightInput} className="save-button mt-4">
                {savingWt ? 'Saving...' : 'Save'}
              </button>
            </div>

            <div className="dashboard-panel p-5 flex gap-4">
              <PremiumIconTile name="progress" tone="blue" size="xl" usage="card" active iconSize={48} />
              <div className="min-w-0">
                <SectionTitle>Progress Insights</SectionTitle>
                <p className="mt-2 font-extrabold text-app-text">{insightMsg.head}</p>
                <p className="mt-2 text-sm text-app-muted">{insightMsg.body}</p>
                <OutlineButton to="/progress">View Progress →</OutlineButton>
              </div>
            </div>
          </section>

          <section className="workout-hero dashboard-panel overflow-hidden p-6 md:p-8">
            <div className="relative z-10 pr-[52%]">
              <SectionTitle>Today's Workout</SectionTitle>
              <p className="mt-2 text-4xl md:text-5xl xl:text-6xl font-extrabold uppercase italic leading-none text-app-text">{heroTitle}</p>
              <p className="text-5xl md:text-6xl xl:text-7xl font-extrabold uppercase italic leading-none text-accent-label">Workout</p>
              <p className="mt-4 max-w-sm text-sm font-medium text-app-muted">⚡ Consistency builds champions. You've got this!</p>
              {startError && <p className="mt-3 text-sm font-bold text-error-text">{startError}</p>}
              {hasActiveSession ? (
                <Link to="/log" className="hero-action mt-5">▶ {heroButton}</Link>
              ) : data?.nextDay && data?.activeProgram ? (
                <button
                  onClick={() => startNextDay(data.nextDay!, data.activeProgram!.id)}
                  disabled={starting}
                  className="hero-action mt-5 disabled:opacity-60"
                >
                  ▶ {starting ? 'Starting...' : heroButton}
                </button>
              ) : (
                <Link to="/log" className="hero-action mt-5">▶ {heroButton}</Link>
              )}
            </div>
            <HeroAthlete />
          </section>
        </div>

        <div className="dashboard-right-rail space-y-4">
          <RailCard>
            <SectionTitle>Streak</SectionTitle>
            <div className="mt-5 flex items-center gap-5">
              <FlameIconTile />
              <div>
                <p className="text-5xl font-extrabold text-accent-label leading-none">{streak}</p>
                <p className="font-bold text-app-muted">Days</p>
                <p className="mt-2 text-xs text-app-muted">{streak > 0 ? 'Keep the fire alive!' : 'Start your streak today!'}</p>
              </div>
            </div>
            <div className="streak-dots mt-6">
              {last7.map((active: boolean, i: number) => (
                <span key={i} className={active ? 'is-hot' : ''} />
              ))}
            </div>
          </RailCard>

          <RailCard>
            <SectionTitle>Next Workout</SectionTitle>
            <div className="mt-5 flex gap-4">
              <PremiumIconTile name="date" tone="gold" size="lg" usage="card" active iconSize={40} />
              <div className="min-w-0">
                <p className="text-lg font-extrabold text-app-text">{data?.nextDay?.name ?? 'Push Day'}</p>
                <p className="text-sm text-app-muted">{data?.nextDayExCount ? `${data.nextDayExCount} exercises` : 'Upper Body'}</p>
                <p className="text-sm text-app-muted">Tomorrow · 7:00 AM</p>
              </div>
            </div>
            <OutlineButton to="/programs">View Program →</OutlineButton>
          </RailCard>

          <RailCard>
            <SectionTitle>Achievements</SectionTitle>
            <div className="mt-5 flex items-center gap-4">
              <TrophyIconTile />
              <div>
                <p className="text-3xl font-extrabold text-accent-label">{unlockedCount} <span className="text-base text-app-muted">/ {totalAch}</span></p>
                <p className="text-sm text-app-muted">Achievements Unlocked</p>
              </div>
            </div>
            <div className="mt-6 h-2 rounded-full bg-app-border overflow-hidden">
              <div
                className="h-full rounded-full bg-accent shadow-[0_0_18px_-4px_rgba(255,112,0,0.95)] transition-all duration-500"
                style={{ width: `${achPct}%` }}
              />
            </div>
            <OutlineButton to="/history">View All →</OutlineButton>
          </RailCard>
        </div>
      </div>
      </div>
    </div>
  )
}
