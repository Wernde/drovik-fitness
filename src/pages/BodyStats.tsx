import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import MiniLineChart from '../components/MiniLineChart'
import { db, now, today } from '../db/db'
import type { BodyMeasurementLog } from '../db/db'
import { loadProfile } from '../lib/tdee'
import { useUnits } from '../contexts/UnitsContext'
import {
  kgToDisplay, displayToKg, weightLabel,
  cmToDisplay, displayToCm, measurementLabel,
} from '../lib/units'

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function periodCutoff(p: '1m' | '3m' | '6m' | 'all') {
  const d = new Date()
  if (p === '1m') d.setMonth(d.getMonth() - 1)
  else if (p === '3m') d.setMonth(d.getMonth() - 3)
  else if (p === '6m') d.setMonth(d.getMonth() - 6)
  else d.setFullYear(2000)
  return d.toISOString().slice(0, 10)
}

function calcBMI(weightKg: number, heightCm: number) {
  const h = heightCm / 100
  return weightKg / (h * h)
}

function bmiInfo(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-500' }
  if (bmi < 25)   return { label: 'Normal',       color: 'text-green-600' }
  if (bmi < 30)   return { label: 'Overweight',   color: 'text-amber-500' }
  return                 { label: 'Obese',         color: 'text-red-500'  }
}

function calcNavyBodyFat(
  sex: 'male' | 'female',
  waistCm: number,
  neckCm: number,
  heightCm: number,
  hipsCm?: number,
): number | null {
  if (sex === 'male') {
    const diff = waistCm - neckCm
    if (diff <= 0) return null
    return 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm)) - 450
  }
  if (!hipsCm) return null
  const sum = waistCm + hipsCm - neckCm
  if (sum <= 0) return null
  return 495 / (1.29579 - 0.35004 * Math.log10(sum) + 0.22100 * Math.log10(heightCm)) - 450
}

function bodyFatInfo(pct: number, sex: 'male' | 'female'): { label: string; color: string } {
  if (sex === 'male') {
    if (pct < 6)  return { label: 'Essential', color: 'text-blue-500'  }
    if (pct < 14) return { label: 'Athletic',  color: 'text-green-600' }
    if (pct < 18) return { label: 'Fitness',   color: 'text-green-500' }
    if (pct < 25) return { label: 'Average',   color: 'text-amber-500' }
    return               { label: 'Obese',     color: 'text-red-500'   }
  }
  if (pct < 14) return { label: 'Essential', color: 'text-blue-500'  }
  if (pct < 21) return { label: 'Athletic',  color: 'text-green-600' }
  if (pct < 25) return { label: 'Fitness',   color: 'text-green-500' }
  if (pct < 32) return { label: 'Average',   color: 'text-amber-500' }
  return               { label: 'Obese',     color: 'text-red-500'   }
}

async function compressPhoto(file: File, maxPx = 900): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.75))
    }
    img.src = url
  })
}

// ── Measurement field definitions ─────────────────────────────────────────────

const MEAS_FIELDS = [
  { key: 'chestCm',      label: 'Chest',     primary: true  },
  { key: 'waistCm',      label: 'Waist',     primary: true  },
  { key: 'hipsCm',       label: 'Hips',      primary: true  },
  { key: 'leftArmCm',    label: 'L. Arm',    primary: true  },
  { key: 'rightArmCm',   label: 'R. Arm',    primary: true  },
  { key: 'neckCm',       label: 'Neck',      primary: false },
  { key: 'shouldersCm',  label: 'Shoulders', primary: false },
  { key: 'leftThighCm',  label: 'L. Thigh',  primary: false },
  { key: 'rightThighCm', label: 'R. Thigh',  primary: false },
  { key: 'leftCalfCm',   label: 'L. Calf',   primary: false },
  { key: 'rightCalfCm',  label: 'R. Calf',   primary: false },
] as const

type MeasKey = typeof MEAS_FIELDS[number]['key']

type ChartMetric = 'weight' | MeasKey

const CHART_OPTIONS: Array<{ value: ChartMetric; label: string }> = [
  { value: 'weight',      label: 'Weight'   },
  { value: 'chestCm',     label: 'Chest'    },
  { value: 'waistCm',     label: 'Waist'    },
  { value: 'hipsCm',      label: 'Hips'     },
  { value: 'leftArmCm',   label: 'Arm'      },
  { value: 'neckCm',      label: 'Neck'     },
  { value: 'leftThighCm', label: 'Thigh'    },
]


// ── Page ──────────────────────────────────────────────────────────────────────

export default function BodyStats() {
  const navigate = useNavigate()
  const { units } = useUnits()
  const profile = useMemo(() => loadProfile(), [])
  const todayStr = today()

  const [logOpen,       setLogOpen]       = useState(false)
  const [period,        setPeriod]        = useState<'1m' | '3m' | '6m' | 'all'>('3m')
  const [metric,        setMetric]        = useState<ChartMetric>('weight')
  const [weightInput,   setWeightInput]   = useState('')
  const [measVals,      setMeasVals]      = useState<Partial<Record<MeasKey, string>>>({})
  const [showMoreLog,   setShowMoreLog]   = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [photoAdding,   setPhotoAdding]   = useState(false)
  const [lightboxSrc,   setLightboxSrc]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Live data ───────────────────────────────────────────────────────────────

  const weightLogs = useLiveQuery(
    () => db.bodyWeightLogs.filter(l => !l.deleted).toArray()
      .then(a => a.sort((x, y) => y.date.localeCompare(x.date))),
    [],
  )

  const measLogs = useLiveQuery(
    () => db.bodyMeasurementLogs.filter(l => !l.deleted).toArray()
      .then(a => a.sort((x, y) => y.date.localeCompare(x.date))),
    [],
  )

  const photos = useLiveQuery(
    () => db.progressPhotos.filter(p => !p.deleted).toArray()
      .then(a => a.sort((x, y) => y.date.localeCompare(x.date))),
    [],
  )

  // ── Derived stats ───────────────────────────────────────────────────────────

  const latestWt  = weightLogs?.[0]
  const prevWt    = weightLogs?.find(l => l.date < (latestWt?.date ?? ''))
  const wtDelta   = latestWt && prevWt
    ? +(kgToDisplay(latestWt.weight, units.weight) - kgToDisplay(prevWt.weight, units.weight)).toFixed(1)
    : null

  const bmi = latestWt && profile?.heightCm
    ? calcBMI(latestWt.weight, profile.heightCm)
    : null

  const latestMeas = measLogs?.[0]
  const bodyFat = latestMeas && profile?.heightCm && profile.sex
    && latestMeas.waistCm != null && latestMeas.neckCm != null
    ? calcNavyBodyFat(profile.sex, latestMeas.waistCm, latestMeas.neckCm, profile.heightCm, latestMeas.hipsCm ?? undefined)
    : null

  // ── Chart data ──────────────────────────────────────────────────────────────

  const chartData = useMemo(() => {
    const cutoff = periodCutoff(period)
    if (metric === 'weight') {
      return (weightLogs ?? [])
        .filter(l => l.date >= cutoff)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(l => ({ date: shortDate(l.date), val: kgToDisplay(l.weight, units.weight) }))
    }
    return (measLogs ?? [])
      .filter(l => l.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(l => {
        const raw = l[metric as keyof BodyMeasurementLog] as number | null
        return raw != null ? { date: shortDate(l.date), val: cmToDisplay(raw, units.measurement) } : null
      })
      .filter((d): d is { date: string; val: number } => d !== null)
  }, [metric, period, weightLogs, measLogs, units])

  const chartUnit = metric === 'weight' ? weightLabel(units.weight) : measurementLabel(units.measurement)
  const chartLabel = CHART_OPTIONS.find(o => o.value === metric)?.label ?? ''

  // ── Today's pre-fill ────────────────────────────────────────────────────────

  const todayWt   = weightLogs?.find(l => l.date === todayStr)
  const todayMeas = measLogs?.find(l => l.date === todayStr)

  function measVal(key: MeasKey) {
    if (key in measVals) return measVals[key] ?? ''
    const v = todayMeas?.[key as keyof BodyMeasurementLog]
    return v != null ? String(cmToDisplay(v as number, units.measurement)) : ''
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      const ts = now()

      if (weightInput.trim()) {
        const kg = displayToKg(parseFloat(weightInput), units.weight)
        if (!isNaN(kg) && kg > 0) {
          if (todayWt) {
            await db.bodyWeightLogs.update(todayWt.id, { weight: kg, updatedAt: ts, syncedAt: null })
          } else {
            await db.bodyWeightLogs.add({
              id: crypto.randomUUID(), date: todayStr, weight: kg, notes: '',
              createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
            })
          }
        }
      }

      const parsed: Partial<Record<MeasKey, number | null>> = {}
      for (const { key } of MEAS_FIELDS) {
        const s = measVal(key)
        if (!s.trim()) { parsed[key] = null; continue }
        const n = parseFloat(s)
        parsed[key] = isNaN(n) || n <= 0 ? null : displayToCm(n, units.measurement)
      }
      const base = {
        neckCm: null, shouldersCm: null, chestCm: null, waistCm: null, hipsCm: null,
        leftArmCm: null, rightArmCm: null, leftThighCm: null, rightThighCm: null,
        leftCalfCm: null, rightCalfCm: null, notes: '', ...parsed,
      }
      if (todayMeas) {
        await db.bodyMeasurementLogs.update(todayMeas.id, { ...base, updatedAt: ts, syncedAt: null })
      } else {
        await db.bodyMeasurementLogs.add({
          id: crypto.randomUUID(), date: todayStr, ...base,
          createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
        })
      }

      setWeightInput('')
      setMeasVals({})
      setLogOpen(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Photos ──────────────────────────────────────────────────────────────────

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoAdding(true)
    try {
      const data = await compressPhoto(file)
      const ts = now()
      await db.progressPhotos.add({
        id: crypto.randomUUID(), date: todayStr, photoData: data, notes: '',
        createdAt: ts, updatedAt: ts, syncedAt: null, deleted: false,
      })
    } finally {
      setPhotoAdding(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function deletePhoto(id: string) {
    await db.progressPhotos.update(id, { deleted: true, updatedAt: now(), syncedAt: null })
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-app-bg min-h-screen pb-24">

      {/* ── Header ── */}
      <div className="bg-app-bg px-4 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-app-muted active:text-app-text"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-2xl font-extrabold text-app-text flex-1">Body Stats</h1>
        <button
          onClick={() => setLogOpen(true)}
          className="bg-accent text-app-text text-sm font-bold px-4 py-2 rounded-full active:bg-accent-dark"
        >
          + Log
        </button>
      </div>

      <div className="px-4 space-y-4">

        {/* ── Quick stats ── */}
        <div className="grid grid-cols-3 gap-2">

          {/* Weight */}
          <div className="bg-app-card rounded-2xl border border-app-border p-3 flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-app-muted uppercase tracking-wide">Weight</p>
            {latestWt ? (
              <>
                <p className="text-xl font-extrabold text-app-text leading-tight">
                  {kgToDisplay(latestWt.weight, units.weight).toFixed(1)}
                </p>
                <p className="text-[10px] text-app-muted">{weightLabel(units.weight)}</p>
                {wtDelta !== null && wtDelta !== 0 && (
                  <p className={`text-[10px] font-semibold mt-0.5 ${wtDelta > 0 ? 'text-red-400' : 'text-green-600'}`}>
                    {wtDelta > 0 ? `+${wtDelta}` : wtDelta} vs prev
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-app-faint mt-1 leading-tight">Not logged yet</p>
            )}
          </div>

          {/* BMI */}
          <div className="bg-app-card rounded-2xl border border-app-border p-3 flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-app-muted uppercase tracking-wide">BMI</p>
            {bmi != null ? (
              <>
                <p className="text-xl font-extrabold text-app-text leading-tight">{bmi.toFixed(1)}</p>
                <p className={`text-[10px] font-semibold mt-0.5 ${bmiInfo(bmi).color}`}>
                  {bmiInfo(bmi).label}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-app-faint mt-1 leading-tight">
                {profile?.heightCm ? 'Log weight' : 'Set height in Nutrition'}
              </p>
            )}
          </div>

          {/* Body Fat */}
          <div className="bg-app-card rounded-2xl border border-app-border p-3 flex flex-col gap-0.5">
            <p className="text-[10px] font-bold text-app-muted uppercase tracking-wide">Body Fat</p>
            {bodyFat != null && bodyFat > 2 ? (
              <>
                <p className="text-xl font-extrabold text-app-text leading-tight">{bodyFat.toFixed(1)}%</p>
                {profile?.sex && (
                  <p className={`text-[10px] font-semibold mt-0.5 ${bodyFatInfo(bodyFat, profile.sex).color}`}>
                    {bodyFatInfo(bodyFat, profile.sex).label}
                  </p>
                )}
                <p className="text-[9px] text-app-faint">Navy est.</p>
              </>
            ) : (
              <p className="text-[11px] text-app-faint mt-1 leading-tight">
                Log neck + waist
              </p>
            )}
          </div>
        </div>

        {/* ── Chart ── */}
        <div className="bg-app-card rounded-2xl border border-app-border p-4">

          {/* Metric pills */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {CHART_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMetric(value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                  metric === value
                    ? 'bg-accent text-app-text'
                    : 'bg-app-bg border border-app-border text-app-muted active:bg-app-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period pills */}
          <div className="flex gap-1 mb-4">
            {(['1m', '3m', '6m', 'all'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  period === p
                    ? 'bg-accent text-app-text'
                    : 'text-app-muted bg-app-bg border border-app-border'
                }`}
              >
                {p === 'all' ? 'All' : p.toUpperCase()}
              </button>
            ))}
          </div>

          {chartData.length < 2 ? (
            <div className="h-[160px] flex items-center justify-center">
              <p className="text-app-muted text-sm text-center px-6">
                Log at least 2 entries to see the {chartLabel.toLowerCase()} chart
              </p>
            </div>
          ) : (
            <MiniLineChart data={chartData} dataKey="val" height={180}
              formatY={v => `${v.toFixed(1)} ${chartUnit}`} label={chartLabel} />
          )}
        </div>

        {/* ── Progress Photos ── */}
        <div className="bg-app-card rounded-2xl border border-app-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-[15px] text-app-text">Progress Photos</h2>
              {photos && photos.length > 0 && (
                <p className="text-xs text-app-muted mt-0.5">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <label
              className={`flex items-center gap-1.5 bg-accent text-app-text text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer active:bg-accent-dark ${photoAdding ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              {photoAdding ? 'Adding…' : 'Add Photo'}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhoto}
              />
            </label>
          </div>

          {!photos || photos.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-app-border p-8 text-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-app-faint mx-auto mb-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <p className="text-sm text-app-muted">Tap Add Photo to start your progress timeline</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {photos.map(p => (
                <div key={p.id} className="relative rounded-xl overflow-hidden bg-app-bg" style={{ aspectRatio: '3/4' }}>
                  <img
                    src={p.photoData}
                    alt={`Progress ${p.date}`}
                    className="w-full h-full object-cover cursor-pointer active:opacity-80"
                    onClick={() => setLightboxSrc(p.photoData)}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6">
                    <p className="text-white text-[11px] font-semibold">{shortDate(p.date)}</p>
                  </div>
                  <button
                    onClick={() => deletePhoto(p.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center active:bg-black/70"
                    aria-label="Delete photo"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-white">
                      <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Measurements history ── */}
        {measLogs && measLogs.length > 0 && (
          <div className="bg-app-card rounded-2xl border border-app-border p-4">
            <h2 className="font-bold text-[15px] text-app-text mb-3">Measurements History</h2>
            <div className="space-y-3">
              {measLogs.slice(0, 8).map(l => {
                const filled = MEAS_FIELDS.filter(({ key }) => l[key as keyof BodyMeasurementLog] != null)
                if (!filled.length) return null
                return (
                  <div key={l.id} className="border-b border-app-border pb-3 last:border-0 last:pb-0">
                    <p className="text-xs font-semibold text-app-muted mb-2">{shortDate(l.date)}</p>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-1">
                      {filled.map(({ key, label }) => (
                        <div key={key} className="flex justify-between gap-1">
                          <span className="text-[11px] text-app-muted">{label}</span>
                          <span className="text-[11px] font-semibold text-app-text">
                            {cmToDisplay(l[key as keyof BodyMeasurementLog] as number, units.measurement)}{measurementLabel(units.measurement)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Weight history ── */}
        {weightLogs && weightLogs.length > 0 && (
          <div className="bg-app-card rounded-2xl border border-app-border p-4">
            <h2 className="font-bold text-[15px] text-app-text mb-3">Weight History</h2>
            <ul className="space-y-1.5">
              {weightLogs.slice(0, 12).map(l => (
                <li key={l.id} className="flex justify-between text-sm">
                  <span className="text-app-muted">{shortDate(l.date)}</span>
                  <span className="font-semibold text-app-text">
                    {kgToDisplay(l.weight, units.weight).toFixed(1)} {weightLabel(units.weight)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>{/* /px-4 */}

      {/* ── Log sheet ── */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setLogOpen(false)} />
          <div
            className="relative z-10 w-full bg-app-card rounded-t-3xl px-5 max-h-[92vh] overflow-y-auto"
            style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))' }}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-app-card pt-3 pb-3 flex items-center justify-between border-b border-app-border/50 z-10">
              <div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-gray-200" />
              <p className="font-bold text-app-text mt-4">Log Today</p>
              <button onClick={() => setLogOpen(false)} className="mt-4 text-app-muted p-1 active:text-app-text">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="pt-4 space-y-5">

              {/* Weight */}
              <div>
                <label className="text-xs font-bold text-app-muted uppercase tracking-wide block mb-2">
                  Body Weight ({weightLabel(units.weight)})
                </label>
                <input
                  type="number" inputMode="decimal"
                  value={weightInput}
                  onChange={e => setWeightInput(e.target.value)}
                  placeholder={units.weight === 'kg' ? 'e.g. 80.5' : 'e.g. 177.5'}
                  step={units.weight === 'lbs' ? 0.5 : 0.1}
                  className="w-full rounded-xl border border-app-border bg-app-bg text-app-text px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              {/* Measurements */}
              <div>
                <label className="text-xs font-bold text-app-muted uppercase tracking-wide block mb-2">
                  Measurements ({measurementLabel(units.measurement)})
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {MEAS_FIELDS.filter((_, i) => showMoreLog || i < 5).map(({ key, label }) => (
                    <div key={key}>
                      <label className="text-xs text-app-muted block mb-1">{label}</label>
                      <input
                        type="number" inputMode="decimal" min={0} step={0.1}
                        value={measVal(key)}
                        onChange={e => setMeasVals(v => ({ ...v, [key]: e.target.value }))}
                        placeholder="—"
                        className="w-full rounded-xl border border-app-border bg-app-bg text-app-text px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowMoreLog(v => !v)}
                  className="mt-2 text-xs text-app-muted active:text-accent-dark"
                >
                  {showMoreLog ? '− Show less' : '+ More measurements (neck, shoulders, calves…)'}
                </button>
              </div>

              <button
                onClick={handleSave} disabled={saving}
                className="w-full rounded-2xl bg-accent text-app-text py-3.5 text-sm font-bold active:bg-accent-dark disabled:opacity-60"
              >
                {saving ? 'Saving…' : (todayMeas || todayWt) ? 'Update Today' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="Progress photo"
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30"
            onClick={() => setLightboxSrc(null)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

    </div>
  )
}
