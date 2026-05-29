export type WeightUnit      = 'kg'  | 'lbs'
export type MeasurementUnit = 'cm'  | 'in'
export type WaterUnit       = 'ml'  | 'fl_oz'
export type TemperatureUnit = 'c'   | 'f'   // for future use

export interface UnitPreferences {
  weight:      WeightUnit
  measurement: MeasurementUnit
  water:       WaterUnit
  temperature: TemperatureUnit
}

const KEY = 'drovik:units'
export const UNIT_DEFAULTS: UnitPreferences = {
  weight: 'kg', measurement: 'cm', water: 'ml', temperature: 'c',
}

export function loadUnits(): UnitPreferences {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...UNIT_DEFAULTS, ...JSON.parse(raw) } : UNIT_DEFAULTS
  } catch { return UNIT_DEFAULTS }
}
export function saveUnits(u: UnitPreferences): void {
  localStorage.setItem(KEY, JSON.stringify(u))
}

// ── Weight ────────────────────────────────────────────────────────────────────
const KG_TO_LBS = 2.20462

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? Math.round(kg * KG_TO_LBS * 10) / 10 : kg
}
export function displayToKg(val: number, unit: WeightUnit): number {
  return unit === 'lbs' ? Math.round((val / KG_TO_LBS) * 100) / 100 : val
}
export function weightLabel(unit: WeightUnit): string {
  return unit === 'lbs' ? 'lbs' : 'kg'
}
export function fmtWeight(kg: number, unit: WeightUnit): string {
  return `${kgToDisplay(kg, unit)} ${weightLabel(unit)}`
}
// Volume sums (set weight × reps)
export function fmtVolume(kg: number, unit: WeightUnit): string {
  if (unit === 'lbs') {
    const lbs = kg * KG_TO_LBS
    if (lbs >= 2000) return `${+(lbs / 2000).toFixed(1)}k lbs`
    return `${Math.round(lbs)} lbs`
  }
  if (kg >= 1000) return `${+(kg / 1000).toFixed(1)}t`
  return `${Math.round(kg)} kg`
}

// ── Measurement ───────────────────────────────────────────────────────────────
export function cmToDisplay(cm: number, unit: MeasurementUnit): number {
  return unit === 'in' ? Math.round(cm * 0.393701 * 10) / 10 : cm
}
export function displayToCm(val: number, unit: MeasurementUnit): number {
  return unit === 'in' ? Math.round((val / 0.393701) * 10) / 10 : val
}
export function measurementLabel(unit: MeasurementUnit): string {
  return unit === 'in' ? 'in' : 'cm'
}

// ── Water ─────────────────────────────────────────────────────────────────────
const ML_TO_FLOZ = 0.033814
export function mlToDisplay(ml: number, unit: WaterUnit): number {
  return unit === 'fl_oz' ? Math.round(ml * ML_TO_FLOZ * 10) / 10 : ml
}
export function displayToMl(val: number, unit: WaterUnit): number {
  return unit === 'fl_oz' ? Math.round(val / ML_TO_FLOZ) : val
}
export function waterLabel(unit: WaterUnit): string {
  return unit === 'fl_oz' ? 'fl oz' : 'ml'
}

// ── Temperature ───────────────────────────────────────────────────────────────
export function celsiusToDisplay(c: number, unit: TemperatureUnit): number {
  return unit === 'f' ? Math.round((c * 9/5 + 32) * 10) / 10 : c
}
export function temperatureLabel(unit: TemperatureUnit): string {
  return unit === 'f' ? '°F' : '°C'
}
