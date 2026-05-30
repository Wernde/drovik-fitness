/**
 * Progress — charts and personal records.
 *
 * Three tabs:
 *   Lifts       — pick any exercise, see estimated 1RM over time
 *   Body weight — log and chart body weight over time
 *   PRs         — personal records per exercise
 *
 * Estimated 1RM uses the Epley formula: weight × (1 + reps / 30)
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useUnits } from '../contexts/UnitsContext'
import { kgToDisplay, displayToKg, weightLabel, fmtWeight, cmToDisplay, displayToCm, measurementLabel } from '../lib/units'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { db, now, today } from '../db/db'
import type { Exercise, NutritionLog, BodyMeasurementLog } from '../db/db'
import HabitsTab from '../components/HabitsTab'

// ── Helpers ───────────────────────────────────────────────────────────────────

function epley(weight: number, reps: number) {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

function shortDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── Shared chart styles ───────────────────────────────────────────────────────

const chartTooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #E3E5E5',
  borderRadius: 12,
  fontSize: 12,
  color: '#241F20',
}

// ── Lift chart tab ────────────────────────────────────────────────────────────

type ChartMode = 'e1rm' | 'volume'

function LiftChartTab({ exercises }: { exercises: Exercise[] }) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [search,     setSearch]     = useState('')
  const [chartMode,  setChartMode]  = useState<ChartMode>('e1rm')

  const filteredEx = exercises
    .filter((e) => !search || e.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const chartData = useLiveQuery(async () => {
    if (!selectedId) return []

    const sessionExercises = await db.sessionExercises
      .where('exerciseId').equals(selectedId)
      .filter((se) => !se.deleted)
      .toArray()

    if (sessionExercises.length === 0) return []

    const seIds = sessionExercises.map((se) => se.id)

    const sets = await db.sets
      .where('sessionExerciseId').anyOf(seIds)
      .filter((s) => !s.deleted && !s.isWarmup && s.reps > 0 && s.weight > 0)
      .toArray()

    const sessionIds = [...new Set(sessionExercises.map((se) => se.workoutSessionId))]
    const sessions   = await db.workoutSessions
      .where('id').anyOf(sessionIds)
      .filter((s) => !s.deleted && s.finishedAt !== null)
      .toArray()

    const sessionDateMap = new Map(sessions.map((s) => [s.id, s.date]))
    const seSessionMap   = new Map(sessionExercises.map((se) => [se.id, se.workoutSessionId]))

    const byDate = new Map<string, { e1rm: number; volume: number }>()
    for (const s of sets) {
      const sessionId = seSessionMap.get(s.sessionExerciseId)
      const date      = sessionId ? sessionDateMap.get(sessionId) : undefined
      if (!date) continue
      const e1rm = epley(s.weight, s.reps)
      const vol  = s.weight * s.reps
      const cur  = byDate.get(date)
      byDate.set(date, {
        e1rm:   cur ? Math.max(cur.e1rm, e1rm) : e1rm,
        volume: cur ? cur.volume + vol : vol,
      })
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { e1rm, volume }]) => ({
        date: shortDate(date),
        e1rm,
        volume: Math.round(volume),
      }))
  }, [selectedId])

  const isE1rm   = chartMode === 'e1rm'
  const dataKey  = isE1rm ? 'e1rm' : 'volume'
  const label    = isE1rm ? 'Est. 1RM' : 'Volume'
  const unit     = isE1rm ? 'kg' : 'kg'
  const chartLabel = isE1rm ? 'Estimated 1RM (kg) per session' : 'Total volume (kg) per session'

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <svg viewBox="0 0 20 20" fill="currentColor"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-faint pointer-events-none">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full rounded-2xl border border-app-border bg-app-card text-app-text placeholder-app-faint pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Exercise list */}
      {!selectedId && (
        <ul className="flex flex-col gap-1 mb-4 max-h-64 overflow-y-auto">
          {filteredEx.length === 0 ? (
            <li className="text-center text-app-muted text-sm py-4">No exercises found.</li>
          ) : filteredEx.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => { setSelectedId(e.id); setSearch('') }}
                className="w-full text-left rounded-xl px-3 py-2 text-sm text-app-text active:bg-accent-light"
              >
                {e.name}
                <span className="ml-2 text-xs text-app-muted">{e.muscleGroup}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Chart */}
      {selectedId && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm text-app-text">
              {exercises.find((e) => e.id === selectedId)?.name}
            </p>
            <button onClick={() => setSelectedId('')} className="text-xs text-accent-dark active:text-accent-darker">
              Change
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-app-border/30 rounded-xl p-1 mb-3">
            {(['e1rm', 'volume'] as ChartMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={[
                  'flex-1 rounded-lg py-1.5 text-xs font-semibold',
                  chartMode === m ? 'bg-accent text-app-text' : 'text-app-muted',
                ].join(' ')}
              >
                {m === 'e1rm' ? 'Est. 1RM' : 'Volume'}
              </button>
            ))}
          </div>

          {!chartData || chartData.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted text-sm">
              No data yet. Log some sets to see your progress.
            </div>
          ) : (
            <div className="rounded-2xl bg-app-card border border-app-border p-4">
              <p className="text-xs text-app-muted mb-3">{chartLabel}</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E3E5E5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7A7980' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#7A7980' }} domain={['auto', 'auto']} />
                  <Tooltip
                    formatter={(val: number) => [`${val} ${unit}`, label]}
                    contentStyle={chartTooltipStyle}
                  />
                  <Line type="monotone" dataKey={dataKey} stroke="#B8900A" strokeWidth={2}
                    dot={{ r: 3, fill: '#FFCA10' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Body weight section ────────────────────────────────────────────────────────

function BodyWeightSection() {
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const { units } = useUnits()
  const wUnit = units.weight

  const logs = useLiveQuery(
    () => db.bodyWeightLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => list.sort((a, b) => a.date.localeCompare(b.date))),
    [],
  )

  const chartData = (logs ?? []).map((l) => ({
    date:   shortDate(l.date),
    weight: kgToDisplay(l.weight, wUnit),
  }))

  async function handleLog() {
    const val = parseFloat(weight)
    if (isNaN(val) || val <= 0) { setError(`Enter a valid weight in ${weightLabel(wUnit)}.`); return }
    setSaving(true)
    setError('')
    try {
      const kg        = displayToKg(val, wUnit)
      const timestamp = now()
      const todayStr  = today()
      const existing  = await db.bodyWeightLogs.filter((l) => l.date === todayStr && !l.deleted).first()
      if (existing) {
        await db.bodyWeightLogs.update(existing.id, { weight: kg, updatedAt: timestamp, syncedAt: null })
      } else {
        await db.bodyWeightLogs.add({
          id: crypto.randomUUID(), date: todayStr, weight: kg, notes: '',
          createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
        })
      }
      setWeight('')
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="number" inputMode="decimal" value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={`Today's weight (${weightLabel(wUnit)})`} min={0}
          step={wUnit === 'lbs' ? 0.5 : 0.1}
          className="flex-1 rounded-2xl border border-app-border bg-app-card text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={handleLog} disabled={saving}
          className="flex-none rounded-2xl bg-accent text-app-text px-4 py-2 text-sm font-semibold active:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Log'}
        </button>
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      {!logs ? null : logs.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted text-sm">
          No entries yet. Log your weight above.
        </div>
      ) : (
        <div className="rounded-2xl bg-app-card border border-app-border p-4">
          <p className="text-xs text-app-muted mb-3">Body weight ({weightLabel(wUnit)})</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E5E5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7A7980' }} />
              <YAxis tick={{ fontSize: 10, fill: '#7A7980' }} domain={['auto', 'auto']} />
              <Tooltip formatter={(val: number) => [`${val} ${weightLabel(wUnit)}`, 'Weight']} contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="weight" stroke="#B8900A" strokeWidth={2}
                dot={{ r: 3, fill: '#FFCA10' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 border-t border-app-border pt-3">
            <ul className="flex flex-col gap-1">
              {[...logs].reverse().slice(0, 10).map((l) => (
                <li key={l.id} className="flex justify-between text-sm">
                  <span className="text-app-muted">{shortDate(l.date)}</span>
                  <span className="font-medium text-app-text">{fmtWeight(l.weight, wUnit)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Measurements section ───────────────────────────────────────────────────────

type MeasFields = Omit<BodyMeasurementLog, keyof import('../db/db').BaseRecord | 'date' | 'notes'>

const MEAS_FIELDS: Array<{ key: keyof MeasFields; label: string; primary: boolean }> = [
  { key: 'chestCm',      label: 'Chest',      primary: true  },
  { key: 'waistCm',      label: 'Waist',      primary: true  },
  { key: 'hipsCm',       label: 'Hips',       primary: true  },
  { key: 'leftArmCm',    label: 'L. Arm',     primary: true  },
  { key: 'rightArmCm',   label: 'R. Arm',     primary: true  },
  { key: 'neckCm',       label: 'Neck',       primary: false },
  { key: 'shouldersCm',  label: 'Shoulders',  primary: false },
  { key: 'leftThighCm',  label: 'L. Thigh',   primary: false },
  { key: 'rightThighCm', label: 'R. Thigh',   primary: false },
  { key: 'leftCalfCm',   label: 'L. Calf',    primary: false },
  { key: 'rightCalfCm',  label: 'R. Calf',    primary: false },
]

function MeasurementsSection() {
  const [vals,     setVals]     = useState<Record<string, string>>({})
  const [showMore, setShowMore] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const { units } = useUnits()
  const mUnit = units.measurement

  const logs = useLiveQuery(
    () => db.bodyMeasurementLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => list.sort((a, b) => b.date.localeCompare(a.date))),
    [],
  )

  const todayStr = today()
  const todayLog = logs?.find((l) => l.date === todayStr)

  function fieldVal(key: string) {
    if (key in vals) return vals[key]
    const v = todayLog?.[key as keyof BodyMeasurementLog]
    if (v == null) return ''
    return String(cmToDisplay(v as number, mUnit))
  }

  function set(key: string, s: string) {
    setVals((prev) => ({ ...prev, [key]: s }))
  }

  async function handleSave() {
    const parsed: Partial<Record<keyof MeasFields, number | null>> = {}
    for (const { key } of MEAS_FIELDS) {
      const s = fieldVal(key)
      if (s.trim() === '') { parsed[key] = null; continue }
      const n = parseFloat(s)
      if (isNaN(n) || n <= 0) { setError(`Invalid value for ${key}.`); return }
      parsed[key] = displayToCm(n, mUnit)
    }

    setSaving(true)
    setError('')
    try {
      const timestamp = now()
      const base = {
        neckCm: null, shouldersCm: null, chestCm: null, waistCm: null,
        hipsCm: null, leftArmCm: null, rightArmCm: null,
        leftThighCm: null, rightThighCm: null, leftCalfCm: null, rightCalfCm: null,
        ...parsed,
        notes: '',
      }
      if (todayLog) {
        await db.bodyMeasurementLogs.update(todayLog.id, { ...base, updatedAt: timestamp, syncedAt: null })
      } else {
        await db.bodyMeasurementLogs.add({
          id: crypto.randomUUID(), date: todayStr, ...base,
          createdAt: timestamp, updatedAt: timestamp, syncedAt: null, deleted: false,
        })
      }
      setVals({})
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const visible = MEAS_FIELDS.filter((f) => showMore || f.primary)

  return (
    <div className="flex flex-col gap-4">
      {/* Entry form */}
      <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-3">
        <p className="text-xs text-app-muted">Log measurements ({measurementLabel(mUnit)}) — one entry per day</p>

        <div className="grid grid-cols-3 gap-2">
          {visible.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-app-muted mb-1">{label}</label>
              <input
                type="number" inputMode="decimal" min={0} step={0.1}
                value={fieldVal(key)}
                onChange={(e) => set(key, e.target.value)}
                placeholder={measurementLabel(mUnit)}
                className="w-full rounded-xl border border-app-border bg-app-bg text-app-text px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowMore((v) => !v)}
          className="text-xs text-app-muted active:text-accent-dark text-left"
        >
          {showMore ? '− Less' : '+ More measurements'}
        </button>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSave} disabled={saving}
          className="w-full rounded-2xl bg-accent text-app-text py-2.5 text-sm font-semibold active:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : todayLog ? 'Update Today' : 'Log Today'}
        </button>
      </div>

      {/* Recent entries */}
      {logs && logs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {logs.slice(0, 10).map((l) => {
            const filled = MEAS_FIELDS.filter(({ key }) => l[key as keyof BodyMeasurementLog] != null)
            return (
              <li key={l.id} className="rounded-2xl bg-app-card border border-app-border px-4 py-3">
                <p className="text-sm font-semibold text-app-text mb-2">{shortDate(l.date)}</p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                  {filled.map(({ key, label }) => (
                    <div key={key} className="flex justify-between gap-1">
                      <span className="text-xs text-app-muted">{label}</span>
                      <span className="text-xs text-app-text font-medium">
                        {cmToDisplay(l[key as keyof BodyMeasurementLog] as number, mUnit)} {measurementLabel(mUnit)}
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {logs?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted text-sm">
          No measurements yet. Log today's above.
        </div>
      )}
    </div>
  )
}

// ── Body tab (weight + measurements) ─────────────────────────────────────────

function BodyTab() {
  const [sub, setSub] = useState<'weight' | 'measure'>('weight')

  return (
    <div>
      <div className="flex gap-1 bg-app-border/30 rounded-xl p-1 mb-4">
        {(['weight', 'measure'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={[
              'flex-1 rounded-lg py-1.5 text-xs font-semibold',
              sub === s ? 'bg-accent text-app-text' : 'text-app-muted',
            ].join(' ')}
          >
            {s === 'weight' ? 'Weight' : 'Measurements'}
          </button>
        ))}
      </div>
      {sub === 'weight'  && <BodyWeightSection />}
      {sub === 'measure' && <MeasurementsSection />}
    </div>
  )
}

// ── PRs tab ───────────────────────────────────────────────────────────────────

function PRsTab({ exercises }: { exercises: Exercise[] }) {
  const prs = useLiveQuery(async () => {
    const allSets = await db.sets
      .filter((s) => !s.deleted && !s.isWarmup && s.reps > 0 && s.weight > 0)
      .toArray()

    const allSes = await db.sessionExercises.filter((se) => !se.deleted).toArray()
    const seExerciseMap = new Map(allSes.map((se) => [se.id, se.exerciseId]))

    const bestE1rm:   Map<string, number> = new Map()
    const bestWeight: Map<string, number> = new Map()
    const bestReps:   Map<string, number> = new Map()

    for (const s of allSets) {
      const exerciseId = seExerciseMap.get(s.sessionExerciseId)
      if (!exerciseId) continue
      const e1rm = epley(s.weight, s.reps)
      if (!bestE1rm.has(exerciseId) || e1rm > bestE1rm.get(exerciseId)!) {
        bestE1rm.set(exerciseId, e1rm)
        bestWeight.set(exerciseId, s.weight)
        bestReps.set(exerciseId, s.reps)
      }
    }

    return { bestE1rm, bestWeight, bestReps }
  }, [])

  if (!prs) return <div className="flex items-center justify-center h-20 text-app-muted">Loading…</div>

  const { bestE1rm, bestWeight, bestReps } = prs

  if (bestE1rm.size === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted text-sm">
        No PRs yet. Start logging workouts to track your personal records.
      </div>
    )
  }

  const exerciseMap = new Map(exercises.map((e) => [e.id, e]))
  const sorted = [...bestE1rm.entries()]
    .map(([id, e1rm]) => ({
      exercise: exerciseMap.get(id),
      e1rm,
      weight: bestWeight.get(id)!,
      reps:   bestReps.get(id)!,
    }))
    .filter((r) => r.exercise)
    .sort((a, b) => a.exercise!.name.localeCompare(b.exercise!.name))

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map(({ exercise, e1rm, weight, reps }) => (
        <li key={exercise!.id} className="flex items-center gap-3 rounded-2xl bg-app-card border border-app-border px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-app-text truncate">{exercise!.name}</p>
            <p className="text-xs text-app-muted">{exercise!.muscleGroup}</p>
          </div>
          <div className="text-right flex-none">
            <p className="text-sm font-bold text-accent-dark">{e1rm} kg e1RM</p>
            <p className="text-xs text-app-muted">{weight} kg × {reps}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Nutrition tab ─────────────────────────────────────────────────────────────

function num(s: string) { const n = parseFloat(s); return isNaN(n) || n < 0 ? null : n }

function MacroBadge({ label, value, unit, color }: { label: string; value: number | null; unit: string; color: string }) {
  if (value == null) return null
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {label} {value}{unit}
    </span>
  )
}

function NutritionTab() {
  const logs = useLiveQuery(
    () => db.nutritionLogs
      .filter((l) => !l.deleted)
      .toArray()
      .then((list) => list.sort((a, b) => b.date.localeCompare(a.date))),
    [],
  )

  const todayStr  = today()
  const todayLog  = logs?.find((l) => l.date === todayStr)

  const [calories, setCalories] = useState('')
  const [protein,  setProtein]  = useState('')
  const [carbs,    setCarbs]    = useState('')
  const [fat,      setFat]      = useState('')
  const [water,    setWater]    = useState('')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [prefilled, setPrefilled] = useState(false)

  if (todayLog && !prefilled) {
    setCalories(todayLog.calories != null ? String(todayLog.calories) : '')
    setProtein(todayLog.proteinG  != null ? String(todayLog.proteinG)  : '')
    setCarbs(todayLog.carbsG      != null ? String(todayLog.carbsG)    : '')
    setFat(todayLog.fatG          != null ? String(todayLog.fatG)      : '')
    setWater(todayLog.waterMl     != null ? String(todayLog.waterMl)   : '')
    setPrefilled(true)
  }

  async function handleSave() {
    const cal  = num(calories)
    const prot = num(protein)
    const crb  = num(carbs)
    const ft   = num(fat)
    const wtr  = num(water)

    if (cal == null && prot == null && crb == null && ft == null && wtr == null) {
      setError('Enter at least one value.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const timestamp = now()
      const payload: Omit<NutritionLog, 'id' | 'createdAt' | 'deleted'> = {
        date: todayStr,
        calories: cal, proteinG: prot, carbsG: crb, fatG: ft, waterMl: wtr,
        notes: '', updatedAt: timestamp, syncedAt: null,
      }
      if (todayLog) {
        await db.nutritionLogs.update(todayLog.id, payload)
      } else {
        await db.nutritionLogs.add({
          id: crypto.randomUUID(),
          ...payload,
          createdAt: timestamp, deleted: false,
        })
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const chartData = (logs ?? [])
    .filter((l) => l.calories != null)
    .map((l) => ({ date: shortDate(l.date), calories: l.calories }))
    .reverse()

  return (
    <div className="flex flex-col gap-4">
      {/* Entry form */}
      <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-app-text">Today</p>

        {/* Calories */}
        <div>
          <label className="block text-xs text-app-muted mb-1">Calories (kcal)</label>
          <input
            type="number" inputMode="decimal" value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="e.g. 2400" min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Macros row */}
        <div className="flex gap-2">
          {[
            { label: 'Protein (g)', value: protein, set: setProtein, placeholder: '180' },
            { label: 'Carbs (g)',   value: carbs,   set: setCarbs,   placeholder: '250' },
            { label: 'Fat (g)',     value: fat,      set: setFat,     placeholder: '80'  },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label} className="flex-1">
              <label className="block text-xs text-app-muted mb-1">{label}</label>
              <input
                type="number" inputMode="decimal" value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder} min={0}
                className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          ))}
        </div>

        {/* Water */}
        <div>
          <label className="block text-xs text-app-muted mb-1">Water (ml)</label>
          <input
            type="number" inputMode="decimal" value={water}
            onChange={(e) => setWater(e.target.value)}
            placeholder="e.g. 2500" min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={handleSave} disabled={saving}
          className="w-full rounded-2xl bg-accent text-app-text py-2.5 text-sm font-semibold active:bg-accent-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : todayLog ? 'Update Today' : 'Log Today'}
        </button>
      </div>

      {/* Calorie chart */}
      {chartData.length > 1 && (
        <div className="rounded-2xl bg-app-card border border-app-border p-4">
          <p className="text-xs text-app-muted mb-3">Calories over time</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E5E5" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#7A7980' }} />
              <YAxis tick={{ fontSize: 10, fill: '#7A7980' }} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(val: number) => [`${val} kcal`, 'Calories']}
                contentStyle={chartTooltipStyle}
              />
              <Line type="monotone" dataKey="calories" stroke="#B8900A" strokeWidth={2}
                dot={{ r: 3, fill: '#FFCA10' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent entries */}
      {logs && logs.length > 0 && (
        <ul className="flex flex-col gap-2">
          {logs.slice(0, 14).map((l) => (
            <li key={l.id} className="rounded-2xl bg-app-card border border-app-border px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-app-text">{shortDate(l.date)}</span>
                {l.calories != null && (
                  <span className="text-sm font-bold text-accent-dark">{l.calories} kcal</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                <MacroBadge label="P" value={l.proteinG} unit="g" color="bg-blue-50 text-blue-600" />
                <MacroBadge label="C" value={l.carbsG}   unit="g" color="bg-amber-50 text-amber-600" />
                <MacroBadge label="F" value={l.fatG}     unit="g" color="bg-orange-50 text-orange-600" />
                <MacroBadge label="💧" value={l.waterMl != null ? Math.round(l.waterMl / 100) / 10 : null} unit="L" color="bg-cyan-50 text-cyan-600" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {logs?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center text-app-muted text-sm">
          No entries yet. Log today's nutrition above.
        </div>
      )}
    </div>
  )
}

// ── Main Progress page ────────────────────────────────────────────────────────

type Tab = 'lifts' | 'prs' | 'nutrition' | 'habits'

const TABS: { value: Tab; label: string }[] = [
  { value: 'lifts',     label: 'Lifts'     },
  { value: 'prs',       label: 'PRs'       },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'habits',    label: 'Habits'    },
]

export default function Progress() {
  const navigate   = useNavigate()
  const [tab, setTab] = useState<Tab>('lifts')

  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => !e.deleted).toArray(),
    [],
  )

  if (!exercises) {
    return <div className="flex items-center justify-center h-40 text-app-muted">Loading…</div>
  }

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-app-text">Progress</h1>
        <button
          onClick={() => navigate('/body')}
          className="flex items-center gap-1.5 bg-app-card border border-app-border rounded-full px-3 py-1.5 text-xs font-semibold text-app-text active:bg-app-border"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-accent-dark">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
          </svg>
          Body Stats
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-app-border/30 rounded-2xl p-1 mb-5">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={[
              'flex-1 rounded-xl py-2 text-xs font-semibold',
              tab === value
                ? 'bg-accent text-app-text shadow-sm'
                : 'text-app-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'lifts'     && <LiftChartTab exercises={exercises} />}
      {tab === 'prs'       && <PRsTab exercises={exercises} />}
      {tab === 'nutrition' && <NutritionTab />}
      {tab === 'habits'    && <HabitsTab />}
    </div>
  )
}
