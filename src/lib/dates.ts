// Days are keyed as local-time "YYYY-MM-DD" strings. They sort correctly as text.

const pad = (n: number) => String(n).padStart(2, '0')

export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const addDays = (key: string, n: number) => {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** Whole days from `a` to `b`. Rounding absorbs daylight-saving shifts. */
export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000)

/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (key: string) => (fromKey(key).getDay() + 6) % 7

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const WEEKDAYS_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const fmt = (key: string, o: Intl.DateTimeFormatOptions) =>
  fromKey(key).toLocaleDateString('en-US', o)

/** "Nov 14" */
export const fmtShort = (key: string) => fmt(key, { month: 'short', day: 'numeric' })
/** "Sat, Nov 14" */
export const fmtDay = (key: string) => fmt(key, { weekday: 'short', month: 'short', day: 'numeric' })
/** "Saturday, Nov 14" */
export const fmtLong = (key: string) => fmt(key, { weekday: 'long', month: 'short', day: 'numeric' })
/** "November 2026" */
export const fmtMonth = (key: string) => fmt(key, { month: 'long', year: 'numeric' })
