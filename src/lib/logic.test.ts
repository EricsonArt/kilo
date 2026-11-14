import { describe, expect, it } from 'vitest'
import { addDays } from './dates'
import { parsePlan } from './parsePlan'
import { streak } from './streak'
import { compareSet, e1rm, liftTrend, strengthIndex } from './strength'
import { goalProgress, isNewBest, movedToward, weeklyRate, weightStatus, type Point } from './weight'

const START = '2026-09-01'
/** Daily readings: a steady weekly rate plus a repeating ±0.4 kg of water-weight noise. */
const series = (days: number, startKg: number, perWeek: number): Point[] =>
  Array.from({ length: days }, (_, i) => ({
    date: addDays(START, i),
    kg: startKg + (perWeek / 7) * i + [0.4, -0.3, 0.1, -0.4, 0.3, 0, -0.1][i % 7],
  }))

describe('weight', () => {
  it('finds the real weekly rate through daily noise', () => {
    expect(weeklyRate(series(21, 85, -0.5))!.rate).toBeCloseTo(-0.5, 1)
  })

  it('gives no verdict before a week of data', () => {
    const s = weightStatus(series(3, 85, -0.5), 'cut')
    expect(s.verdict).toBe('learning')
    expect(s.daysLeft).toBeGreaterThan(0)
  })

  it('cut: losing is good, gaining for two weeks is bad', () => {
    expect(weightStatus(series(21, 85, -0.5), 'cut').verdict).toBe('good')
    expect(weightStatus(series(21, 85, 0.6), 'cut').verdict).toBe('bad')
  })

  it('cut: a flat scale is neutral, never red', () => {
    expect(weightStatus(series(21, 85, 0), 'cut').verdict).toBe('flat')
  })

  it('cut: one week of gain is not yet a regression', () => {
    expect(weightStatus(series(8, 85, 0.6), 'cut').verdict).toBe('flat')
  })

  it('bulk mirrors cut', () => {
    expect(weightStatus(series(21, 70, 0.4), 'bulk').verdict).toBe('good')
    expect(weightStatus(series(21, 70, -0.6), 'bulk').verdict).toBe('bad')
  })

  it('maintain: steady is good, sustained drift is bad', () => {
    expect(weightStatus(series(21, 75, 0.05), 'maintain').verdict).toBe('good')
    expect(weightStatus(series(21, 75, 0.8), 'maintain').verdict).toBe('bad')
  })

  it('one heavy day after steady loss does not flip the verdict', () => {
    const pts = series(21, 85, -0.5)
    pts[pts.length - 1].kg += 1.2
    expect(weightStatus(pts, 'cut').verdict).toBe('good')
  })

  it('day-to-day colour and new bests follow the goal', () => {
    expect(movedToward(-0.3, 'cut')).toBe(true)
    expect(movedToward(0.3, 'cut')).toBe(false)
    expect(movedToward(0.3, 'bulk')).toBe(true)
    expect(movedToward(-0.3, 'maintain')).toBe(false)
    const pts = [
      { date: '2026-09-01', kg: 85 },
      { date: '2026-09-02', kg: 84.6 },
    ]
    expect(isNewBest(pts, 'cut')).toBe(true)
    expect(isNewBest(pts, 'bulk')).toBe(false)
  })

  it('goal progress is a 0–1 share', () => {
    expect(goalProgress(86, 82, 78)).toBeCloseTo(0.5)
    expect(goalProgress(86, 88, 78)).toBe(0)
    expect(goalProgress(70, 76, 75)).toBe(1)
  })
})

describe('strength', () => {
  const s = (w: number | null, r: number) => ({ w, r })

  it('more weight or more reps is progress', () => {
    expect(compareSet(s(82.5, 8), s(80, 8))).toBe('up')
    expect(compareSet(s(80, 9), s(80, 8))).toBe('up')
    expect(compareSet(s(80, 8), s(80, 8))).toBe('same')
  })

  it('more weight for fewer reps is judged by estimated one-rep max', () => {
    expect(e1rm(80, 8)).toBeCloseTo(101.33, 1)
    expect(compareSet(s(90, 6), s(80, 8))).toBe('up') // 108 vs 101.3
    expect(compareSet(s(82.5, 7), s(80, 8))).toBe('same') // within noise
    expect(compareSet(s(85, 4), s(80, 8))).toBe('down')
  })

  it('lighter weight for more total work is a shift, not a step back', () => {
    expect(compareSet(s(70, 12), s(80, 8))).toBe('shift')
    expect(compareSet(s(60, 10), s(80, 8))).toBe('down')
  })

  it('bodyweight moves compare reps', () => {
    expect(compareSet(s(null, 12), s(null, 10))).toBe('up')
    expect(compareSet(s(null, 8), s(null, 10))).toBe('down')
    expect(compareSet(s(null, 8), undefined)).toBe('first')
  })

  it('a new best session is a PR', () => {
    expect(liftTrend([[s(80, 8)], [s(80, 8)], [s(82.5, 8)]])).toBe('pr')
  })

  it('one weak session is steady, two weak sessions in a row are a regression', () => {
    const base = [[s(80, 8)], [s(80, 8)], [s(80, 8)]]
    expect(liftTrend([...base, [s(70, 8)]])).toBe('steady')
    expect(liftTrend([...base, [s(70, 8)], [s(70, 8)]])).toBe('down')
  })

  it('dropping weight but doing more work is never a regression', () => {
    const base = [[s(80, 8)], [s(80, 8)], [s(80, 8)]]
    expect(liftTrend([...base, [s(65, 15)], [s(65, 15)]])).toBe('steady')
  })

  it('strength index averages each lift against its own start', () => {
    const idx = strengthIndex([
      { date: '2026-09-01', scores: { bench: 100, squat: 150 } },
      { date: '2026-09-08', scores: { bench: 110 } },
      { date: '2026-09-15', scores: { squat: 165 } },
    ])
    expect(idx.map((p) => Math.round(p.pct))).toEqual([0, 5, 10])
  })
})

describe('streak', () => {
  const today = '2026-11-14'
  const days = (...offsets: number[]) => new Set(offsets.map((o) => addDays(today, -o)))

  it('counts consecutive days', () => {
    expect(streak(days(0, 1, 2), today)).toEqual({ count: 3, doneToday: true })
  })
  it('stays alive until today ends', () => {
    expect(streak(days(1, 2), today)).toEqual({ count: 2, doneToday: false })
  })
  it('resets after a missed day', () => {
    expect(streak(days(2, 3), today).count).toBe(0)
  })
})

describe('parsePlan', () => {
  it('reads a classic split with weights', () => {
    const { workouts, leftovers } = parsePlan(`Upper A (Mon)
Bench Press 4x8 80kg
Barbell Row 4x8 70kg
OHP 3x10 40

Lower A - Tuesday
Squat 5x5 100kg
Leg press 3x12`)
    expect(leftovers).toEqual([])
    expect(workouts.map((w) => [w.label, w.weekday])).toEqual([
      ['UPP A', 0],
      ['LOW A', 1],
    ])
    expect(workouts[0].exercises).toEqual([
      { name: 'Bench Press', sets: 4, reps: '8', kg: 80 },
      { name: 'Barbell Row', sets: 4, reps: '8', kg: 70 },
      { name: 'OHP', sets: 3, reps: '10', kg: 40 },
    ])
    expect(workouts[1].exercises[1]).toEqual({ name: 'Leg press', sets: 3, reps: '12', kg: null })
  })

  it('reads wordy, bulleted lines', () => {
    const { workouts } = parsePlan(`Monday - Chest & Triceps
1. Bench press - 4 sets x 8-10 reps @ 80 kg
2. Incline DB press: 3×10 (30kg)
- Cable fly 3x15
Tricep pushdown 3 x 12-15`)
    expect(workouts[0].label).toBe('CHEST + TRI')
    expect(workouts[0].weekday).toBe(0)
    expect(workouts[0].exercises).toEqual([
      { name: 'Bench press', sets: 4, reps: '8-10', kg: 80 },
      { name: 'Incline DB press', sets: 3, reps: '10', kg: 30 },
      { name: 'Cable fly', sets: 3, reps: '15', kg: null },
      { name: 'Tricep pushdown', sets: 3, reps: '12-15', kg: null },
    ])
  })

  it('reads logged progress: weight x reps and rep lists', () => {
    const { workouts } = parsePlan(`Day 1
Squat: 100kg 5,5,5
Deadlift 140 x 5
Bench 80x8, 80x8, 80x7
Pull ups 3xAMRAP
Plank 3x60s
Curl 4x12 RPE 8`)
    expect(workouts[0].label).toBe('1')
    expect(workouts[0].exercises).toEqual([
      { name: 'Squat', sets: 3, reps: '5', kg: 100 },
      { name: 'Deadlift', sets: 3, reps: '5', kg: 140 },
      { name: 'Bench', sets: 3, reps: '7-8', kg: 80 },
      { name: 'Pull ups', sets: 3, reps: 'AMRAP', kg: null },
      { name: 'Plank', sets: 3, reps: '60s', kg: null },
      { name: 'Curl', sets: 4, reps: '12', kg: null },
    ])
  })

  it('reads Polish plans', () => {
    const { workouts } = parsePlan(`Poniedziałek: klatka + triceps
Wyciskanie sztangi leżąc 4x8 82,5kg
Rozpiętki 3 serie po 12

Środa: nogi
Przysiad 5x5 100 kg`)
    expect(workouts.map((w) => [w.label, w.weekday])).toEqual([
      ['KLATKA + TRI', 0],
      ['NOGI', 2],
    ])
    expect(workouts[0].exercises[0]).toEqual({ name: 'Wyciskanie sztangi leżąc', sets: 4, reps: '8', kg: 82.5 })
    expect(workouts[0].exercises[1]).toEqual({ name: 'Rozpiętki', sets: 3, reps: '12', kg: null })
  })

  it('splits a plan with no headers by blank lines', () => {
    const { workouts } = parsePlan(`Bench 4x8
Row 4x8

Squat 5x5
Leg curl 3x12`)
    expect(workouts.map((w) => w.label)).toEqual(['1', '2'])
    expect(workouts[1].exercises[0].name).toBe('Squat')
  })

  it('keeps exercise names that sound like split names', () => {
    const { workouts } = parsePlan(`Push
Bench press
Leg press
Pull ups
Pull
Rows`)
    expect(workouts.map((w) => w.label)).toEqual(['PUSH', 'PULL'])
    expect(workouts[0].exercises.map((e) => e.name)).toEqual(['Bench press', 'Leg press', 'Pull ups'])
  })

  it('converts pounds and sets notes aside', () => {
    const { workouts, leftovers } = parsePlan(`Upper
Bench 4x8 185lbs
Note: go slow on the way down
Wednesday: Rest`)
    expect(workouts[0].exercises[0].kg).toBeCloseTo(83.91, 1)
    expect(leftovers).toEqual(['Note: go slow on the way down'])
    expect(workouts).toHaveLength(1)
  })

  it('labels repeated split names A and B', () => {
    const { workouts } = parsePlan(`Upper\nBench 4x8\nLower\nSquat 5x5\nUpper\nOHP 3x10\nLower\nDeadlift 3x5`)
    expect(workouts.map((w) => w.label)).toEqual(['UPP A', 'LOW A', 'UPP B', 'LOW B'])
  })
})
