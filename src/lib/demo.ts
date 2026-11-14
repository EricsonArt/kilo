import { emptyData, exerciseKey, useStore, type Data } from '../store'
import type { Media, Session, SetVal, Workout } from '../types'
import { addDays, dayKey, weekdayOf } from './dates'
import { uid } from './id'
import { saveBlob } from './media'

// Sample data so the app can be seen "in use" without ten weeks of logging:
// a cut from 86 kg, an upper/lower plan, and eight weeks of sessions.
// Today is left empty on purpose, so the first thing to try is logging it.

const DAYS = 74

/** A plain placeholder figure, slimmer when `slim` is higher. Stands in for a real photo. */
async function figure(slim: number): Promise<Media> {
  const c = document.createElement('canvas')
  c.width = 480
  c.height = 640
  const g = c.getContext('2d')!
  const bg = g.createLinearGradient(0, 0, 0, 640)
  bg.addColorStop(0, '#ececf0')
  bg.addColorStop(1, '#d6d6dc')
  g.fillStyle = bg
  g.fillRect(0, 0, 480, 640)
  g.fillStyle = '#b9b9c1'
  g.beginPath()
  g.arc(240, 170, 54, 0, Math.PI * 2)
  g.fill()
  const half = 118 - slim * 22
  g.beginPath()
  g.roundRect(240 - half, 250, half * 2, 430, 70)
  g.fill()
  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), 'image/jpeg', 0.85))
  const id = uid()
  await saveBlob(id, blob)
  await saveBlob(`${id}-thumb`, blob)
  return { id, kind: 'image', thumb: `${id}-thumb` }
}

export async function loadDemo() {
  const today = dayKey()
  let seed = 11
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647

  const days: Data['days'] = {}
  for (let i = DAYS; i >= 1; i--) {
    if (i > 12 && i < DAYS && rand() < 0.14) continue // a few missed days, none recently
    const trend = 86 - (3.4 * (DAYS - i)) / DAYS
    days[addDays(today, -i)] = {
      kg: Math.round((trend + (i === DAYS ? 0 : (rand() - 0.5) * 0.9)) * 10) / 10,
      kcal: Math.round((2050 + (rand() - 0.5) * 500) / 10) * 10,
    }
  }
  days[addDays(today, -DAYS)].media = await figure(0)
  days[addDays(today, -2)].media = await figure(1)

  // Four training days a week, arranged so that today is a training day.
  const wd = weekdayOf(today)
  const slots = [0, 2, 4, 5].map((o) => (wd + o) % 7)
  const make = (label: string, weekday: number, list: [string, number, string, number | null][]): Workout => ({
    id: uid(),
    name: label,
    label,
    weekday,
    exercises: list.map(([name, sets, reps, kg]) => ({ id: uid(), name, sets, reps, kg })),
  })
  const plan = [
    make('UPP A', slots[0], [
      ['Bench press', 4, '8', 70],
      ['Barbell row', 4, '8', 60],
      ['Overhead press', 3, '10', 40],
      ['Pull-ups', 3, '8', null],
    ]),
    make('LOW A', slots[1], [
      ['Squat', 5, '5', 90],
      ['Romanian deadlift', 3, '8', 80],
      ['Leg curl', 3, '12', 35],
    ]),
    make('UPP B', slots[2], [
      ['Incline dumbbell press', 4, '10', 26],
      ['Lat pulldown', 4, '10', 55],
      ['Lateral raise', 3, '15', 8],
    ]),
    make('LOW B', slots[3], [
      ['Deadlift', 3, '5', 120],
      ['Leg press', 4, '10', 140],
      ['Calf raise', 4, '12', 60],
    ]),
  ]

  const sessions: Session[] = []
  for (let i = 56; i >= 1; i--) {
    const date = addDays(today, -i)
    const workout = plan.find((w) => w.weekday === weekdayOf(date))
    if (!workout) continue
    const week = Math.floor((56 - i) / 7)
    const sets: Record<string, SetVal[]> = {}
    for (const ex of workout.exercises) {
      const reps = parseInt(ex.reps)
      // One lift goes backwards for its last two sessions, to show how a real regression looks.
      const slipping = ex.name === 'Overhead press' && week >= 6
      const step = ex.kg == null ? 0 : ex.kg >= 80 ? 5 : ex.kg >= 30 ? 2.5 : 1
      const w = ex.kg == null ? null : ex.kg + step * Math.floor(week / 2) - (slipping ? step * 3 : 0)
      sets[exerciseKey(ex.name)] = Array.from({ length: ex.sets }, (_, k) => ({
        w,
        r: reps + (week % 2) - (k === ex.sets - 1 ? 1 : 0) - (slipping ? 2 : 0),
      }))
    }
    sessions.push({ id: uid(), date, workoutId: workout.id, sets, finished: true })
  }

  useStore.setState({
    ...emptyData,
    goal: 'cut',
    goalKg: 80,
    onboarded: true,
    days,
    trainDays: [...slots].sort(),
    plan,
    sessions,
  })
}
