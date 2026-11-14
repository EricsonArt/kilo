import type { Unit } from '../types'

// Turns a pasted workout plan (any common format, English or Polish) into
// structured workouts. Pure text rules: instant, offline, no model download.
// The result always goes through a review screen before it is saved.

export type ParsedExercise = { name: string; sets: number; reps: string; kg: number | null }
export type ParsedWorkout = {
  name: string
  label: string
  weekday: number | null
  exercises: ParsedExercise[]
}
export type ParsedPlan = { workouts: ParsedWorkout[]; leftovers: string[] }

const DAY_WORDS = new Map<string, number>(
  (
    [
      ['mon monday pon poniedziałek poniedzialek pn', 0],
      ['tue tues tuesday wt wtorek', 1],
      ['wed weds wednesday śr sr środa sroda', 2],
      ['thu thur thurs thursday czw czwartek', 3],
      ['fri friday pt piątek piatek', 4],
      ['sat saturday sob sobota', 5],
      ['sun sunday nd niedz niedziela', 6],
    ] as const
  ).flatMap(([words, i]) => words.split(' ').map((w) => [w, i] as [string, number])),
)

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

/** Short pill labels for common split names. */
const ABBR = new Map<string, string>(
  Object.entries({
    upper: 'UPP',
    lower: 'LOW',
    push: 'PUSH',
    pull: 'PULL',
    legs: 'LEGS',
    leg: 'LEGS',
    chest: 'CHEST',
    back: 'BACK',
    shoulders: 'SHLD',
    shoulder: 'SHLD',
    arms: 'ARMS',
    arm: 'ARMS',
    triceps: 'TRI',
    tricep: 'TRI',
    biceps: 'BI',
    bicep: 'BI',
    glutes: 'GLUTES',
    core: 'CORE',
    abs: 'ABS',
    cardio: 'CARDIO',
    full: 'FULL',
    body: '',
    fbw: 'FBW',
    klatka: 'KLATKA',
    plecy: 'PLECY',
    nogi: 'NOGI',
    barki: 'BARKI',
    ramiona: 'RAM',
    góra: 'GÓRA',
    gora: 'GÓRA',
    dół: 'DÓŁ',
    dol: 'DÓŁ',
    brzuch: 'BRZUCH',
  }),
)

const FILLER = new Set(['day', 'workout', 'session', 'trening', 'dzień', 'dzien', 'sesja'])
const JOIN = new Set(['and', 'i', '&', '+', '/'])
const BULLET = /^\s*(?:[-*•·▪◦>]+|\d{1,2}[.)])\s+/
const NOISE = /^(notes?|uwagi?|rest|przerwa|warm|rozgrzewka|tempo|cool)/i
const REST_DAY = /\b(rest|off|wolne|odpoczynek)\b/i

const NUM = String.raw`\d+(?:\.\d+)?`
const UNIT = String.raw`(kg|kgs|lbs?)`

const words = (text: string) => text.toLowerCase().match(/\p{L}+|\d+|[&+/]/gu) ?? []
const range = (nums: number[]) => {
  const lo = Math.min(...nums)
  const hi = Math.max(...nums)
  return lo === hi ? String(lo) : `${lo}-${hi}`
}

/** Pull sets, reps and weight out of one line. Whatever comes before them is the name. */
function parseLine(raw: string, unit: Unit) {
  // Normalise look-alike characters without changing string length, so indexes stay valid.
  const orig = raw
    .replace(/[×✕✖]/g, 'x')
    .replace(/[–—−]/g, '-')
    .replace(/(?<=\d\s*)\*(?=\s*\d)/g, 'x')
    .replace(/(?<=\d),(?=\d+\s*(?:kg|lbs?)\b)/gi, '.')

  let s = orig
  let cut = s.length // where the exercise name ends
  const take = (re: RegExp) => {
    const m = re.exec(s)
    if (!m) return null
    cut = Math.min(cut, m.index)
    s = s.slice(0, m.index) + ' '.repeat(m[0].length) + s.slice(m.index + m[0].length)
    return m
  }

  let sets: number | null = null
  let reps = ''
  let kg: number | null = null
  let explicit: Unit | null = null
  const pairReps: number[] = [] // reps from "weight x reps" pairs
  let m: RegExpExecArray | null

  // Timed sets: "3x60s"
  if ((m = take(/(\d+)\s*x\s*(\d+\s*(?:s|sec|secs|min|mins))\b/i))) {
    sets = +m[1]
    reps = m[2].replace(/\s+/g, '')
  }
  // Things that look like numbers but are not sets, reps or weight.
  while (take(/\b(?:rpe|rir)\s*\d+(?:\.\d+)?/i));
  while (take(/\b\d+\s*(?:s|sec|secs|seconds?|min|mins|minutes?)\b/i));
  while (take(/\d+\s*%/));
  take(/\b(?:rest|przerwa|tempo)\b.*$/i)

  // "80kg x 8"
  while ((m = take(new RegExp(`(${NUM})\\s*${UNIT}\\s*x\\s*(\\d+)`, 'i')))) {
    kg ??= +m[1]
    explicit = /lb/i.test(m[2]) ? 'lb' : 'kg'
    pairReps.push(+m[3])
  }
  // "80 kg"
  if ((m = take(new RegExp(`(${NUM})\\s*${UNIT}\\b`, 'i')))) {
    kg ??= +m[1]
    explicit = /lb/i.test(m[2]) ? 'lb' : 'kg'
  }
  // "@ 80"
  if ((m = take(new RegExp(`@\\s*(${NUM})`)))) kg ??= +m[1]
  // "4x8x80" or "80x4x8"
  if ((m = take(new RegExp(`(${NUM})\\s*x\\s*(${NUM})\\s*x\\s*(${NUM})`, 'i')))) {
    const [a, b, c] = [+m[1], +m[2], +m[3]]
    if (kg != null || a <= 20) {
      sets = a
      reps = String(b)
      kg ??= c
    } else {
      kg = a
      sets = b
      reps = String(c)
    }
  }
  // "4 sets of 8-10"
  if ((m = take(/(\d+)\s*(?:sets?|serie|serii|seria|series)\b\s*(?:of|x|po)?\s*(\d+\s*-\s*\d+|\d+)?/i))) {
    sets ??= +m[1]
    if (m[2] && !reps) reps = m[2].replace(/\s+/g, '')
  }
  // "8-10 reps"
  if ((m = take(/(\d+\s*-\s*\d+|\d+)\s*(?:reps?|powt\w*)\b/i)) && !reps) reps = m[1].replace(/\s+/g, '')
  // "4x8", "3 x 8-10", "3xAMRAP". A first number above 12 is a weight: "140 x 5".
  while ((m = take(new RegExp(`(${NUM})\\s*x\\s*(\\d+\\s*-\\s*\\d+|\\d+|amrap|max)\\b`, 'i')))) {
    const a = +m[1]
    const second = m[2].replace(/\s+/g, '').toUpperCase()
    if (a > 12 || m[1].includes('.')) {
      kg ??= a
      if (/^\d+$/.test(second)) pairReps.push(+second)
      else if (!reps) reps = second
    } else {
      sets ??= a
      if (!reps) reps = second
    }
  }
  if (pairReps.length) {
    if (pairReps.length > 1) sets ??= pairReps.length
    if (!reps) reps = range(pairReps)
  }
  // "8, 8, 7" or "8/8/7"
  if (!reps && (m = take(/\b\d{1,2}(?:\s*[,/]\s*\d{1,2})+\b/))) {
    const nums = m[0].match(/\d+/g)!.map(Number)
    sets ??= nums.length
    reps = range(nums)
  }
  // A lone number after the sets and reps is the weight: "OHP 3x10 40"
  if (kg == null && (sets != null || reps)) {
    const tail = new RegExp(`\\b(${NUM})\\b`).exec(s.slice(cut))
    if (tail) kg = +tail[1]
  }

  if (kg != null && (explicit ?? unit) === 'lb') kg = Math.round(kg * 0.45359237 * 100) / 100

  let name = orig.slice(0, cut)
  if (!/\p{L}/u.test(name)) name = s // numbers came first: "4x8 Bench press"
  name = name
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-:.,;()@=]+|[\s\-:.,;(@=]+$/g, '')
  name = name.charAt(0).toUpperCase() + name.slice(1)

  return { name, sets: sets ?? 3, reps, kg, matched: sets != null || reps !== '' || kg != null }
}

/** A short line made only of split words, weekdays and A/B/1/2: "Upper A", "Push day", "Mon". */
function isSplitName(text: string) {
  const t = words(text)
  return (
    t.length > 0 &&
    t.length <= 6 &&
    t.every(
      (w) => DAY_WORDS.has(w) || ABBR.has(w) || FILLER.has(w) || JOIN.has(w) || /^([a-d]|\d{1,2})$/.test(w),
    )
  )
}

function headerInfo(text: string) {
  const name = text.replace(/[:\-–—\s]+$/, '').trim()
  let weekday: number | null = null
  const parts: string[] = []
  for (const w of words(name)) {
    if (DAY_WORDS.has(w) && weekday == null) weekday = DAY_WORDS.get(w)!
    else if (FILLER.has(w)) continue
    else if (JOIN.has(w)) {
      if (parts.length && parts[parts.length - 1] !== '+') parts.push('+')
    } else {
      const short = ABBR.get(w) ?? (w.length <= 5 ? w : w.slice(0, 4)).toUpperCase()
      if (short) parts.push(short)
    }
  }
  while (parts[parts.length - 1] === '+') parts.pop()
  const label = parts.join(' ').slice(0, 12).trim() || (weekday != null ? DAY_LABELS[weekday] : '')
  return { name, label, weekday }
}

export function parsePlan(text: string, unit: Unit = 'kg'): ParsedPlan {
  const lines = text.split(/\r?\n/).map((l) => {
    const t = l.replace(BULLET, '').trim()
    return t ? { text: t, ...parseLine(t, unit) } : null
  })

  type Draft = ParsedWorkout & { auto: boolean }
  const drafts: Draft[] = []
  const leftovers: string[] = []
  let cur: Draft | null = null
  let blankBefore = true

  lines.forEach((line, i) => {
    if (!line) {
      blankBefore = true
      return
    }
    const startsBlock = blankBefore
    blankBefore = false

    if (!line.matched) {
      const next = lines.slice(i + 1).find(Boolean)
      const isHeader =
        line.text.length <= 40 &&
        (line.text.endsWith(':') || isSplitName(line.text) || (startsBlock && !!next?.matched))
      if (isHeader) {
        cur = { ...headerInfo(line.text), exercises: [], auto: false }
        drafts.push(cur)
        return
      }
      if (NOISE.test(line.text) || line.text.length > 48) {
        leftovers.push(line.text)
        return
      }
    }

    // No header yet, or a blank line inside a headerless plan: start a new unnamed workout.
    if (!cur || (cur.auto && startsBlock && cur.exercises.length)) {
      cur = { name: '', label: '', weekday: null, exercises: [], auto: true }
      drafts.push(cur)
    }
    cur.exercises.push({ name: line.name, sets: line.sets, reps: line.reps, kg: line.kg })
  })

  const workouts = drafts.filter((w) => {
    if (w.exercises.length) return true
    if (w.name && !REST_DAY.test(w.name)) leftovers.push(w.name)
    return false
  })

  workouts.forEach((w, i) => {
    w.name ||= `Workout ${i + 1}`
    w.label ||= String(i + 1)
  })
  // Two workouts with the same pill label get A, B, C…
  const seen = new Map<string, number>()
  workouts.forEach((w) => seen.set(w.label, (seen.get(w.label) ?? 0) + 1))
  const used = new Map<string, number>()
  workouts.forEach((w) => {
    if (seen.get(w.label)! < 2) return
    const k = used.get(w.label) ?? 0
    used.set(w.label, k + 1)
    w.label = `${w.label} ${'ABCDEFG'[k] ?? k + 1}`
  })

  return {
    workouts: workouts.map(({ name, label, weekday, exercises }) => ({ name, label, weekday, exercises })),
    leftovers,
  }
}
