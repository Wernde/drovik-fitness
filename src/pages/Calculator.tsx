/**
 * Calculator — plate calculator + warm-up ramp.
 */

import { useState } from 'react'
import { useUnits } from '../contexts/UnitsContext'
import { kgToDisplay, displayToKg, weightLabel } from '../lib/units'

// ── Plate definitions ──────────────────────────────────────────────────────────

const PLATES_KG: Array<{ weight: number; bg: string; fg: string }> = [
  { weight: 25,   bg: 'bg-red-600',    fg: 'text-white' },
  { weight: 20,   bg: 'bg-blue-500',   fg: 'text-white' },
  { weight: 15,   bg: 'bg-amber-400',  fg: 'text-gray-900' },
  { weight: 10,   bg: 'bg-green-500',  fg: 'text-white' },
  { weight: 5,    bg: 'bg-gray-300',   fg: 'text-gray-900' },
  { weight: 2.5,  bg: 'bg-red-300',    fg: 'text-gray-900' },
  { weight: 1.25, bg: 'bg-gray-500',   fg: 'text-white' },
]

const PLATES_LBS: Array<{ weight: number; bg: string; fg: string }> = [
  { weight: 45,   bg: 'bg-blue-500',   fg: 'text-white' },
  { weight: 35,   bg: 'bg-amber-400',  fg: 'text-gray-900' },
  { weight: 25,   bg: 'bg-green-500',  fg: 'text-white' },
  { weight: 10,   bg: 'bg-gray-300',   fg: 'text-gray-900' },
  { weight: 5,    bg: 'bg-red-300',    fg: 'text-gray-900' },
  { weight: 2.5,  bg: 'bg-gray-500',   fg: 'text-white' },
]

const BARBELL_PRESETS_KG = [
  { label: '20 kg — Olympic', value: 20 },
  { label: '15 kg — Women\'s', value: 15 },
  { label: '10 kg — Junior',  value: 10 },
]

const BARBELL_PRESETS_LBS = [
  { label: '45 lbs — Olympic', value: 45 },
  { label: '35 lbs — Women\'s', value: 35 },
  { label: '25 lbs — Junior',  value: 25 },
]

// ── Algorithms ─────────────────────────────────────────────────────────────────

function calcPlatesForSide(
  perSide: number,
  plates: Array<{ weight: number; bg: string; fg: string }>,
): Array<{ weight: number; count: number }> {
  const result: Array<{ weight: number; count: number }> = []
  let rem = Math.round(perSide * 100)
  for (const { weight } of plates) {
    const wHundredths = Math.round(weight * 100)
    const count = Math.floor(rem / wHundredths)
    if (count > 0) {
      result.push({ weight, count })
      rem -= count * wHundredths
    }
  }
  return result
}

function warmupRamp(
  workingWeight: number,
  barbellWeight: number,
  step: number,
): Array<{ pct: number; weight: number }> {
  return [40, 60, 80].map((pct) => {
    const raw     = (pct / 100) * workingWeight
    const rounded = Math.max(barbellWeight, Math.round(raw / step) * step)
    return { pct, weight: rounded }
  })
}

// ── Visual bar graphic ─────────────────────────────────────────────────────────

const PLATE_HEIGHT_KG: Record<number, number> = {
  25: 60, 20: 54, 15: 48, 10: 40, 5: 30, 2.5: 22, 1.25: 16,
}
const PLATE_HEIGHT_LBS: Record<number, number> = {
  45: 60, 35: 54, 25: 48, 10: 40, 5: 30, 2.5: 22,
}

function BarGraphic({
  plates,
  plateDefs,
  heightMap,
}: {
  plates:    Array<{ weight: number; count: number }>
  plateDefs: Array<{ weight: number; bg: string; fg: string }>
  heightMap: Record<number, number>
}) {
  const individual = plates.flatMap(({ weight, count }) =>
    Array.from({ length: count }, () => weight)
  )
  const ordered = [...individual].reverse()

  return (
    <div className="flex items-center gap-0 my-2" aria-hidden>
      <div className="w-6 h-2 bg-gray-400 rounded-l-full" />
      <div className="flex-1 h-2 bg-gray-300" />
      <div className="flex items-center gap-px">
        {ordered.map((w, i) => {
          const plate = plateDefs.find((p) => p.weight === w)!
          const h = heightMap[w] ?? 20
          return (
            <div key={i} className={`w-4 rounded-sm ${plate.bg}`} style={{ height: h }} />
          )
        })}
      </div>
      <div className="w-8 h-2 bg-gray-300 rounded-r-sm" />
    </div>
  )
}

// ── Plate Calculator section ───────────────────────────────────────────────────

function PlateCalculator() {
  const { units }  = useUnits()
  const wUnit      = units.weight
  const plateDefs  = wUnit === 'lbs' ? PLATES_LBS : PLATES_KG
  const heightMap  = wUnit === 'lbs' ? PLATE_HEIGHT_LBS : PLATE_HEIGHT_KG
  const presets    = wUnit === 'lbs' ? BARBELL_PRESETS_LBS : BARBELL_PRESETS_KG
  const defaultBar = wUnit === 'lbs' ? '45' : '20'
  const wl         = weightLabel(wUnit)

  const [targetStr,  setTargetStr]  = useState('')
  const [barbellStr, setBarbellStr] = useState(defaultBar)
  const [customBar,  setCustomBar]  = useState(false)

  const target  = parseFloat(targetStr)
  const barbell = parseFloat(barbellStr)

  const valid   = !isNaN(target) && target > 0 && !isNaN(barbell) && barbell >= 0
  const perSide = valid ? (target - barbell) / 2 : null

  const plates       = perSide != null && perSide >= 0 ? calcPlatesForSide(perSide, plateDefs) : null
  const achievedSide = plates ? plates.reduce((s, p) => s + p.weight * p.count, 0) : 0
  const achieved     = valid && plates ? achievedSide * 2 + barbell : null
  const residual     = achieved != null && valid ? Math.round((target - achieved) * 100) / 100 : null
  const impossible   = perSide != null && perSide < 0

  return (
    <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-app-text">Plate Calculator</h2>

      <div>
        <label className="block text-xs text-app-muted mb-1">Target weight ({wl})</label>
        <input
          type="number" inputMode="decimal" value={targetStr}
          onChange={(e) => setTargetStr(e.target.value)}
          placeholder={wUnit === 'lbs' ? 'e.g. 225' : 'e.g. 100'}
          min={0} step={wUnit === 'lbs' ? 5 : 2.5}
          className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-xs text-app-muted mb-1">Barbell weight</label>
        {!customBar ? (
          <div className="flex gap-2 flex-wrap">
            {presets.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => { setBarbellStr(String(value)); setCustomBar(false) }}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold',
                  parseFloat(barbellStr) === value && !customBar
                    ? 'bg-accent text-app-text'
                    : 'bg-app-bg border border-app-border text-app-muted',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setCustomBar(true)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-app-bg border border-app-border text-app-muted"
            >
              Custom…
            </button>
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <input
              type="number" inputMode="decimal" value={barbellStr}
              onChange={(e) => setBarbellStr(e.target.value)}
              placeholder={wl} min={0}
              className="flex-1 rounded-xl border border-app-border bg-app-bg text-app-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={() => { setBarbellStr(defaultBar); setCustomBar(false) }}
              className="text-xs text-app-muted active:text-app-text"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {valid && (
        impossible ? (
          <p className="text-sm text-red-500">
            Target is less than the barbell weight ({barbell} {wl}).
          </p>
        ) : plates ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-accent-dark tabular-nums">
                {perSide!.toFixed(perSide! % 1 === 0 ? 0 : 2)} {wl}
              </span>
              <span className="text-sm text-app-muted">each side</span>
            </div>

            {plates.length > 0 && (
              <BarGraphic plates={plates} plateDefs={plateDefs} heightMap={heightMap} />
            )}

            {plates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {plates.map(({ weight, count }) => {
                  const p = plateDefs.find((pl) => pl.weight === weight)!
                  return (
                    <div key={weight} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${p.bg}`}>
                      <span className={`text-sm font-bold ${p.fg}`}>{weight} {wl}</span>
                      {count > 1 && (
                        <span className={`text-xs font-semibold ${p.fg} opacity-75`}>× {count}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-app-muted">No plates — barbell only.</p>
            )}

            {residual !== null && residual > 0.01 && (
              <p className="text-xs text-amber-600">
                Closest achievable: {achieved} {wl} ({residual > 0 ? '+' : ''}{-residual} {wl} off). Fractional plates needed.
              </p>
            )}
          </div>
        ) : null
      )}
    </div>
  )
}

// ── Warm-up Ramp section ───────────────────────────────────────────────────────

function WarmupRamp() {
  const { units }  = useUnits()
  const wUnit      = units.weight
  const plateDefs  = wUnit === 'lbs' ? PLATES_LBS : PLATES_KG
  const defaultBar = wUnit === 'lbs' ? '45' : '20'
  const step       = wUnit === 'lbs' ? 5 : 2.5
  const wl         = weightLabel(wUnit)

  const [targetStr,  setTargetStr]  = useState('')
  const [barbellStr, setBarbellStr] = useState(defaultBar)

  const target  = parseFloat(targetStr)
  const barbell = parseFloat(barbellStr)
  const valid   = !isNaN(target) && target > barbell && !isNaN(barbell)

  const ramp = valid ? warmupRamp(target, barbell, step) : null

  return (
    <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-app-text">Warm-up Ramp</h2>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-app-muted mb-1">Working weight ({wl})</label>
          <input
            type="number" inputMode="decimal" value={targetStr}
            onChange={(e) => setTargetStr(e.target.value)}
            placeholder={wUnit === 'lbs' ? 'e.g. 265' : 'e.g. 120'}
            min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-app-muted mb-1">Barbell ({wl})</label>
          <input
            type="number" inputMode="decimal" value={barbellStr}
            onChange={(e) => setBarbellStr(e.target.value)}
            placeholder={defaultBar} min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {ramp && (
        <div className="flex flex-col gap-2">
          {ramp.map(({ pct, weight }) => {
            const plates     = calcPlatesForSide((weight - barbell) / 2, plateDefs)
            const plateChips = plates.slice(0, 4)
            return (
              <div key={pct} className="flex items-center gap-3 rounded-xl bg-app-bg border border-app-border px-3 py-2.5">
                <span className="w-10 text-xs text-app-faint font-semibold flex-none">{pct}%</span>
                <span className="w-20 text-sm font-bold text-app-text tabular-nums flex-none">{weight} {wl}</span>
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {plates.length === 0 ? (
                    <span className="text-xs text-app-faint">bar only</span>
                  ) : (
                    plateChips.map(({ weight: pw, count }) => {
                      const p = plateDefs.find((pl) => pl.weight === pw)!
                      return (
                        <span key={pw} className={`rounded-lg px-1.5 py-0.5 text-xs font-semibold ${p.bg} ${p.fg}`}>
                          {pw}×{count}
                        </span>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
          <div className="flex items-center gap-3 rounded-xl bg-accent-light border border-accent px-3 py-2.5">
            <span className="w-10 text-xs text-accent-dark font-semibold flex-none">Work</span>
            <span className="w-20 text-sm font-bold text-accent-dark tabular-nums flex-none">{target} {wl}</span>
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {calcPlatesForSide((target - barbell) / 2, plateDefs).map(({ weight: pw, count }) => {
                const p = plateDefs.find((pl) => pl.weight === pw)!
                return (
                  <span key={pw} className={`rounded-lg px-1.5 py-0.5 text-xs font-semibold ${p.bg} ${p.fg}`}>
                    {pw}×{count}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {!valid && targetStr && (
        <p className="text-xs text-app-muted">Enter a working weight greater than the barbell weight.</p>
      )}
    </div>
  )
}

// ── 1RM Calculator section ────────────────────────────────────────────────────

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]

function epley1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

function repsAtPct(pct: number): number {
  return Math.max(1, Math.round(30 * (100 / pct - 1)))
}

function OneRepMaxCalc() {
  const { units } = useUnits()
  const wUnit     = units.weight
  const wl        = weightLabel(wUnit)

  const [weightStr, setWeightStr] = useState('')
  const [repsStr,   setRepsStr]   = useState('')

  const weightDisplay = parseFloat(weightStr)
  const reps          = parseInt(repsStr, 10)
  const valid         = !isNaN(weightDisplay) && weightDisplay > 0 && !isNaN(reps) && reps >= 1 && reps <= 30

  // 1RM always calculated in kg internally
  const weightKg = valid ? displayToKg(weightDisplay, wUnit) : 0
  const e1rmKg   = valid ? epley1rm(weightKg, reps) : null

  return (
    <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-app-text">1RM Estimator</h2>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-app-muted mb-1">Weight lifted ({wl})</label>
          <input
            type="number" inputMode="decimal" value={weightStr}
            onChange={(e) => setWeightStr(e.target.value)}
            placeholder={wUnit === 'lbs' ? 'e.g. 225' : 'e.g. 100'}
            min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-app-muted mb-1">Reps done</label>
          <input
            type="number" inputMode="numeric" value={repsStr}
            onChange={(e) => setRepsStr(e.target.value)}
            placeholder="e.g. 5" min={1} max={30}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {e1rmKg && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent-dark tabular-nums">
              {kgToDisplay(Math.round(e1rmKg * 10) / 10, wUnit)} {wl}
            </span>
            <span className="text-sm text-app-muted">estimated 1RM</span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-3 text-xs text-app-faint font-medium px-1 mb-0.5">
              <span>%</span>
              <span className="text-center">Weight</span>
              <span className="text-right">~Reps</span>
            </div>
            {PERCENTAGES.map((pct) => {
              const wKg       = Math.round(e1rmKg! * (pct / 100) * 4) / 4
              const wDisp     = kgToDisplay(wKg, wUnit)
              const r         = repsAtPct(pct)
              const isWorkSet = pct === 100
              return (
                <div
                  key={pct}
                  className={[
                    'grid grid-cols-3 px-3 py-1.5 rounded-xl text-sm',
                    isWorkSet ? 'bg-accent-light border border-accent' : 'bg-app-bg',
                  ].join(' ')}
                >
                  <span className={isWorkSet ? 'font-semibold text-accent-dark' : 'text-app-muted'}>
                    {pct}%
                  </span>
                  <span className={`text-center font-bold tabular-nums ${isWorkSet ? 'text-accent-dark' : 'text-app-text'}`}>
                    {wDisp.toFixed(wDisp % 1 === 0 ? 0 : 1)} {wl}
                  </span>
                  <span className={`text-right tabular-nums ${isWorkSet ? 'text-accent-dark' : 'text-app-muted'}`}>
                    {r === 1 ? '1' : `~${r}`}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-app-faint text-center">Epley formula · best for 2–10 rep sets</p>
        </>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Calculator() {
  return (
    <div className="px-4 pt-6 pb-24 flex flex-col gap-5">
      <h1 className="text-2xl font-extrabold text-app-text">Calculator</h1>
      <PlateCalculator />
      <WarmupRamp />
      <OneRepMaxCalc />
    </div>
  )
}
