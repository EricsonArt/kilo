import type { Goal } from '../types'
import { daysBetween } from './dates'

export type Point = { date: string; kg: number }

/**
 * Smoothed weight line (time-aware exponential moving average).
 * The scale moves ±0.5 kg a day from water and food alone, so the chart shows
 * this line, not the raw readings.
 */
export function trendLine(points: Point[], alpha = 0.25): Point[] {
  let t = 0
  return points.map((p, i) => {
    if (i === 0) t = p.kg
    else {
      const gap = Math.max(1, daysBetween(points[i - 1].date, p.date))
      t += (1 - Math.pow(1 - alpha, gap)) * (p.kg - t)
    }
    return { date: p.date, kg: t }
  })
}

/**
 * Real rate of change in kg per week: a least-squares line through the last
 * `windowDays` of readings. One odd weigh-in barely moves it.
 */
export function weeklyRate(points: Point[], windowDays = 21) {
  if (points.length < 2) return null
  const last = points[points.length - 1].date
  const win = points.filter((p) => daysBetween(p.date, last) <= windowDays)
  const span = daysBetween(win[0].date, last)
  if (win.length < 2 || span === 0) return null

  const xs = win.map((p) => daysBetween(win[0].date, p.date))
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length
  const my = win.reduce((a, p) => a + p.kg, 0) / win.length
  let num = 0
  let den = 0
  win.forEach((p, i) => {
    num += (xs[i] - mx) * (p.kg - my)
    den += (xs[i] - mx) ** 2
  })
  return { rate: (num / den) * 7, span, n: win.length }
}

export type Verdict = 'learning' | 'good' | 'flat' | 'bad'
export type WeightStatus = { verdict: Verdict; rate: number | null; daysLeft: number }

const MIN_ENTRIES = 5
const MIN_SPAN = 7

/**
 * Is the user moving toward the goal?
 *
 * - `learning`: under 5 weigh-ins or under a week of data. No verdict yet.
 * - `good`: the weekly rate moves toward the goal by more than the noise band.
 * - `bad`: the rate moves against the goal by twice the band, and has done so
 *   over at least 14 days and 8 weigh-ins. Only this state is shown in red.
 * - `flat`: everything in between. Shown neutral.
 *
 * Noise band: 0.2% of body weight per week, at least 0.15 kg.
 */
export function weightStatus(points: Point[], goal: Goal): WeightStatus {
  const r = weeklyRate(points)
  if (!r || r.n < MIN_ENTRIES || r.span < MIN_SPAN) {
    const n = r?.n ?? points.length
    const span = r?.span ?? 0
    return { verdict: 'learning', rate: null, daysLeft: Math.max(MIN_ENTRIES - n, MIN_SPAN - span, 1) }
  }

  const band = Math.max(0.15, points[points.length - 1].kg * 0.002)
  const sustained = r.span >= 14 && r.n >= 8
  let verdict: Verdict

  if (goal === 'maintain') {
    const drift = Math.abs(r.rate)
    verdict = drift <= 2 * band ? 'good' : drift >= 3 * band && sustained ? 'bad' : 'flat'
  } else {
    const toward = goal === 'cut' ? -r.rate : r.rate
    verdict = toward >= band ? 'good' : toward <= -2 * band && sustained ? 'bad' : 'flat'
  }
  return { verdict, rate: r.rate, daysLeft: 0 }
}

/** Did this change move toward the goal? Single days are never judged as bad. */
export function movedToward(delta: number, goal: Goal) {
  if (goal === 'maintain' || Math.abs(delta) < 0.05) return false
  return goal === 'cut' ? delta < 0 : delta > 0
}

/** True when the newest reading is the best so far for a cut (lowest) or bulk (highest). */
export function isNewBest(points: Point[], goal: Goal) {
  if (points.length < 2 || goal === 'maintain') return false
  const cur = points[points.length - 1].kg
  const before = points.slice(0, -1).map((p) => p.kg)
  return goal === 'cut' ? cur < Math.min(...before) : cur > Math.max(...before)
}

/** 0…1 share of the way from the start weight to the goal weight. */
export function goalProgress(start: number, current: number, goal: number) {
  if (goal === start) return null
  return Math.min(1, Math.max(0, (current - start) / (goal - start)))
}
