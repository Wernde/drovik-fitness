/**
 * Home (Dash) — main dashboard.
 */

import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import type { WorkoutDay } from '../db/db'
import { useAuth } from '../contexts/AuthContext'
import { loadProfile, calcBMR, calcTDEE, calcMacros, DIET_PROGRAMS } from '../lib/tdee'
import { useUnits, } from '../contexts/UnitsContext'
import { kgToDisplay, weightLabel, fmtVolume, mlToDisplay, waterLabel } from '../lib/units'

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
  const [weightInput, setWeightInput] = useState('')
  const [savingWt,    setSavingWt]    = useState(false)

  const email       = session?.user?.email ?? ''
  const rawName     = email.split('@')[0].split(/[._\-]/)[0]
  const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1)
  const initials    = displayName.slice(0, 2).toUpperCase()

  const [avatarUrl,  setAvatarUrl]  = useState('')
  const [profileName, setProfileName] = useState('')
  useEffect(() => {
    if (!session) return
    supabase.from('profiles').select('avatar_url, first_name').eq('id', session.user.id).single()
      .then(({ data }) => {
        if (data?.avatar_url)  setAvatarUrl(data.avatar_url)
        if (data?.first_name)  setProfileName(data.first_name)
      })
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
      const ts = now()
      const existing = await db.bodyWeightLogs.filter((l) => l.date === todayIso && !l.deleted).first()
      if (existing) {
        await db.bodyWeightLogs.update(existing.id, { weight: val, updatedAt: ts, syncedAt: null })
      } else {
        await db.bodyWeightLogs.add({
          id: crypto.randomUUID(), date: todayIso, weight: val,
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
    } catch {
      setStarting(false)
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
    <div className="flex flex-col pb-24 bg-app-bg">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <Link to="/profile" className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-sm font-extrabold text-app-text flex-shrink-0 overflow-hidden active:opacity-80">
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            : <span>{initials}</span>
          }
        </Link>
        <div className="flex-1">
          <p className="text-xs text-app-muted font-medium leading-none mb-0.5">Let's Go,</p>
          <p className="text-2xl font-extrabold text-app-text leading-tight">{profileName || displayName}</p>
        </div>
        <Link to="/settings" className="w-11 h-11 rounded-full bg-app-card border border-app-border flex items-center justify-center text-app-muted active:bg-app-border flex-shrink-0" aria-label="Settings">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>

      {/* ── Date strip ───────────────────────────────────────────────── */}
      <div className="px-4 pb-4">
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
                  'flex-1 rounded-2xl py-2 text-center',
                  isToday
                    ? 'bg-app-text'
                    : 'bg-app-card border border-app-border',
                ].join(' ')}
              >
                <p className={`text-[9px] font-bold uppercase mb-1 ${isToday ? 'text-white/60' : 'text-app-muted'}`}>
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

      <div className="flex flex-col gap-4 px-4">

        {/* ── Things to Do Today ────────────────────────────────────── */}
        <div>
          <p className="text-base font-extrabold text-app-text mb-2">Progress</p>
          <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden">
            <Link to="/nutrition" className="flex items-center gap-3 px-4 py-3 border-b border-app-border active:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-app-text">Daily Nutrition</p>
                <p className="text-xs text-app-muted">{todayFoodTotals ? 'From food diary' : 'Tap to log food'}</p>
              </div>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-app-faint flex-shrink-0">
                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
              </svg>
            </Link>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
              {/* Calories */}
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <Donut pct={calPct} color="#FFCA10" />
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
          <p className="text-base font-extrabold text-app-text mb-2">My Progress</p>
          <div className="grid grid-cols-2 gap-3">
            {/* Sessions this week */}
            <Link to="/history" className="bg-app-card rounded-2xl border border-app-border px-4 py-3 block active:opacity-75">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-green-500">
                  <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.07v3.469c0 1.126-.694 2.191-1.83 2.54-1.952.599-4.024.921-6.17.921s-4.219-.322-6.17-.921C2.694 12.73 2 11.665 2 10.539V7.07c0-1.321.947-2.489 2.294-2.676A41.047 41.047 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z" clipRule="evenodd" />
                  <path d="M3 15.055v-.684c.527.071 1.059.132 1.595.183a41.454 41.454 0 007.81 0 41.453 41.453 0 001.595-.183v.684c0 1.322-.948 2.488-2.292 2.675a41.524 41.524 0 01-6.416 0C3.948 17.543 3 16.377 3 15.055z" />
                </svg>
              </div>
              <p className="text-xs text-app-muted mb-1">Sessions this week</p>
              <p className="text-2xl font-extrabold text-app-text">{data?.weekStats.sessions ?? 0}</p>
              <p className="text-xs text-app-muted mt-0.5">workouts</p>
            </Link>
            {/* Body Weight */}
            <Link to="/body" className="bg-app-card rounded-2xl border border-app-border px-4 py-3 block active:opacity-75">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500">
                  <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.505.893c-.336.095-.68.187-1.032.27a.75.75 0 11-.352-1.456c.237-.057.473-.118.706-.184L14.228 5.545A31.086 31.086 0 0010 5.261a31.08 31.08 0 00-4.228.284L4.102 11.73c.233.066.47.127.706.184a.75.75 0 11-.352 1.455 35.645 35.645 0 01-1.032-.27.75.75 0 01-.505-.893l1.702-7.545a31.28 31.28 0 00-1.103.232.75.75 0 01-.336-1.461 33.186 33.186 0 016.668-.83V2.75A.75.75 0 0110 2zM5.082 14.5a.75.75 0 01.75-.75h8.336a.75.75 0 010 1.5H5.832a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xs text-app-muted mb-1">Body Weight</p>
              <p className="text-2xl font-extrabold text-app-text">
                {wt != null ? `${kgToDisplay(wt, units.weight)}` : '—'}
                <span className="text-sm font-semibold"> {weightLabel(units.weight)}</span>
              </p>
              <p className="text-xs text-app-muted mt-0.5">{wtDate ?? 'Not logged'}</p>
            </Link>
            {/* Volume this week */}
            <Link to="/progress" className="bg-app-card rounded-2xl border border-app-border px-4 py-3 block active:opacity-75">
              <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
                  <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 003 0v-13A1.5 1.5 0 0015.5 2zM9.5 6A1.5 1.5 0 008 7.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 009.5 6zM3.5 10A1.5 1.5 0 002 11.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 10z" />
                </svg>
              </div>
              <p className="text-xs text-app-muted mb-1">Volume this week</p>
              <p className="text-2xl font-extrabold text-app-text">
                {data && data.weekStats.volumeKg > 0 ? fmtVolume(data.weekStats.volumeKg, units.weight) : '—'}
              </p>
              <p className="text-xs text-app-muted mt-0.5">lifted</p>
            </Link>
            {/* Calorie intake */}
            <Link to="/nutrition" className="bg-app-card rounded-2xl border border-app-border px-4 py-3 block active:opacity-75">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-orange-500">
                  <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
                </svg>
              </div>
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
        <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
                <path d="M12 2.25a.75.75 0 01.6.3l6.45 8.61A7.5 7.5 0 1112 21.75a7.5 7.5 0 01-6-12l.001-.001L11.4 2.55a.75.75 0 01.6-.3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-app-text">Track Water</p>
              <p className="text-xs text-app-muted">{mlToDisplay(waterMl, units.water)} {waterLabel(units.water)} / {mlToDisplay(WATER_GOAL_ML, units.water)} {waterLabel(units.water)} remaining</p>
            </div>
            <p className="text-sm font-extrabold text-blue-500">{waterPct}%</p>
          </div>
          <div className="h-1.5 bg-app-border mx-4 mb-3 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${waterPct}%` }} />
          </div>
          <div className="flex gap-2 px-4 pb-4">
            {(units.water === 'fl_oz' ? [237, 473, 710] : [250, 500, 750]).map((ml) => (
              <button key={ml} onClick={() => addWater(ml)}
                className="flex-1 bg-app-bg border border-app-border text-app-text text-sm font-bold py-2.5 rounded-xl active:bg-accent-light">
                +{mlToDisplay(ml, units.water)} {waterLabel(units.water)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Apple Watch Health ───────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden border border-app-border" style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}>
          <div className="px-4 pt-4 pb-3 flex items-center gap-3">
            {/* Apple Watch icon */}
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
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
        <div className="bg-app-card rounded-2xl border border-app-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-accent-dark">
                <path d="M12 2a5 5 0 110 10A5 5 0 0112 2zm0 12c5.523 0 10 2.239 10 5v1H2v-1c0-2.761 4.477-5 10-5z" />
              </svg>
            </div>
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
              className="flex-1 bg-app-bg border border-app-border rounded-xl px-3 py-2.5 text-sm text-app-text placeholder-app-faint focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={saveWeight}
              disabled={savingWt || !weightInput}
              className="bg-accent text-app-text text-sm font-bold px-5 py-2.5 rounded-xl active:bg-accent-dark disabled:opacity-50"
            >
              {savingWt ? '…' : 'Save'}
            </button>
          </div>
        </div>

        {/* ── Today's Workout ───────────────────────────────────────── */}
        <div>
          <p className="text-base font-extrabold text-app-text mb-2">Today's Workout</p>

          {data?.activeSession ? (
            <Link to="/log" className="block rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}>
              <div className="px-5 py-5">
                <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-1">In Progress</p>
                <p className="text-2xl font-extrabold text-white mb-4">Resume Workout</p>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2.5 rounded-xl">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Continue
                </div>
              </div>
            </Link>
          ) : data?.nextDay && data?.activeProgram ? (
            <button
              onClick={() => startNextDay(data.nextDay!, data.activeProgram!.id)}
              disabled={starting}
              className="w-full rounded-2xl overflow-hidden text-left disabled:opacity-70 active:opacity-90"
              style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}
            >
              <div className="px-5 py-5 relative overflow-hidden">
                {/* Decorative circle */}
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-2">
                  Workout · {data.activeProgram.name}
                </p>
                <p className="text-2xl font-extrabold text-white mb-3 leading-tight">
                  {starting ? 'Starting…' : data.nextDay.name}
                </p>
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
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2.5 rounded-xl">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" /></svg>
                  Start Now
                </div>
              </div>
            </button>
          ) : (
            <Link to="/log" className="block rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#1C1917,#2C2824)' }}>
              <div className="px-5 py-5 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                <p className="text-xs font-semibold text-accent/80 uppercase tracking-widest mb-2">Ad-hoc</p>
                <p className="text-2xl font-extrabold text-white mb-4">Start Workout</p>
                <div className="inline-flex items-center gap-1.5 bg-accent text-app-text text-sm font-bold px-4 py-2.5 rounded-xl">
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
