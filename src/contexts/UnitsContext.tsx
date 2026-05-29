import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
  loadUnits, saveUnits,
  type UnitPreferences, type WeightUnit, type MeasurementUnit,
  type WaterUnit, type TemperatureUnit,
} from '../lib/units'

interface UnitsContextValue {
  units:          UnitPreferences
  setWeight:      (u: WeightUnit)      => void
  setMeasurement: (u: MeasurementUnit) => void
  setWater:       (u: WaterUnit)       => void
  setTemperature: (u: TemperatureUnit) => void
}

const UnitsContext = createContext<UnitsContextValue | null>(null)

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [units, setUnits] = useState<UnitPreferences>(loadUnits)

  const update = useCallback((patch: Partial<UnitPreferences>) => {
    setUnits((prev) => {
      const next = { ...prev, ...patch }
      saveUnits(next)
      return next
    })
  }, [])

  return (
    <UnitsContext.Provider value={{
      units,
      setWeight:      (u) => update({ weight: u }),
      setMeasurement: (u) => update({ measurement: u }),
      setWater:       (u) => update({ water: u }),
      setTemperature: (u) => update({ temperature: u }),
    }}>
      {children}
    </UnitsContext.Provider>
  )
}

export function useUnits(): UnitsContextValue {
  const ctx = useContext(UnitsContext)
  if (!ctx) throw new Error('useUnits must be inside UnitsProvider')
  return ctx
}
