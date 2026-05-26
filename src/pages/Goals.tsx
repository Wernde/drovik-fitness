/**
 * Goals — daily targets, water tracking, body weight, and habits.
 */

import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, now, today } from '../db/db'
import HabitsTab from '../components/HabitsTab'

const WATER_GOAL_ML = 2000
const CAL_GOAL      = 2400
const WEIGHT_GOAL   = 78

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-1.5 bg-app-border rounded-full overflow-hidden mt-1.5">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Body weight section ───────────────────────────────────────────────────────

function BodyWeightSection() {
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const logs = useLiveQuery(
    () => db.bodyWeightLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => list.sort((a, b) => b.date.localeCompare(a.date))),
    [],
  )

  const todayStr  = today()
  const todayLog  = logs?.find((l) => l.date === todayStr)
  const latestKg  = logs?.[0]?.weight ?? null
  const startKg   = logs?.[logs.length - 1]?.weight ?? null
  const change    = latestKg != null && startKg != null ? +(latestKg - startKg).toFixed(1) : null

  async function handleLog() {
    const val = parseFloat(weight)
    if (isNaN(val) || val <= 0) return
    setSaving(true)
    try {
      const timestamp = now()
      if (todayLog) {
        await db.bodyWeightLogs.update(todayLog.id, { weight: val, updatedAt: timestamp, syncedAt: null })
      } else {
        await db.bodyWeightLogs.add({
          id: crypto.randomUUID(), date: todayStr, weight: val, notes: '',
          createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
        })
      }
      setWeight('')
    } finally {
      setSaving(false)
    }
  }

  const goalPct = latestKg != null
    ? Math.min(100, Math.max(0, Math.round(((88 - latestKg) / (88 - WEIGHT_GOAL)) * 100)))
    : 0

  return (
    <div className="flex flex-col gap-3">
      {/* Goal progress */}
      <div className="bg-app-card rounded-2xl border border-app-border p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-app-muted mb-3">Body Goal</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-accent-dark">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm0 2a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 1.5a3 3 0 110 6 3 3 0 010-6z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-app-text">Goal weight of {WEIGHT_GOAL} kg</p>
            <ProgressBar value={goalPct} max={100} color="bg-accent" />
            <p className="text-xs text-app-muted mt-1">
              {latestKg != null ? `${latestKg} kg current` : 'No weight logged yet'}
              {latestKg != null && latestKg > WEIGHT_GOAL ? ` · ${(latestKg - WEIGHT_GOAL).toFixed(1)} kg to go` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      {latestKg != null && (
        <div className="flex gap-3">
          <div className="flex-1 bg-app-card rounded-2xl border border-app-border px-3 py-3 text-center">
            <p className="text-xs text-app-muted">Current</p>
            <p className="text-lg font-extrabold text-accent-dark">{latestKg} kg</p>
          </div>
          <div className="flex-1 bg-app-card rounded-2xl border border-app-border px-3 py-3 text-center">
            <p className="text-xs text-app-muted">Change</p>
            <p className={`text-lg font-extrabold ${change != null && change < 0 ? 'text-green-600' : 'text-app-text'}`}>
              {change != null ? `${change > 0 ? '+' : ''}${change} kg` : '—'}
            </p>
          </div>
          <div className="flex-1 bg-app-card rounded-2xl border border-app-border px-3 py-3 text-center">
            <p className="text-xs text-app-muted">Goal</p>
            <p className="text-lg font-extrabold text-app-text">{WEIGHT_GOAL} kg</p>
          </div>
        </div>
      )}

      {/* Quick log */}
      <div className="bg-app-card rounded-2xl border border-app-border flex items-center gap-3 px-4 py-3">
        <p className="text-sm font-medium text-app-muted flex-1">Log today's weight</p>
        <input
          type="number" inputMode="decimal" value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={todayLog ? String(todayLog.weight) : '83'}
          step={0.1} min={0}
          className="w-20 bg-app-bg border border-app-border rounded-xl px-2 py-2 text-base font-bold text-center text-app-text focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={handleLog} disabled={saving || !weight}
          className="bg-accent text-app-text text-sm font-bold px-4 py-2 rounded-xl active:bg-accent-dark disabled:opacity-50"
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Water section ─────────────────────────────────────────────────────────────

function WaterSection() {
  const todayStr = today()

  const log = useLiveQuery(
    () => db.nutritionLogs.filter((l) => l.date === todayStr && !l.deleted).first(),
    [todayStr],
  )

  const currentMl = log?.waterMl ?? 0
  const pct       = Math.min(100, Math.round((currentMl / WATER_GOAL_ML) * 100))

  async function addWater(ml: number) {
    const newTotal = Math.min(currentMl + ml, WATER_GOAL_ML * 2)
    const timestamp = now()
    if (log) {
      await db.nutritionLogs.update(log.id, { waterMl: newTotal, updatedAt: timestamp, syncedAt: null })
    } else {
      await db.nutritionLogs.add({
        id: crypto.randomUUID(), date: todayStr,
        calories: null, proteinG: null, carbsG: null, fatG: null, waterMl: newTotal,
        notes: '', createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
      })
    }
  }

  return (
    <div className="bg-app-card rounded-2xl border border-app-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
            <path fillRule="evenodd" d="M11.484 2.17a.75.75 0 011.032 0 11.209 11.209 0 017.877 10.58 7.423 7.423 0 01-7.603 7.5c-4.114 0-7.47-3.036-7.47-7.125 0-3.6 2.488-6.7 5.91-7.765a.75.75 0 01.977.702v5.263a.75.75 0 001.5 0V4.14a.75.75 0 01.777-.746z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-app-text">Track Water</p>
          <p className="text-xs text-app-muted">{currentMl} ml · {Math.max(0, WATER_GOAL_ML - currentMl)} ml remaining</p>
        </div>
        <p className="text-sm font-extrabold text-blue-500">{pct}%</p>
      </div>
      <div className="h-1.5 bg-app-border mx-4 mb-3 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2 px-4 pb-4">
        {[250, 500, 750].map((ml) => (
          <button key={ml}
            onClick={() => addWater(ml)}
            className="flex-1 bg-blue-50 text-blue-600 text-sm font-bold py-2 rounded-xl active:bg-blue-100">
            +{ml} ml
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Calorie goal section ───────────────────────────────────────────────────────

function CalorieGoalSection() {
  const todayStr = today()
  const log = useLiveQuery(
    () => db.nutritionLogs.filter((l) => l.date === todayStr && !l.deleted).first(),
    [todayStr],
  )
  const cals = log?.calories ?? 0
  const pct  = Math.min(100, Math.round((cals / CAL_GOAL) * 100))

  return (
    <div className="bg-app-card rounded-2xl border border-app-border p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-app-muted mb-3">Daily Targets</p>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
            <path d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.177A7.547 7.547 0 016.648 6.61a.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248zM15.75 14.25a3.75 3.75 0 11-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 011.925-3.545 3.75 3.75 0 013.255 3.717z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-app-text">Calorie Goal</p>
          <ProgressBar value={cals} max={CAL_GOAL} color="bg-blue-500" />
          <p className="text-xs text-app-muted mt-1">{cals} / {CAL_GOAL} kcal</p>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = 'goals' | 'habits'

export default function Goals() {
  const [tab, setTab] = useState<Tab>('goals')

  return (
    <div className="px-4 pt-5 pb-4">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs text-app-muted font-medium">Your</p>
      </div>
      <h1 className="text-2xl font-extrabold text-app-text mb-4">Goals + Habits</h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-app-border/30 rounded-2xl p-1 mb-5">
        {(['goals', 'habits'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              'flex-1 rounded-xl py-2 text-sm font-bold transition-colors',
              tab === t ? 'bg-accent text-app-text shadow-sm' : 'text-app-muted',
            ].join(' ')}
          >
            {t === 'goals' ? 'Goals' : 'Habits'}
          </button>
        ))}
      </div>

      {tab === 'goals' && (
        <div className="flex flex-col gap-4">
          <CalorieGoalSection />
          <WaterSection />
          <div>
            <p className="text-sm font-extrabold text-app-text mb-2">Body Weight</p>
            <BodyWeightSection />
          </div>
        </div>
      )}

      {tab === 'habits' && <HabitsTab />}
    </div>
  )
}
