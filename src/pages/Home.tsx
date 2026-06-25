/**
 * Home (Dash) — main dashboard.
 */

import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { WorkoutDay } from '../db/db'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { loadProfile, calcBMR, calcTDEE, calcMacros, DIET_PROGRAMS } from '../lib/tdee'
import { useUnits, } from '../contexts/UnitsContext'
import { kgToDisplay, weightLabel, fmtVolume, mlToDisplay, waterLabel, displayToKg } from '../lib/units'
import { PremiumIconTile } from '../components/BrandIcon'

// ── Constants ─────────────────────────────────────────────────────────────────

const WATER_GOAL_ML = 2500
const DEFAULT_GOALS = { calories: 2400, proteinG: 150, carbsG: 250, fatG: 70 }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekBounds() {
  const d   = new Date()
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10)
  return { from: fmt(mon), to: fmt(sun) }
}

// formatVolume is handled by fmtVolume from units lib (unit-aware)

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
      iso:  d.toISOString().slice(0, 10),
      dow:  d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase(),
    }
  })
}

// Simple SVG donut — r=20, viewBox 48×48
function Donut({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r   = 20
  const c   = 2 * Math.PI * r
  const arc = Math.min(pct / 100, 1) * c
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--color-app-border)" strokeWidth="5" />
      <circle
        cx="24" cy="24" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${arc} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
      />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { session } = useAuth()
  const navigate    = useNavigate()
  const { units }   = useUnits()
  const [starting,    setStarting]    = useState(false)
  const [startError,  setStartError]  = useState<string | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [savingWt,    setSavingWt]    = useState(false)
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null)

  const email       = session?.user?.email ?? ''
  const rawName     = email.split('@')[0].split(/[._\-]/)[0]
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initials    = displayName.slice(0, 2).toUpperCase()

  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('avatar_url').eq('id', session.user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url) })
  }, [session])

  const todayIso  = today()
  const dateStrip = buildDateStrip()

  const todayLabel = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })

  // ── DB queries ────────────────────────────────────────────────────────────

  const data = useLiveQuery(async () => {
    const [activeProgram, activeSession, allSessions] = await Promise.all([
      db.programs.filter((p) => p.isActive && !p.deleted).first(),
      db.workoutSessions.filter((s) => !s.deleted && s.finishedAt === null).first(),
      db.workoutSessions.filter((s) => !s.deleted && s.finishedAt !== null).toArray(),
    ])

    const sorted         = allSessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    const sessionDateSet = new Set(allSessions.map((s) => s.date))

    // Next recommended day
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

    // Weekly stats
    const { from, to } = getWeekBounds()
    const weekSessions  = allSessions.filter((s) => s.date >= from && s.date <= to)
    let weekVolume = 0
    if (weekSessions.length > 0) {
      const weekIds = new Set(weekSessions.map((s) => s.id))
      const weekSEs = await db.sessionExercises
        .filter((se) => !se.deleted && weekIds.has(se.workoutSessionId))
        .toArray()
      if (weekSEs.length > 0) {
        const seIds   = new Set(weekSEs.map((se) => se.id))
        const wkSets  = await db.sets
          .filter((s) => !s.deleted && !s.isWarmup && s.weight > 0 && s.reps > 0 && seIds.has(s.sessionExerciseId))
          .toArray()
        weekVolume = wkSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      }
    }

    return {
      activeProgram, activeSession,
      nextDay, nextDayExCount,
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

  // Today's food diary totals (from per-food logs)
  const todayFoodTotals = useLiveQuery(async () => {
    const logs = await db.foodLogs
      .where('date').equals(todayIso)
      .filter((l) => !l.deleted)
      .toArray()
    if (logs.length === 0) return null
    const foodIds = [...new Set(logs.map((l) => l.foodId))]
    const foods   = await db.foods.where('id').anyOf(foodIds).toArray()
    const foodMap = new Map(foods.map((f) => [f.id, f]))
    return logs.reduce(
      (acc, log) => {
        const food = foodMap.get(log.foodId)
        if (!food) return acc
        const f = log.amountG / 100
        return {
          calories: acc.calories + food.caloriesPer100g * f,
          proteinG: acc.proteinG + food.proteinPer100g  * f,
          carbsG:   acc.carbsG   + food.carbsPer100g    * f,
          fatG:     acc.fatG     + food.fatPer100g      * f,
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

  // TDEE-derived macro targets (falls back to defaults if no profile set)
  const macroTargets = useMemo(() => {
    const profile  = loadProfile()
    const weightKg = latestWeight?.weight
    if (!profile || !weightKg) return DEFAULT_GOALS
    const bmr  = calcBMR(weightKg, profile.heightCm, profile.age, profile.sex)
    const tdee = calcTDEE(bmr, profile.activityLevel)
    const diet = DIET_PROGRAMS.find((d) => d.id === profile.dietId) ?? DIET_PROGRAMS[0]
    return calcMacros(weightKg, tdee, diet)
  }, [latestWeight])

  // Water helpers — prefer food diary water if logged there; fall back to nutritionLogs
  const waterMl  = todayNutrition?.waterMl ?? 0
  const waterPct = Math.min(100, Math.round((waterMl / WATER_GOAL_ML) * 100))

  async function addWater(ml: number) {
    const newTotal = Math.min(waterMl + ml, WATER_GOAL_ML * 2)
    const ts = now()
    if (todayNutrition) {
      await db.nutritionLogs.update(todayNutrition.id, { waterMl: newTotal, updatedAt: ts, syncedAt: null })
    } else {
      await db.nutritionLogs.add({
        id: crypto.randomUUID(), date: todayIso,
        calories: null, proteinG: null, carbsG: null, fatG: null, waterMl: newTotal,
        notes: '', createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
      })
    }
  }

  async function saveWeight() {
    const val = parseFloat(weightInput)
    if (isNaN(val) || val <= 0) return
    setSavingWt(true)
    try {
      const ts  = now()
      const kg  = displayToKg(val, units.weight)
      const existing = await db.bodyWeightLogs.filter((l) => l.date === todayIso && !l.deleted).first()
      if (existing) {
        await db.bodyWeightLogs.update(existing.id, { weight: kg, updatedAt: ts, syncedAt: null })
      } else {
        await db.bodyWeightLogs.add({
          id: crypto.randomUUID(), date: todayIso, weight: kg,
          notes: '', createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
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
        id: sessionId, workoutDayId: day.id, programId,
        date: todayIso, startedAt: ts, finishedAt: null,
        notes: '', createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
      })
      const des = await db.dayExercises
        .where('workoutDayId').equals(day.id)
        .filter((de) => !de.deleted)
        .toArray()
      des.sort((a, b) => a.order - b.order)
      if (des.length > 0) {
        await db.sessionExercises.bulkAdd(
          des.map((de, idx) => ({
            id: crypto.randomUUID(), workoutSessionId: sessionId,
            exerciseId: de.exerciseId, order: idx, notes: '',
            createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
          }))
        )
      }
      navigate('/log')
    } catch (err) {
      setStarting(false)
      setStartError(err instanceof Error ? err.message : 'Failed to start. Try again.')
    }
  }

  // Nutrition donut values — food diary takes priority over manual nutritionLog
  const cals    = todayFoodTotals ? Math.round(todayFoodTotals.calories) : (todayNutrition?.calories ?? 0)
  const protein = todayFoodTotals ? Math.round(todayFoodTotals.proteinG) : (todayNutrition?.proteinG ?? 0)
  const carbs   = todayFoodTotals ? Math.round(todayFoodTotals.carbsG)   : (todayNutrition?.carbsG   ?? 0)
  const fat     = todayFoodTotals ? Math.round(todayFoodTotals.fatG)     : (todayNutrition?.fatG     ?? 0)
  const calPct  = Math.min(100, Math.round((cals    / macroTargets.calories) * 100))
  const proPct  = Math.min(100, Math.round((protein / macroTargets.proteinG) * 100))
  const crbPct  = Math.min(100, Math.round((carbs   / macroTargets.carbsG)   * 100))
  const fatPct  = Math.min(100, Math.round((fat     / macroTargets.fatG)     * 100))

  const wt   = latestWeight?.weight ?? null
  const wtDate = latestWeight?.date
    ? new Date(latestWeight.date + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className="flex flex-col bg-app-bg">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="page-x pt-6 pb-3 flex items-center gap-3">
        <Link to="/profile" className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-sm font-extrabold text-app-text flex-shrink-0 overflow-hidden active:opacity-80">
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : <span>{initials}</span>
          }
        </Link>
        <div className="flex-1">
          <p className="text-xs text-app-muted font-medium leading-none mb-0.5">Let's Go,</p>
          <p className="text-2xl font-extrabold text-app-text leading-tight">{displayName}</p>
        </div>
        <Link
          to="/settings"
          className="flex-shrink-0 active:scale-95 transition-transform"
          aria-label="Settings"
        >
          <PremiumIconTile name="settings" tone="steel" size="md" usage="button" active iconSize={33} />
        </Link>
      </div>

      {/* ── Date strip ───────────────────────────────────────────────── */}
      <div className="page-x pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-extrabold text-app-text">{todayLabel}</p>
          <span className="text-xs font-bold text-app-text bg-accent px-3 py-1 rounded-full">Today</span>
        </div>
        <div className="flex gap-2">
          {dateStrip.map(({ date, iso, dow }) => {
            const isToday    = iso === todayIso
            const hasWorkout = data?.sessionDateSet.has(iso) ?? false
            return (
              <div
                key={iso}
                className={[
                  'flex-1 rounded-card py-2 text-center',
                  isToday
                    ? 'bg-app-text'
                    : 'bg-app-surface border border-app-border',
                ].join(' ')}
              >
                <p className={`text-[11px] font-bold uppercase mb-1 ${isToday ? 'text-white/60' : 'text-app-muted'}`}>
                  {dow}
                </p>
                <p className={`text-sm font-extrabold ${isToday ? 'text-white' : 'text-app-text'}`}>
                  {date.getDate()}
                </p>
                <div className={`w-1 h-1 rounded-full mx-auto mt-1 ${hasWorkout ? (isToday ? 'bg-white/40' : 'bg-accent-dark') : 'bg-transparent'}`} />
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 page-x">

        {/* ── Things to Do Today ────────────────────────────────────── */}
        <div>
          <p className="text-base font-extrabold text-app-text mb-2">Today's Nutrition</p>
          <div className="bg-app-surface rounded-card border border-app-border overflow-hidden">
            <Link to="/nutrition" className="flex items-center gap-3 px-4 py-3 border-b border-app-border active:bg-app-bg">
              <PremiumIconTile name="nutrition" tone="flame" size="sm" usage="card" active iconSize={30} />
              <div className="flex-1">
                <p className="text-sm font-bold text-app-text">Daily Nutrition</p>
                <p className="text-xs text-app-muted">{todayFoodTotals ? 'From food diary' : 'Tap to log food'}</p>
              </div>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-faint flex-shrink-0">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </Link>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 px-4 py-4">
              {/* Calories */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Donut pct={calPct} color="var(--color-accent)" />
                  <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-app-text leading-none">{cals}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-app-text">Calories</p>
                  <p className="text-xs text-app-muted">/ {macroTargets.calories}</p>
                </div>
              </div>
              {/* Protein */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Donut pct={proPct} color="#3B82F6" />
                  <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-app-text leading-none">{protein}g</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-app-text">Protein</p>
                  <p className="text-xs text-app-muted">/ {macroTargets.proteinG}g</p>
                </div>
              </div>
              {/* Carbs */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Donut pct={crbPct} color="#10B981" />
                  <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-app-text leading-none">{carbs}g</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-app-text">Carbs</p>
                  <p className="text-xs text-app-muted">/ {macroTargets.carbsG}g</p>
                </div>
              </div>
              {/* Fat */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Donut pct={fatPct} color="#F59E0B" />
                  <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-app-text leading-none">{fat}g</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-app-text">Fat</p>
                  <p className="text-xs text-app-muted">/ {macroTargets.fatG}g</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── My Progress ───────────────────────────────────────────── */}
        <div>
          <p className="text-base font-extrabold text-app-text mb-2">This Week</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Sessions this week */}
            <Link to="/history" className="bg-app-surface rounded-card border border-app-border px-4 py-3 block active:opacity-75">
              <PremiumIconTile name="history" tone="blue" size="sm" usage="card" active className="mb-2" iconSize={30} />
              <p className="text-xs text-app-muted mb-1">Sessions this week</p>
              <p className="text-2xl font-extrabold text-app-text">{data?.weekStats.sessions ?? 0}</p>
              <p className="text-xs text-app-muted mt-0.5">workouts</p>
            </Link>
            {/* Body Weight */}
            <Link to="/body" className="bg-app-surface rounded-card border border-app-border px-4 py-3 block active:opacity-75">
              <PremiumIconTile name="body" tone="steel" size="sm" usage="card" active className="mb-2" iconSize={30} />
              <p className="text-xs text-app-muted mb-1">Body Weight</p>
              <p className="text-2xl font-extrabold text-app-text">
                {wt != null ? `${kgToDisplay(wt, units.weight)}` : '—'}
                <span className="text-sm font-semibold"> {weightLabel(units.weight)}</span>
              </p>
              <p className="text-xs text-app-muted mt-0.5">{wtDate ?? 'Not logged'}</p>
            </Link>
            {/* Volume this week */}
            <Link to="/progress" className="bg-app-surface rounded-card border border-app-border px-4 py-3 block active:opacity-75">
              <PremiumIconTile name="progress" tone="gold" size="sm" usage="card" active className="mb-2" iconSize={30} />
              <p className="text-xs text-app-muted mb-1">Volume this week</p>
              <p className="text-2xl font-extrabold text-app-text">
                {data && data.weekStats.volumeKg > 0 ? fmtVolume(data.weekStats.volumeKg, units.weight) : '—'}
              </p>
              <p className="text-xs text-app-muted mt-0.5">lifted</p>
            </Link>
            {/* Calorie intake */}
            <Link to="/nutrition" className="bg-app-surface rounded-card border border-app-border px-4 py-3 block active:opacity-75">
              <PremiumIconTile name="meal" tone="flame" size="sm" usage="card" active className="mb-2" iconSize={30} />
              <p className="text-xs text-app-muted mb-1">Calorie Intake</p>
              <p className="text-2xl font-extrabold text-app-text">
                {cals > 0 ? cals.toLocaleString() : '—'}
                <span className="text-sm font-semibold"> cal</span>
              </p>
              <p className="text-xs text-app-muted mt-0.5">/{macroTargets.calories.toLocaleString()} goal</p>
            </Link>
          </div>
        </div>

        {/* ── Track Water ───────────────────────────────────────────── */}
        <div className="bg-app-surface rounded-card border border-app-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <PremiumIconTile name="water" tone="blue" size="sm" usage="card" active iconSize={30} />
            <div className="flex-1">
              <p className="text-sm font-bold text-app-text">Track Water</p>
              <p className="text-xs text-app-muted">{mlToDisplay(waterMl, units.water)} / {mlToDisplay(WATER_GOAL_ML, units.water)} {waterLabel(units.water)}</p>
            </div>
            <p className="text-sm font-extrabold text-info-text">{waterPct}%</p>
          </div>
          <div className="h-1.5 bg-app-border mx-4 mb-3 rounded-full overflow-hidden">
            <div className="h-full bg-info-text rounded-full" style={{ width: `${waterPct}%` }} />
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {(units.water === 'fl_oz' ? [237, 473, 710] : [250, 500, 750]).map((ml) => (
              <button key={ml} onClick={() => addWater(ml)}
                className="flex-1 bg-app-bg border border-app-border text-app-text text-sm font-bold py-2.5 rounded-input active:bg-accent-light">
                +{mlToDisplay(ml, units.water)} {waterLabel(units.water)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Apple Watch Health ───────────────────────────────────── */}
        <div className="rounded-card overflow-hidden border border-app-border" style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}>
          <div className="px-4 pt-4 pb-3 flex items-center gap-3">
            {/* Apple Watch icon */}
            <div className="w-9 h-9 rounded-input bg-white/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M17 2H7L5.5 6h13L17 2zM7 22h10l1.5-4H5.5L7 22zM3 7a2 2 0 00-2 2v6a2 2 0 002 2h18a2 2 0 002-2V9a2 2 0 00-2-2H3zm9 9a4 4 0 110-8 4 4 0 010 8zm.75-6.5v2.25l1.5 1.5-1.06 1.06-1.69-1.69V9.5h1.25z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white/60 uppercase tracking-wide">Apple Watch</p>
              <p className="text-sm font-extrabold text-white">
                {todayHealth ? "Today's Stats" : 'Health Data'}
              </p>
            </div>
            {todayHealth && (
              <p className="text-[10px] text-white/40">Today</p>
            )}
          </div>

          {todayHealth ? (
            <div className="grid grid-cols-3 gap-px bg-white/10 border-t border-white/10">
              {/* Resting HR */}
              <div className="bg-[#1C1917] px-3 py-3 text-center">
                <p className="text-xl font-extrabold text-white leading-none">
                  {todayHealth.restingHr ?? '—'}
                </p>
                <p className="text-[10px] text-white/50 mt-0.5">BPM</p>
                <p className="text-[10px] text-white/40">Resting HR</p>
              </div>
              {/* Active Cals */}
              <div className="bg-[#1C1917] px-3 py-3 text-center">
                <p className="text-xl font-extrabold text-accent leading-none">
                  {todayHealth.activeCalories ?? '—'}
                </p>
                <p className="text-[10px] text-white/50 mt-0.5">kcal</p>
                <p className="text-[10px] text-white/40">Active Cal</p>
              </div>
              {/* Steps */}
              <div className="bg-[#1C1917] px-3 py-3 text-center">
                <p className="text-xl font-extrabold text-white leading-none">
                  {todayHealth.steps != null ? (todayHealth.steps >= 1000 ? `${(todayHealth.steps / 1000).toFixed(1)}k` : todayHealth.steps) : '—'}
                </p>
                <p className="text-[10px] text-white/50 mt-0.5">steps</p>
                <p className="text-[10px] text-white/40">Steps</p>
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 border-t border-white/10 pt-3">
              <p className="text-xs text-white/50 mb-2">No data yet — set up your Apple Shortcut to sync Watch stats automatically.</p>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-full active:bg-white/20"
              >
                Set up in Settings →
              </Link>
            </div>
          )}

          {/* Latest workout */}
          {latestHealthWorkout && (
            <div className="px-4 py-3 border-t border-white/10 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{latestHealthWorkout.workoutType || 'Workout'}</p>
                <div className="flex gap-3 mt-0.5">
                  {latestHealthWorkout.durationSecs != null && (
                    <p className="text-[10px] text-white/50">
                      {Math.round(latestHealthWorkout.durationSecs / 60)} min
                    </p>
                  )}
                  {latestHealthWorkout.avgHr != null && (
                    <p className="text-[10px] text-white/50">{latestHealthWorkout.avgHr} bpm avg</p>
                  )}
                  {latestHealthWorkout.activeCalories != null && (
                    <p className="text-[10px] text-white/50">{latestHealthWorkout.activeCalories} kcal</p>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-white/30 flex-shrink-0">
                {new Date(latestHealthWorkout.workoutDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
              </p>
            </div>
          )}
        </div>

        {/* ── Body Stats ────────────────────────────────────────────── */}
        <div className="bg-app-surface rounded-card border border-app-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <PremiumIconTile name="body" tone="steel" size="sm" usage="card" active iconSize={30} />
            <div className="flex-1">
              <p className="text-sm font-bold text-app-text">Body Stats</p>
              <p className="text-xs text-app-muted">Log today's weight</p>
            </div>
            {wt != null && (
              <div className="text-right">
                <p className="text-xl font-extrabold text-app-text">{wt != null ? kgToDisplay(wt, units.weight) : '—'}<span className="text-sm font-semibold"> {weightLabel(units.weight)}</span></p>
                <p className="text-xs text-app-muted">{wtDate}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="number" inputMode="decimal"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder={`Enter weight (${weightLabel(units.weight)})`}
              step={0.1} min={0}
              className="flex-1 bg-app-bg border border-app-border rounded-input px-3 py-2.5 text-sm text-app-text placeholder-app-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-label"
            />
            <button
              onClick={saveWeight}
              disabled={savingWt || !weightInput}
              className="bg-accent text-app-text text-sm font-bold px-5 py-2.5 rounded-input active:bg-accent-dark disabled:opacity-50"
            >
              {savingWt ? '…' : 'Save'}
            </button>
          </div>
        </div>

        {/* ── Today's Workout ───────────────────────────────────────── */}
        <div>
          <p className="text-base font-extrabold text-app-text mb-2">Today's Workout</p>

          {data?.activeSession ? (
            <Link to="/log" className="block rounded-card overflow-hidden" style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}>
              <div className="px-5 py-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-1">In Progress</p>
                    <p className="text-2xl font-extrabold text-white leading-tight">Resume Workout</p>
                  </div>
                  <PremiumIconTile name="workout" tone="gold" size="lg" usage="card" active iconSize={36} />
                </div>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2.5 rounded-input">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Continue
                </div>
              </div>
            </Link>
          ) : data?.nextDay && data?.activeProgram ? (
            <button
              onClick={() => { setStartError(null); startNextDay(data.nextDay!, data.activeProgram!.id) }}
              disabled={starting}
              className="w-full rounded-card overflow-hidden text-left disabled:opacity-70 active:opacity-90"
              style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}
            >
              <div className="px-5 py-5 relative overflow-hidden">
                {/* Decorative circle */}
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-2">
                      Workout · {data.activeProgram.name}
                    </p>
                    <p className="text-2xl font-extrabold text-white leading-tight">
                      {starting ? 'Starting…' : data.nextDay.name}
                    </p>
                  </div>
                  <PremiumIconTile name="workout" tone="gold" size="lg" usage="card" active iconSize={36} />
                </div>
                {startError && (
                  <p className="text-xs text-red-400 mb-2">{startError}</p>
                )}
                <div className="flex items-center gap-4 mb-4">
                  {data.nextDayExCount > 0 && (
                    <span className="flex items-center gap-1 text-white/60 text-xs">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-accent">
                        <path d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 101.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" />
                      </svg>
                      {data.nextDayExCount} exercise{data.nextDayExCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2.5 rounded-input">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Start Now
                </div>
              </div>
            </button>
          ) : (
            <Link to="/log" className="block rounded-card overflow-hidden" style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}>
              <div className="px-5 py-5 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-2">Free Workout</p>
                    <p className="text-2xl font-extrabold text-white leading-tight">Start Workout</p>
                  </div>
                  <PremiumIconTile name="workout" tone="gold" size="lg" usage="card" active iconSize={36} />
                </div>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2.5 rounded-input">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Start Now
                </div>
              </div>
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
