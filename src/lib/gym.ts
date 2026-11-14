import { exerciseKey, hasLoggedSet } from '../store'
import type { Exercise, Session, SetVal, Workout } from '../types'
import { weekdayOf } from './dates'
import { uid } from './id'
import type { ParsedWorkout } from './parsePlan'
import { compareSet, liftTrend, sessionScore, sessionVolume, strengthIndex } from './strength'

const byDate = (a: Session, b: Session) => a.date.localeCompare(b.date)
export const isLogged = (rows?: SetVal[]) => !!rows?.some((r) => r.r != null)

/** Give parsed workouts ids. A plan without weekdays takes the user's training days in order. */
export function buildPlan(parsed: ParsedWorkout[], trainDays: number[]): Workout[] {
  const days = [...trainDays].sort()
  const spread = parsed.every((w) => w.weekday == null) && parsed.length === days.length
  return parsed.map((w, i) => ({
    id: uid(),
    name: w.name,
    label: w.label,
    weekday: spread ? days[i] : w.weekday,
    exercises: w.exercises.map((e) => ({ id: uid(), ...e })),
  }))
}

/** The numbers pasted with the plan. They act as "last time" until a real session exists. */
function seedSets(ex: Exercise): SetVal[] {
  const r = parseInt(ex.reps) || null
  if (ex.kg == null && r == null) return []
  return Array.from({ length: ex.sets }, () => ({ w: ex.kg, r }))
}

/**
 * What to compare an exercise against.
 * `prev`: the sets from the last time this workout was done (else any workout
 * with this exercise, else the pasted plan). `history`: every earlier session.
 */
export function exerciseHistory(sessions: Session[], workoutId: string, ex: Exercise, date: string) {
  const key = exerciseKey(ex.name)
  const past = sessions.filter((s) => s.date < date && isLogged(s.sets[key])).sort(byDate)
  const same = past.filter((s) => s.workoutId === workoutId)
  const last = same[same.length - 1] ?? past[past.length - 1]
  const seed = seedSets(ex)
  return {
    prev: last ? last.sets[key] : seed,
    history: [...(isLogged(seed) ? [seed] : []), ...past.map((s) => s.sets[key])],
  }
}

/**
 * The workout to open with, so the user never has to pick:
 * the one already started today, else the one planned for this weekday, else
 * the next planned day, else the next in rotation after the last session.
 */
export function suggestWorkout(plan: Workout[], sessions: Session[], today: string) {
  const done = sessions.filter(hasLoggedSet).sort(byDate)
  const last = done[done.length - 1]
  const started = last?.date === today && plan.find((w) => w.id === last.workoutId)
  if (started) return started

  const wd = weekdayOf(today)
  const dated = plan.filter((w) => w.weekday != null)
  const ahead = (w: Workout) => (w.weekday! - wd + 7) % 7
  if (dated.length) return [...dated].sort((a, b) => ahead(a) - ahead(b))[0]

  const i = last ? plan.findIndex((w) => w.id === last.workoutId) : -1
  return plan[(i + 1) % plan.length]
}

/** Summary shown when a workout is finished. */
export function sessionStats(workout: Workout, sessions: Session[], session: Session) {
  let improved = 0
  let prs = 0
  let volume = 0
  let before = 0
  for (const ex of workout.exercises) {
    const rows = session.sets[exerciseKey(ex.name)]
    if (!isLogged(rows)) continue
    const { prev, history } = exerciseHistory(sessions, workout.id, ex, session.date)
    improved += rows.filter((r, i) => r.r != null && compareSet(r, prev[i]) === 'up').length
    if (liftTrend([...history, rows]) === 'pr') prs++
    volume += sessionVolume(rows)
    before += sessionVolume(prev)
  }
  return { improved, prs, volume: before > 0 ? Math.round((volume / before - 1) * 100) : null }
}

/** Overall strength change (percent) after each workout day. */
export function strengthSeries(sessions: Session[]) {
  const days = new Map<string, Record<string, number>>()
  for (const s of [...sessions].sort(byDate))
    for (const [key, rows] of Object.entries(s.sets)) {
      const score = sessionScore(rows)
      if (score <= 0) continue
      const day = days.get(s.date) ?? {}
      day[key] = Math.max(day[key] ?? 0, score)
      days.set(s.date, day)
    }
  return strengthIndex([...days].map(([date, scores]) => ({ date, scores })))
}
