/**
 * Calculator — plate calculator + warm-up ramp.
 */

import { useState } from 'react'

// ── Plate definitions ──────────────────────────────────────────────────────────

const PLATES: Array<{ weight: number; bg: string; fg: string }> = [
  { weight: 25,   bg: 'bg-red-600',    fg: 'text-white' },
  { weight: 20,   bg: 'bg-blue-500',   fg: 'text-white' },
  { weight: 15,   bg: 'bg-amber-400',  fg: 'text-gray-900' },
  { weight: 10,   bg: 'bg-green-500',  fg: 'text-white' },
  { weight: 5,    bg: 'bg-gray-300',   fg: 'text-gray-900' },
  { weight: 2.5,  bg: 'bg-red-300',    fg: 'text-gray-900' },
  { weight: 1.25, bg: 'bg-gray-500',   fg: 'text-white' },
]

const BARBELL_PRESETS = [
  { label: '20 kg — Olympic', value: 20 },
  { label: '15 kg — Women\'s', value: 15 },
  { label: '10 kg — Junior',  value: 10 },
]

// ── Algorithms ─────────────────────────────────────────────────────────────────

function calcPlatesForSide(perSide: number): Array<{ weight: number; count: number }> {
  const result: Array<{ weight: number; count: number }> = []
  let rem = Math.round(perSide * 100)
  for (const { weight } of PLATES) {
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
): Array<{ pct: number; weight: number }> {
  return [40, 60, 80].map((pct) => {
    const raw     = (pct / 100) * workingWeight
    const rounded = Math.max(barbellWeight, Math.round(raw / 2.5) * 2.5)
    return { pct, weight: rounded }
  })
}

// ── Visual bar graphic ─────────────────────────────────────────────────────────

const PLATE_HEIGHT: Record<number, number> = {
  25: 60, 20: 54, 15: 48, 10: 40, 5: 30, 2.5: 22, 1.25: 16,
}

function BarGraphic({ plates }: { plates: Array<{ weight: number; count: number }> }) {
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
          const plate = PLATES.find((p) => p.weight === w)!
          const h = PLATE_HEIGHT[w] ?? 20
          return (
            <div
              key={i}
              className={`w-4 rounded-sm ${plate.bg}`}
              style={{ height: h }}
            />
          )
        })}
      </div>
      <div className="w-8 h-2 bg-gray-300 rounded-r-sm" />
    </div>
  )
}

// ── Plate Calculator section ───────────────────────────────────────────────────

function PlateCalculator() {
  const [targetStr,   setTargetStr]   = useState('')
  const [barbellStr,  setBarbellStr]  = useState('20')
  const [customBar,   setCustomBar]   = useState(false)

  const target  = parseFloat(targetStr)
  const barbell = parseFloat(barbellStr)

  const valid  = !isNaN(target) && target > 0 && !isNaN(barbell) && barbell >= 0
  const perSide = valid ? (target - barbell) / 2 : null

  const plates       = perSide != null && perSide >= 0 ? calcPlatesForSide(perSide) : null
  const achievedSide = plates ? plates.reduce((s, p) => s + p.weight * p.count, 0) : 0
  const achieved     = valid && plates ? achievedSide * 2 + barbell : null
  const residual     = achieved != null && valid ? Math.round((target - achieved) * 100) / 100 : null

  const impossible = perSide != null && perSide < 0

  return (
    <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-app-text">Plate Calculator</h2>

      {/* Target weight */}
      <div>
        <label className="block text-xs text-app-muted mb-1">Target weight (kg)</label>
        <input
          type="number"
          inputMode="decimal"
          value={targetStr}
          onChange={(e) => setTargetStr(e.target.value)}
          placeholder="e.g. 100"
          min={0}
          step={2.5}
          className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      {/* Barbell preset */}
      <div>
        <label className="block text-xs text-app-muted mb-1">Barbell weight</label>
        {!customBar ? (
          <div className="flex gap-2 flex-wrap">
            {BARBELL_PRESETS.map(({ label, value }) => (
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
              type="number"
              inputMode="decimal"
              value={barbellStr}
              onChange={(e) => setBarbellStr(e.target.value)}
              placeholder="kg"
              min={0}
              className="flex-1 rounded-xl border border-app-border bg-app-bg text-app-text px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={() => { setBarbellStr('20'); setCustomBar(false) }}
              className="text-xs text-app-muted active:text-app-text"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {valid && (
        impossible ? (
          <p className="text-sm text-red-500">
            Target is less than the barbell weight ({barbell} kg).
          </p>
        ) : plates ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-accent-dark tabular-nums">
                {perSide!.toFixed(perSide! % 1 === 0 ? 0 : 2)} kg
              </span>
              <span className="text-sm text-app-muted">each side</span>
            </div>

            {plates.length > 0 && <BarGraphic plates={plates} />}

            {plates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {plates.map(({ weight, count }) => {
                  const p = PLATES.find((pl) => pl.weight === weight)!
                  return (
                    <div key={weight} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${p.bg}`}>
                      <span className={`text-sm font-bold ${p.fg}`}>{weight} kg</span>
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
                Note: closest achievable is {achieved} kg ({residual > 0 ? '+' : ''}{-residual} kg off).
                You may need fractional plates.
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
  const [targetStr,  setTargetStr]  = useState('')
  const [barbellStr, setBarbellStr] = useState('20')

  const target  = parseFloat(targetStr)
  const barbell = parseFloat(barbellStr)
  const valid   = !isNaN(target) && target > barbell && !isNaN(barbell)

  const ramp = valid ? warmupRamp(target, barbell) : null

  return (
    <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-app-text">Warm-up Ramp</h2>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-app-muted mb-1">Working weight (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            value={targetStr}
            onChange={(e) => setTargetStr(e.target.value)}
            placeholder="e.g. 120"
            min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-app-muted mb-1">Barbell (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            value={barbellStr}
            onChange={(e) => setBarbellStr(e.target.value)}
            placeholder="20"
            min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {ramp && (
        <div className="flex flex-col gap-2">
          {ramp.map(({ pct, weight }) => {
            const plates     = calcPlatesForSide((weight - barbell) / 2)
            const plateChips = plates.slice(0, 4)
            return (
              <div key={pct} className="flex items-center gap-3 rounded-xl bg-app-bg border border-app-border px-3 py-2.5">
                <span className="w-10 text-xs text-app-faint font-semibold flex-none">{pct}%</span>
                <span className="w-16 text-sm font-bold text-app-text tabular-nums flex-none">{weight} kg</span>
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {plates.length === 0 ? (
                    <span className="text-xs text-app-faint">bar only</span>
                  ) : (
                    plateChips.map(({ weight: pw, count }) => {
                      const p = PLATES.find((pl) => pl.weight === pw)!
                      return (
                        <span
                          key={pw}
                          className={`rounded-lg px-1.5 py-0.5 text-xs font-semibold ${p.bg} ${p.fg}`}
                        >
                          {pw}×{count}
                        </span>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
          {/* Working set */}
          <div className="flex items-center gap-3 rounded-xl bg-accent-light border border-accent px-3 py-2.5">
            <span className="w-10 text-xs text-accent-dark font-semibold flex-none">Work</span>
            <span className="w-16 text-sm font-bold text-accent-dark tabular-nums flex-none">{target} kg</span>
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {calcPlatesForSide((target - barbell) / 2).map(({ weight: pw, count }) => {
                const p = PLATES.find((pl) => pl.weight === pw)!
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
        <p className="text-xs text-app-muted">
          Enter a working weight greater than the barbell weight.
        </p>
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
  const [weightStr, setWeightStr] = useState('')
  const [repsStr,   setRepsStr]   = useState('')

  const weight = parseFloat(weightStr)
  const reps   = parseInt(repsStr, 10)
  const valid  = !isNaN(weight) && weight > 0 && !isNaN(reps) && reps >= 1 && reps <= 30

  const e1rm = valid ? epley1rm(weight, reps) : null

  return (
    <div className="rounded-2xl bg-app-card border border-app-border p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-app-text">1RM Estimator</h2>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-app-muted mb-1">Weight lifted (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            value={weightStr}
            onChange={(e) => setWeightStr(e.target.value)}
            placeholder="e.g. 100"
            min={0}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-app-muted mb-1">Reps done</label>
          <input
            type="number"
            inputMode="numeric"
            value={repsStr}
            onChange={(e) => setRepsStr(e.target.value)}
            placeholder="e.g. 5"
            min={1}
            max={30}
            className="w-full rounded-xl border border-app-border bg-app-bg text-app-text placeholder-app-faint px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {e1rm && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent-dark tabular-nums">
              {Math.round(e1rm * 10) / 10} kg
            </span>
            <span className="text-sm text-app-muted">estimated 1RM</span>
          </div>

          {/* Percentage table */}
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-3 text-xs text-app-faint font-medium px-1 mb-0.5">
              <span>%</span>
              <span className="text-center">Weight</span>
              <span className="text-right">~Reps</span>
            </div>
            {PERCENTAGES.map((pct) => {
              const w    = Math.round(e1rm! * (pct / 100) * 4) / 4
              const r    = repsAtPct(pct)
              const isWorkSet = pct === 100
              return (
                <div
                  key={pct}
                  className={[
                    'grid grid-cols-3 px-3 py-1.5 rounded-xl text-sm',
                    isWorkSet
                      ? 'bg-accent-light border border-accent'
                      : 'bg-app-bg',
                  ].join(' ')}
                >
                  <span className={isWorkSet ? 'font-semibold text-accent-dark' : 'text-app-muted'}>
                    {pct}%
                  </span>
                  <span className={`text-center font-bold tabular-nums ${isWorkSet ? 'text-accent-dark' : 'text-app-text'}`}>
                    {w.toFixed(w % 1 === 0 ? 0 : 1)} kg
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
