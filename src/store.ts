import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { DayLog, Goal, Session, SetVal, Unit, Workout } from './types'
import { uid } from './lib/id'
import type { Point } from './lib/weight'

export type Data = {
  goal: Goal | null
  goalKg: number | null
  unit: Unit
  onboarded: boolean
  days: Record<string, DayLog>
  trainDays: number[]
  plan: Workout[] | null
  sessions: Session[]
}

type Actions = {
  patch(p: Partial<Data>): void
  /** Merge into one day. A field set to `undefined` is removed. */
  logDay(date: string, p: Partial<DayLog>): void
  logSet(date: string, workoutId: string, exercise: string, index: number, val: SetVal): void
  finish(date: string, workoutId: string): void
}

export const emptyData: Data = {
  goal: null,
  goalKg: null,
  unit: 'kg',
  onboarded: false,
  days: {},
  trainDays: [],
  plan: null,
  sessions: [],
}

// Each account keeps its own data on this device. Writes are off while no one is signed in.
let userKey: string | null = null
const scoped: StateStorage = {
  getItem: (name) => (userKey ? localStorage.getItem(`${name}:${userKey}`) : null),
  setItem: (name, value) => {
    if (userKey) localStorage.setItem(`${name}:${userKey}`, value)
  },
  removeItem: (name) => {
    if (userKey) localStorage.removeItem(`${name}:${userKey}`)
  },
}

export const useStore = create<Data & Actions>()(
  persist(
    (set) => ({
      ...emptyData,
      patch: (p) => set(p),

      logDay: (date, p) =>
        set((s) => {
          const day: DayLog = { ...s.days[date], ...p }
          for (const k of Object.keys(day) as (keyof DayLog)[]) if (day[k] === undefined) delete day[k]
          const days = { ...s.days }
          if (Object.keys(day).length) days[date] = day
          else delete days[date]
          return { days }
        }),

      logSet: (date, workoutId, exercise, index, val) =>
        set((s) => {
          const found = s.sessions.find((x) => x.date === date && x.workoutId === workoutId)
          const session: Session = found ?? {
            id: uid(),
            date,
            workoutId,
            sets: {},
            finished: false,
          }
          const rows = [...(session.sets[exercise] ?? [])]
          while (rows.length <= index) rows.push({ w: null, r: null })
          rows[index] = val
          const next = { ...session, sets: { ...session.sets, [exercise]: rows } }
          return { sessions: found ? s.sessions.map((x) => (x === found ? next : x)) : [...s.sessions, next] }
        }),

      finish: (date, workoutId) =>
        set((s) => ({
          sessions: s.sessions.map((x) =>
            x.date === date && x.workoutId === workoutId ? { ...x, finished: true } : x,
          ),
        })),
    }),
    { name: 'kilo', version: 1, storage: createJSONStorage(() => scoped), skipHydration: true },
  ),
)

/** Switch the store to one account's data (or to nothing when signed out). */
export async function openUser(key: string | null) {
  userKey = null
  useStore.setState(emptyData)
  userKey = key
  if (key) await useStore.persist.rehydrate()
}

// ---- derived data -------------------------------------------------------

export const weightPoints = (days: Data['days']): Point[] =>
  Object.keys(days)
    .filter((k) => days[k].kg != null)
    .sort()
    .map((date) => ({ date, kg: days[date].kg! }))

export const photoDays = (days: Data['days']) =>
  Object.keys(days)
    .filter((k) => days[k].media)
    .sort()

export const hasLoggedSet = (s: Session) =>
  Object.values(s.sets).some((rows) => rows.some((r) => r.r != null))

/** Every day with any activity: a weigh-in, calories, a photo or a workout. */
export const activeDays = (d: Pick<Data, 'days' | 'sessions'>) =>
  new Set([...Object.keys(d.days), ...d.sessions.filter(hasLoggedSet).map((s) => s.date)])

/** Exercises are matched across sessions by name, so history survives plan edits. */
export const exerciseKey = (name: string) => name.trim().toLowerCase()
