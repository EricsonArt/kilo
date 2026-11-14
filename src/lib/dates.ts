import { lang, useLang } from './i18n'

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

const NAMES = {
  en: { short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], long: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  pl: { short: ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'], long: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] },
}
// Mutated in place when the language changes, so every importer sees the new names.
export const WEEKDAYS = [...NAMES[lang()].short]
export const WEEKDAYS_LONG = [...NAMES[lang()].long]
useLang.subscribe((s) => {
  WEEKDAYS.splice(0, 7, ...NAMES[s.lang].short)
  WEEKDAYS_LONG.splice(0, 7, ...NAMES[s.lang].long)
})

const fmt = (key: string, o: Intl.DateTimeFormatOptions) =>
  fromKey(key).toLocaleDateString(lang() === 'pl' ? 'pl-PL' : 'en-US', o)

/** "Nov 14" */
export const fmtShort = (key: string) => fmt(key, { month: 'short', day: 'numeric' })
/** "Sat, Nov 14" */
export const fmtDay = (key: string) => fmt(key, { weekday: 'short', month: 'short', day: 'numeric' })
/** "Saturday, Nov 14" */
export const fmtLong = (key: string) => fmt(key, { weekday: 'long', month: 'short', day: 'numeric' })
/** "November 2026" */
export const fmtMonth = (key: string) => fmt(key, { month: 'long', year: 'numeric' })
/** "Jan 1, 2024" */
export const fmtFull = (key: string) => fmt(key, { month: 'short', day: 'numeric', year: 'numeric' })
