import { addDays } from './dates'

/**
 * Days in a row with any log. A day not yet logged today does not break the
 * streak; it only shows as "not done yet".
 */
export function streak(active: Set<string>, today: string) {
  const doneToday = active.has(today)
  let count = 0
  for (let d = doneToday ? today : addDays(today, -1); active.has(d); d = addDays(d, -1)) count++
  return { count, doneToday }
}

export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365]
