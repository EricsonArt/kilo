import { dayKey } from './lib/dates'
import { deleteMedia, pickFile, saveMedia } from './lib/media'
import { celebrate, pop, tick, toast } from './lib/reward'
import { MILESTONES, streak } from './lib/streak'
import { fmtWeight, fromUnit } from './lib/units'
import { isNewBest } from './lib/weight'
import { activeDays, photoDays, useStore, weightPoints } from './store'

// Logging actions. Each one saves, then gives feedback sized to what happened.
// Logging is always acknowledged, whatever the number: the habit is the win.

export const currentStreak = () => streak(activeDays(useStore.getState()), dayKey())

/** level 0 = saved, 1 = improved, 2 = milestone. A streak milestone outranks everything. */
function reward(before: ReturnType<typeof currentStreak>, text: string, level: 0 | 1 | 2) {
  const now = currentStreak()
  const extended = !before.doneToday && now.doneToday
  if (extended && MILESTONES.includes(now.count)) {
    celebrate()
    toast(`${now.count}-day streak`, true)
    return
  }
  if (level === 2) celebrate()
  else if (level === 1) pop()
  else tick()
  toast(level === 0 && extended && now.count > 1 ? `${now.count} days in a row` : text, level > 0)
}

/** `value` is in the user's unit. Null clears the day's weight. */
export function logWeight(date: string, value: number | null) {
  const s = useStore.getState()
  const old = s.days[date]?.kg
  if (value == null) {
    if (old != null) s.logDay(date, { kg: undefined })
    return
  }
  const kg = fromUnit(value, s.unit)
  if (kg < 20 || kg > 400) return toast('That number looks off.')
  if (old != null && Math.abs(old - kg) < 0.005) return

  const before = currentStreak()
  s.logDay(date, { kg })
  if (date !== dayKey()) return toast('Saved')

  const points = weightPoints(useStore.getState().days)
  const goal = s.goal ?? 'maintain'
  if (points.length === 1) reward(before, 'Day 1. Here we go.', 2)
  else if (points[points.length - 1].date === date && isNewBest(points, goal))
    reward(before, `${goal === 'cut' ? 'New low' : 'New high'} · ${fmtWeight(kg, s.unit)} ${s.unit}`, 1)
  else reward(before, 'Logged', 0)
}

export function logKcal(date: string, kcal: number | null) {
  const s = useStore.getState()
  if ((s.days[date]?.kcal ?? null) === kcal) return
  const before = currentStreak()
  s.logDay(date, { kcal: kcal ?? undefined })
  if (kcal == null) return
  if (date === dayKey()) reward(before, 'Logged', 0)
  else toast('Saved')
}

/** Open the camera or library and attach the result to a day. */
export async function addPhoto(date: string) {
  const file = await pickFile('image/*,video/*')
  if (!file) return
  try {
    const s = useStore.getState()
    const first = photoDays(s.days).length === 0
    const old = s.days[date]?.media
    const before = currentStreak()
    const media = await saveMedia(file)
    s.logDay(date, { media })
    if (old) deleteMedia(old)
    if (first) reward(before, 'Day 1 photo saved', 2)
    else if (date === dayKey()) reward(before, 'Photo saved', 1)
    else toast('Saved')
  } catch {
    toast('Could not read that file.')
  }
}

export function removePhoto(date: string) {
  const s = useStore.getState()
  const media = s.days[date]?.media
  if (!media) return
  s.logDay(date, { media: undefined })
  deleteMedia(media)
}
