/**
 * Calculator — plate calculator + warm-up ramp.
 *
 * Plate calculator: enter a target total weight and barbell weight;
 * shows exactly which plates to load on each side.
 *
 * Warm-up ramp: for the same weight, shows suggested warm-up sets at
 * 40 / 60 / 80 % of the working weight, rounded to the nearest 2.5 kg.
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
  // Work in integer hundredths to avoid float imprecision
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
    // Round to nearest 2.5 kg; never less than barbell alone
    const rounded = Math.max(barbellWeight, Math.round(raw / 2.5) * 2.5)
    return { pct, weight: rounded }
  })
}

// ── Visual bar graphic ─────────────────────────────────────────────────────────
// Shows plates as vertical rectangles on one side of the bar, heaviest on outside.

const PLATE_HEIGHT: Record<number, number> = {
  25: 60, 20: 54, 15: 48, 10: 40, 5: 30, 2.5: 22, 1.25: 16,
}

function BarGraphic({ plates }: { plates: Array<{ weight: number; count: number }> }) {
  // Flatten to individual plates, lightest closest to the bar (right end)
  const individual = plates.flatMap(({ weight, count }) =>
    Array.from({ length: count }, () => weight)
  )
  // Reverse so heaviest is outermost (leftmost in our right-side view)
  const ordered = [...individual].reverse()

  return (
    <div className="flex items-center gap-0 my-2" aria-hidden>
      {/* Left sleeve stub */}
      <div className="w-6 h-2 bg-gray-600 rounded-l-full" />
      {/* Bar */}
      <div className="flex-1 h-2 bg-gray-500" />
      {/* Plates — lightest innermost (right side) */}
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
      {/* Right sleeve */}
      <div className="w-8 h-2 bg-gray-400 rounded-r-sm" />
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
    <div className="rounded-2xl bg-gray-800/60 p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-white">Plate Calculator</h2>

      {/* Target weight */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Target weight (kg)</label>
        <input
          type="number"
          inputMode="decimal"
          value={targetStr}
          onChange={(e) => setTargetStr(e.target.value)}
          placeholder="e.g. 100"
          min={0}
          step={2.5}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-600 px-3 py-2.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
      </div>

      {/* Barbell preset */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Barbell weight</label>
        {!customBar ? (
          <div className="flex gap-2 flex-wrap">
            {BARBELL_PRESETS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => { setBarbellStr(String(value)); setCustomBar(false) }}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold',
                  parseFloat(barbellStr) === value && !customBar
                    ? 'bg-lime-400 text-gray-900'
                    : 'bg-gray-700 text-gray-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setCustomBar(true)}
              className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-gray-700 text-gray-400"
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
              className="flex-1 rounded-xl border border-gray-700 bg-gray-900 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-400"
            />
            <button
              onClick={() => { setBarbellStr('20'); setCustomBar(false) }}
              className="text-xs text-gray-500 active:text-gray-300"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {valid && (
        impossible ? (
          <p className="text-sm text-red-400">
            Target is less than the barbell weight ({barbell} kg).
          </p>
        ) : plates ? (
          <div className="flex flex-col gap-3">
            {/* Per-side summary */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-lime-400 tabular-nums">
                {perSide!.toFixed(perSide! % 1 === 0 ? 0 : 2)} kg
              </span>
              <span className="text-sm text-gray-400">each side</span>
            </div>

            {/* Bar graphic */}
            {plates.length > 0 && <BarGraphic plates={plates} />}

            {/* Plate chips */}
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
              <p className="text-sm text-gray-400">No plates — barbell only.</p>
            )}

            {/* Residual warning */}
            {residual !== null && residual > 0.01 && (
              <p className="text-xs text-amber-400">
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
    <div className="rounded-2xl bg-gray-800/60 p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-white">Warm-up Ramp</h2>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Working weight (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            value={targetStr}
            onChange={(e) => setTargetStr(e.target.value)}
            placeholder="e.g. 120"
            min={0}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-gray-400 mb-1">Barbell (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            value={barbellStr}
            onChange={(e) => setBarbellStr(e.target.value)}
            placeholder="20"
            min={0}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
      </div>

      {ramp && (
        <div className="flex flex-col gap-2">
          {ramp.map(({ pct, weight }) => {
            const plates     = calcPlatesForSide((weight - barbell) / 2)
            const plateChips = plates.slice(0, 4) // show max 4 plate types to keep it concise
            return (
              <div key={pct} className="flex items-center gap-3 rounded-xl bg-gray-900 px-3 py-2.5">
                <span className="w-10 text-xs text-gray-500 font-semibold flex-none">{pct}%</span>
                <span className="w-16 text-sm font-bold text-white tabular-nums flex-none">{weight} kg</span>
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {plates.length === 0 ? (
                    <span className="text-xs text-gray-500">bar only</span>
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
          <div className="flex items-center gap-3 rounded-xl bg-lime-400/10 border border-lime-400/20 px-3 py-2.5">
            <span className="w-10 text-xs text-lime-400 font-semibold flex-none">Work</span>
            <span className="w-16 text-sm font-bold text-lime-400 tabular-nums flex-none">{target} kg</span>
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
        <p className="text-xs text-gray-500">
          Enter a working weight greater than the barbell weight.
        </p>
      )}
    </div>
  )
}

// ── 1RM Calculator section ────────────────────────────────────────────────────
// Uses the Epley formula: e1RM = weight × (1 + reps / 30)

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]

function epley1rm(weight: number, reps: number): number {
  return weight * (1 + reps / 30)
}

// Reps at a given fraction derived by inverting Epley (min 1)
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
    <div className="rounded-2xl bg-gray-800/60 p-4 flex flex-col gap-4">
      <h2 className="text-base font-bold text-white">1RM Estimator</h2>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Weight lifted (kg)</label>
          <input
            type="number"
            inputMode="decimal"
            value={weightStr}
            onChange={(e) => setWeightStr(e.target.value)}
            placeholder="e.g. 100"
            min={0}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs text-gray-400 mb-1">Reps done</label>
          <input
            type="number"
            inputMode="numeric"
            value={repsStr}
            onChange={(e) => setRepsStr(e.target.value)}
            placeholder="e.g. 5"
            min={1}
            max={30}
            className="w-full rounded-xl border border-gray-700 bg-gray-900 text-white placeholder-gray-600 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-lime-400"
          />
        </div>
      </div>

      {e1rm && (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-lime-400 tabular-nums">
              {Math.round(e1rm * 10) / 10} kg
            </span>
            <span className="text-sm text-gray-400">estimated 1RM</span>
          </div>

          {/* Percentage table */}
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-3 text-xs text-gray-500 font-medium px-1 mb-0.5">
              <span>%</span>
              <span className="text-center">Weight</span>
              <span className="text-right">~Reps</span>
            </div>
            {PERCENTAGES.map((pct) => {
              const w    = Math.round(e1rm! * (pct / 100) * 4) / 4  // nearest 0.25 kg
              const r    = repsAtPct(pct)
              const isWorkSet = pct === 100
              return (
                <div
                  key={pct}
                  className={[
                    'grid grid-cols-3 px-3 py-1.5 rounded-xl text-sm',
                    isWorkSet
                      ? 'bg-lime-400/10 border border-lime-400/20'
                      : 'bg-gray-900',
                  ].join(' ')}
                >
                  <span className={isWorkSet ? 'font-semibold text-lime-400' : 'text-gray-400'}>
                    {pct}%
                  </span>
                  <span className={`text-center font-bold tabular-nums ${isWorkSet ? 'text-lime-400' : 'text-white'}`}>
                    {w.toFixed(w % 1 === 0 ? 0 : 1)} kg
                  </span>
                  <span className={`text-right tabular-nums ${isWorkSet ? 'text-lime-400' : 'text-gray-400'}`}>
                    {r === 1 ? '1' : `~${r}`}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-600 text-center">Epley formula · best for 2–10 rep sets</p>
        </>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Calculator() {
  return (
    <div className="px-4 pt-6 pb-24 flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-white">Calculator</h1>
      <PlateCalculator />
      <WarmupRamp />
      <OneRepMaxCalc />
    </div>
  )
}
