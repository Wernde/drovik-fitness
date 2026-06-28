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
import { PremiumIconTile } from '../components/BrandIcon'
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
  return <h2 className="text-sm font-extrabold uppercase tracking-wide text-app-text">{children}</h2>
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
    <Link to={to} className="dashboard-panel flex items-center gap-4 p-4 min-h-[108px] active:scale-[0.99] transition-transform">
      <PremiumIconTile name={icon} tone={tone} size="lg" usage="card" active iconSize={38} />
      <div className="min-w-0">
        <p className="text-xs font-extrabold uppercase text-app-muted">{label}</p>
        <p className="text-2xl font-extrabold text-accent-label leading-tight">{value}</p>
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

  return (
    <div className="dashboard-page min-h-full px-4 py-4 md:px-5 md:py-5 xl:px-6">
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
              <PremiumIconTile name="nutrition" tone="flame" size="lg" usage="card" active iconSize={42} />
              <div className="min-w-0">
                <SectionTitle>Today's Nutrition</SectionTitle>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
                <p className="mt-2 font-extrabold text-app-text">Keep going strong!</p>
                <p className="mt-2 text-sm text-app-muted">You're on track to crush your goals this week. Consistency is building champions.</p>
                <OutlineButton to="/progress">View Progress →</OutlineButton>
              </div>
            </div>
          </section>

          <section className="workout-hero dashboard-panel overflow-hidden p-6 md:p-8">
            <div className="relative z-10 max-w-[520px]">
              <SectionTitle>Today's Workout</SectionTitle>
              <p className="mt-2 text-3xl md:text-4xl xl:text-5xl font-extrabold uppercase italic leading-none text-app-text">{heroTitle}</p>
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
            <PremiumIconTile name="workout" tone="gold" size="xl" usage="card" active iconSize={48} className="workout-hero-icon" />
          </section>
        </div>

        <div className="dashboard-right-rail space-y-4">
          <RailCard>
            <SectionTitle>Streak</SectionTitle>
            <div className="mt-5 flex items-center gap-5">
              <PremiumIconTile name="meal" tone="flame" size="xl" usage="card" active iconSize={50} />
              <div>
                <p className="text-5xl font-extrabold text-accent-label leading-none">12</p>
                <p className="font-bold text-app-muted">Days</p>
                <p className="mt-2 text-xs text-app-muted">Keep the fire alive!</p>
              </div>
            </div>
            <div className="streak-dots mt-6">
              {Array.from({ length: 8 }, (_, i) => <span key={i} className={i < 5 ? 'is-hot' : ''} />)}
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
              <PremiumIconTile name="progress" tone="gold" size="lg" usage="card" active iconSize={40} />
              <div>
                <p className="text-3xl font-extrabold text-accent-label">12 <span className="text-base text-app-muted">/ 24</span></p>
                <p className="text-sm text-app-muted">Achievements Unlocked</p>
              </div>
            </div>
            <div className="mt-6 h-2 rounded-full bg-app-border overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-accent shadow-[0_0_18px_-4px_rgba(255,112,0,0.95)]" />
            </div>
            <OutlineButton to="/goals">View All →</OutlineButton>
          </RailCard>
        </div>
      </div>
    </div>
  )
}
