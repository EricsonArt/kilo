import type { SetVal } from '../types'

/**
 * Estimated one-rep max (Epley). Puts "more weight, fewer reps" and
 * "less weight, more reps" on one scale. Reps are capped at 15 because the
 * formula stops being meaningful beyond that.
 */
export const e1rm = (w: number, r: number) => (r <= 0 ? 0 : w * (1 + Math.min(r, 15) / 30))

export type SetVerdict = 'first' | 'up' | 'same' | 'shift' | 'down'

/**
 * Compare a set with the same set from last time.
 *
 * - `up`: more weight and/or more reps with nothing given up, or a trade-off
 *   that is at least 1% stronger by estimated one-rep max.
 * - `same`: identical, or a trade-off within noise (−3% … +1%).
 * - `shift`: lighter weight but more total work. A different rep range, not a step back.
 * - `down`: less on both, or more than 3% weaker with no extra work.
 *
 * Only `up` is coloured while typing. A single weaker set is never shown red.
 */
export function compareSet(cur: SetVal, prev: SetVal | undefined): SetVerdict {
  if (cur.r == null || !prev || prev.r == null) return 'first'
  const cw = cur.w ?? 0
  const pw = prev.w ?? 0
  const cr = cur.r
  const pr = prev.r

  if (cw === pw && cr === pr) return 'same'
  if (cw >= pw && cr >= pr) return 'up'
  if (cw <= pw && cr <= pr) return 'down'
  if (cw === 0 || pw === 0) return 'shift' // bodyweight vs weighted: not comparable

  const ratio = e1rm(cw, cr) / e1rm(pw, pr)
  if (ratio >= 1.01) return 'up'
  if (ratio > 0.97) return 'same'
  return cw * cr > pw * pr ? 'shift' : 'down'
}

const logged = (sets: SetVal[]) => sets.filter((s) => s.r != null && s.r > 0)

/** Best set of a session: top estimated one-rep max, or top reps for bodyweight moves. */
export function sessionScore(sets: SetVal[]) {
  return logged(sets).reduce((best, s) => Math.max(best, s.w ? e1rm(s.w, s.r!) : s.r!), 0)
}

/** Total work of a session: weight × reps, or reps alone for bodyweight moves. */
export function sessionVolume(sets: SetVal[]) {
  return logged(sets).reduce((sum, s) => sum + (s.w ? s.w * s.r! : s.r!), 0)
}

export type LiftTrend = 'none' | 'pr' | 'up' | 'steady' | 'down'

/**
 * Trend of one exercise across sessions (oldest first, current last).
 *
 * `down` is the only red state and needs all of:
 *   - at least 4 sessions of history,
 *   - the last TWO sessions both more than 5% under the best of the three before them,
 *   - and both with less total work than those sessions averaged.
 * So one bad day, a deload, or a switch to lighter weight for more reps never counts.
 */
export function liftTrend(history: SetVal[][]): LiftTrend {
  const sessions = history.filter((s) => sessionScore(s) > 0)
  const score = sessions.map(sessionScore)
  const n = score.length
  if (n < 2) return 'none'

  if (score[n - 1] > Math.max(...score.slice(0, -1))) return 'pr'
  if (score[n - 1] >= score[n - 2] * 1.01) return 'up'

  if (n >= 4) {
    const ref = sessions.slice(Math.max(0, n - 5), n - 2)
    const refBest = Math.max(...ref.map(sessionScore))
    const refVolume = ref.reduce((a, s) => a + sessionVolume(s), 0) / ref.length
    const weak = (i: number) => score[i] < refBest * 0.95 && sessionVolume(sessions[i]) < refVolume
    if (weak(n - 1) && weak(n - 2)) return 'down'
  }
  return 'steady'
}

/**
 * One number for overall strength: the average of every exercise's best score
 * relative to its own first session. Returns percent change per workout date.
 */
export function strengthIndex(days: { date: string; scores: Record<string, number> }[]) {
  const base: Record<string, number> = {}
  const latest: Record<string, number> = {}
  return days.map(({ date, scores }) => {
    for (const [key, s] of Object.entries(scores)) {
      if (s <= 0) continue
      base[key] ??= s
      latest[key] = s
    }
    const keys = Object.keys(latest)
    const avg = keys.reduce((a, k) => a + latest[k] / base[k], 0) / (keys.length || 1)
    return { date, pct: keys.length ? (avg - 1) * 100 : 0 }
  })
}
