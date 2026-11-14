export type Goal = 'cut' | 'bulk' | 'maintain'
export type Unit = 'kg' | 'lb'

/** A photo or video. Blobs live in IndexedDB under `id` and `thumb`. */
export type Media = { id: string; kind: 'image' | 'video'; thumb: string }

/** One calendar day. Weight is always stored in kg. */
export type DayLog = { kg?: number; kcal?: number; media?: Media }

/** One set. `w` is kg (null or 0 = bodyweight). A set counts once `r` is set. */
export type SetVal = { w: number | null; r: number | null }

export type Exercise = { id: string; name: string; sets: number; reps: string; kg: number | null }

/** `weekday`: 0 = Monday … 6 = Sunday, or null when the plan rotates. */
export type Workout = {
  id: string
  name: string
  label: string
  weekday: number | null
  exercises: Exercise[]
}

export type Session = {
  id: string
  date: string
  workoutId: string
  sets: Record<string, SetVal[]>
  finished: boolean
}
