import type { Unit } from '../types'

// Everything is stored in kg. These convert at the edge of the screen.
const KG_PER_LB = 0.45359237

export const toUnit = (kg: number, unit: Unit) => (unit === 'kg' ? kg : kg / KG_PER_LB)
export const fromUnit = (value: number, unit: Unit) => (unit === 'kg' ? value : value * KG_PER_LB)

/** Body weight: always one decimal. "82.4" */
export const fmtWeight = (kg: number, unit: Unit) => toUnit(kg, unit).toFixed(1)

/** Bar weight: no trailing zero. "80", "82.5" */
export const fmtLoad = (kg: number, unit: Unit) => String(Math.round(toUnit(kg, unit) * 10) / 10)

/** Signed change with a real minus sign. "−3.6", "+0.4" */
export const fmtDelta = (kg: number, unit: Unit) => {
  const v = toUnit(kg, unit)
  return `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)}`
}
