import { Check, ChevronLeft, ClipboardPaste, Pencil, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Compare } from '../components/Compare'
import { Header } from '../components/Header'
import { LineChart } from '../components/LineChart'
import { MonthCalendar } from '../components/MonthCalendar'
import { Pager } from '../components/Pager'
import { dayKey, daysBetween, fmtShort, WEEKDAYS_LONG } from '../lib/dates'
import { buildPlan, exerciseHistory, isLogged, sessionStats, strengthSeries, suggestWorkout } from '../lib/gym'
import { aiReady, getAi, readPlanWithAi } from '../lib/ai'
import { cleanPlanText } from '../lib/cleanPlan'
import { parsePlan } from '../lib/parsePlan'
import { celebrate, pop, tick, toast } from '../lib/reward'
import { compareSet, liftTrend } from '../lib/strength'
import { fmtLoad, fromUnit, toUnit } from '../lib/units'
import { exerciseKey, hasLoggedSet, useStore } from '../store'
import type { Exercise, SetVal, Workout } from '../types'
import { Button, Card, Delta, NumField, Sheet, spring } from '../ui'
import { useUi } from '../uiStore'
import { Pills, PlanEditor } from './PlanEditor'

export function GymTab() {
  const plan = useStore((s) => s.plan)
  const mode = useUi((s) => s.gym)
  const back = () => useUi.setState({ gym: 'main' })

  if (!plan || mode === 'import') return <Setup onCancel={plan ? back : undefined} />
  if (mode === 'edit')
    return (
      <PlanEditor
        initial={plan}
        title="Your plan"
        cta="Save"
        onBack={back}
        onSave={(next) => {
          if (next.length) useStore.getState().patch({ plan: next })
          back()
        }}
      />
    )
  return <Main plan={plan} />
}

// ---- setup: days → paste → check ------------------------------------------

const EXAMPLE = `Upper A
Bench press 4x8 80kg
Barbell row 4x8 70kg

Lower A
Squat 5x5 100kg
Leg curl 3x12`

function Setup({ onCancel }: { onCancel?: () => void }) {
  const unit = useStore((s) => s.unit)
  const saved = useStore((s) => s.trainDays)
  const [step, setStep] = useState<'days' | 'paste' | 'check'>(onCancel ? 'paste' : 'days')
  const [days, setDays] = useState(saved)
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<{ plan: Workout[]; leftovers: string[] } | null>(null)

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ label: string; pct: number | null }>({ label: '', pct: null })
  const [secs, setSecs] = useState(0)
  const skip = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!busy) return
    setSecs(0)
    const t = setInterval(() => setSecs((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [busy])

  const read = async () => {
    setBusy(true)
    // Links, images, hashtags and motivation lines never reach the reader.
    const cleaned = cleanPlanText(text)
    let parsed: ReturnType<typeof parsePlan> | null = null
    const ai = getAi()
    if (aiReady(ai)) {
      setStatus({ label: 'Starting…', pct: null })
      const skipped = new Promise<null>((resolve) => (skip.current = () => resolve(null)))
      try {
        parsed = await Promise.race([readPlanWithAi(cleaned, ai, setStatus), skipped])
      } catch (e) {
        toast(`AI failed (${(e as Error).message.slice(0, 60)}). Using built-in reader.`)
      }
    }
    skip.current = null
    parsed ??= parsePlan(cleaned, unit)
    setBusy(false)
    if (!parsed.workouts.length) return toast('No exercises found. Try one per line.')
    setDraft({ plan: buildPlan(parsed.workouts, days), leftovers: parsed.leftovers })
    setStep('check')
  }

  if (step === 'check' && draft)
    return (
      <PlanEditor
        initial={draft.plan}
        leftovers={draft.leftovers}
        title="Does this look right?"
        cta="Looks good"
        onBack={() => setStep('paste')}
        onSave={(plan) => {
          if (!plan.length) return toast('Add at least one exercise.')
          // If the plan names its own days, those win over the first answer.
          const named = [...new Set(plan.flatMap((w) => (w.weekday != null ? [w.weekday] : [])))].sort()
          useStore.getState().patch({ plan, trainDays: named.length === plan.length ? named : days })
          useUi.setState({ gym: 'main' })
          pop()
          toast('Plan ready', true)
        }}
      />
    )

  if (step === 'paste')
    return (
      <>
        <div className="flex h-11 items-center">
          <button
            aria-label="Back"
            onClick={() => (onCancel ? onCancel() : setStep('days'))}
            className="-ml-2 grid h-11 w-11 place-items-center rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">Paste your plan</h1>
        <p className="mt-2 text-[15px] text-ink-2">Any format. Exercises, sets, reps, weights.</p>

        <Card className="mt-6 p-4">
          <textarea
            aria-label="Your workout plan"
            rows={11}
            value={text}
            placeholder={EXAMPLE}
            onChange={(e) => setText(e.target.value)}
            className="block w-full resize-none text-[16px] leading-[1.6]"
          />
          <div className="flex justify-end pt-2">
            <button
              onClick={async () => {
                try {
                  setText(await navigator.clipboard.readText())
                } catch {
                  toast('Hold the box and choose Paste.')
                }
              }}
              className="flex h-10 items-center gap-1.5 rounded-full bg-fill px-4 text-[14px] font-semibold"
            >
              <ClipboardPaste size={16} /> Paste
            </button>
          </div>
        </Card>
        {busy ? (
          <Card className="mt-4 p-5" aria-live="polite">
            <div className="flex items-baseline justify-between">
              <p className="text-[17px] font-semibold">{status.label || 'Reading your plan…'}</p>
              <p className="num text-[15px] text-ink-2">
                {status.pct != null ? `${Math.round(status.pct * 100)}% · ` : ''}
                {secs}s
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fill">
              {status.pct != null ? (
                <motion.div
                  className="h-full rounded-full bg-ink"
                  animate={{ width: `${status.pct * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              ) : (
                <motion.div
                  className="h-full w-1/3 rounded-full bg-ink"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
            </div>
            {secs >= 20 && (
              <p className="mt-3 text-[13px] text-ink-2">Taking long? A smaller model or the built-in reader is faster.</p>
            )}
            <Button look="soft" className="mt-4 h-12" onClick={() => skip.current?.()}>
              Use built-in reader instead
            </Button>
          </Card>
        ) : (
          <Button className="mt-4" disabled={!text.trim()} onClick={read}>
            Build my plan
          </Button>
        )}
      </>
    )

  return (
    <>
      <Header title="Gym" />
      <h2 className="pt-4 text-[28px] leading-[1.15] font-bold tracking-[-0.03em]">Which days do you train?</h2>
      <div className="mt-8 flex justify-between">
        {WEEKDAYS_LONG.map((name, i) => {
          const on = days.includes(i)
          return (
            <motion.button
              key={name}
              whileTap={{ scale: 0.9 }}
              transition={spring}
              role="checkbox"
              aria-checked={on}
              aria-label={name}
              onClick={() => setDays(on ? days.filter((d) => d !== i) : [...days, i])}
              className={`h-11 w-11 rounded-full text-[15px] font-semibold transition-colors ${
                on ? 'bg-ink text-white' : 'bg-card text-ink-2 shadow-card'
              }`}
            >
              {name[0]}
            </motion.button>
          )
        })}
      </div>
      <p className="mt-6 h-5 text-[15px] text-ink-2">
        {days.length ? `${days.length} ${days.length === 1 ? 'day' : 'days'} a week` : ''}
      </p>
      <Button
        className="mt-8"
        disabled={!days.length}
        onClick={() => {
          useStore.getState().patch({ trainDays: days })
          setStep('paste')
        }}
      >
        Continue
      </Button>
    </>
  )
}

// ---- main ------------------------------------------------------------------

function Main({ plan }: { plan: Workout[] }) {
  const sessions = useStore((s) => s.sessions)
  const today = dayKey()
  const suggested = useMemo(() => suggestWorkout(plan, sessions, today), [plan, sessions, today])
  const [picked, setPicked] = useState<string | null>(null)
  const workout = plan.find((w) => w.id === picked) ?? suggested
  const session = sessions.find((s) => s.date === today && s.workoutId === workout.id)
  const [summary, setSummary] = useState<ReturnType<typeof sessionStats> | null>(null)

  const labelOf = useMemo(() => new Map(plan.map((w) => [w.id, w.label])), [plan])
  const trained = useMemo(() => {
    const m = new Map<string, string>()
    sessions.filter(hasLoggedSet).forEach((s) => m.set(s.date, labelOf.get(s.workoutId) ?? ''))
    return m
  }, [sessions, labelOf])

  const finish = () => {
    if (!session) return
    const stats = sessionStats(workout, sessions, session)
    useStore.getState().finish(today, workout.id)
    setSummary(stats)
    if (stats.prs || stats.improved) celebrate()
    else pop()
  }

  return (
    <>
      <Header title="Gym" />
      <Pager labels={['strength', 'calendar', 'photos']}>
        <Strength />
        <MonthCalendar
          cell={(key) => ({ on: trained.has(key), sub: trained.get(key)?.slice(0, 5) })}
        />
        <div className="pt-11">
          <Compare bare />
        </div>
      </Pager>

      <div className="sticky top-0 z-20 -mx-5 mt-2 bg-bg/90 px-5 py-2 backdrop-blur-md">
        <Pills items={plan} selected={workout.id} onSelect={setPicked} dot={suggested.id}>
          <button
            aria-label="Edit plan"
            onClick={() => useUi.setState({ gym: 'edit' })}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-ink-2 shadow-card"
          >
            <Pencil size={16} />
          </button>
        </Pills>
      </div>

      <div className="space-y-3">
        {workout.exercises.map((ex) => (
          <ExerciseCard key={ex.id} ex={ex} workout={workout} date={today} />
        ))}
        {session && hasLoggedSet(session) && (
          <Button look={session.finished ? 'soft' : 'primary'} onClick={finish}>
            {session.finished ? (
              <>
                <Check size={18} strokeWidth={3} /> Done for today
              </>
            ) : (
              'Finish workout'
            )}
          </Button>
        )}
      </div>

      <Sheet open={summary != null} onClose={() => setSummary(null)} label="Workout summary">
        {summary && (
          <div className="flex flex-col items-center text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-ink text-white">
              <Check size={30} strokeWidth={3} />
            </span>
            <h2 className="mt-5 text-[28px] font-bold tracking-[-0.03em]">Workout done</h2>
            {summary.improved || summary.prs ? (
              <div className="mt-6 grid w-full grid-cols-3">
                <Stat value={String(summary.improved)} label={summary.improved === 1 ? 'set up' : 'sets up'} good={summary.improved > 0} />
                <Stat value={String(summary.prs)} label={summary.prs === 1 ? 'new best' : 'new bests'} good={summary.prs > 0} />
                <Stat
                  value={summary.volume == null ? '—' : `${summary.volume > 0 ? '+' : ''}${summary.volume}%`}
                  label="total work"
                  good={(summary.volume ?? 0) > 0}
                />
              </div>
            ) : (
              <p className="mt-2 text-[17px] text-ink-2">You showed up. That counts.</p>
            )}
            <Button className="mt-8" onClick={() => setSummary(null)}>
              Done
            </Button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Stat({ value, label, good }: { value: string; label: string; good: boolean }) {
  return (
    <div>
      <p className={`num text-[34px] leading-none font-bold tracking-[-0.03em] ${good ? 'text-up' : ''}`}>{value}</p>
      <p className="mt-1.5 text-[13px] font-medium text-ink-2">{label}</p>
    </div>
  )
}

/** Overall strength: every lift against its own first session, averaged into one number. */
function Strength() {
  const sessions = useStore((s) => s.sessions)
  const series = useMemo(() => strengthSeries(sessions), [sessions])
  const first = series[0]
  const pct = series.length ? series[series.length - 1].pct : 0
  const shown = Math.round(pct)
  const line = series.map((p) => ({ t: daysBetween(first.date, p.date), v: p.pct, label: fmtShort(p.date) }))

  return (
    <div>
      <div className="pr-11">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
          <span className={`h-2 w-2 rounded-full ${shown > 0 ? 'bg-up' : shown <= -5 ? 'bg-down' : 'bg-ink-3'}`} />
          Strength
        </p>
        <p className={`num mt-1.5 text-[28px] leading-none font-semibold ${shown > 0 ? 'text-up' : shown <= -5 ? 'text-down' : ''}`}>
          {series.length > 1 ? `${shown > 0 ? '+' : shown < 0 ? '−' : ''}${Math.abs(shown)}%` : '—'}
          <span className="ml-1.5 text-[15px] font-medium text-ink-2">
            {series.length > 1 ? `since ${fmtShort(first.date)}` : 'two workouts to start'}
          </span>
        </p>
      </div>
      <LineChart
        line={line}
        minSpan={6}
        fmt={(v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v))}%`}
        className="mt-1 h-[132px]"
      />
    </div>
  )
}

// ---- one exercise ----------------------------------------------------------

const EMPTY: SetVal = { w: null, r: null }
const input =
  'h-12 w-full rounded-[14px] text-center text-[20px] font-semibold transition-colors duration-200'

function ExerciseCard({ ex, workout, date }: { ex: Exercise; workout: Workout; date: string }) {
  const sessions = useStore((s) => s.sessions)
  const unit = useStore((s) => s.unit)
  const logSet = useStore((s) => s.logSet)
  const key = exerciseKey(ex.name)
  const rows = sessions.find((s) => s.date === date && s.workoutId === workout.id)?.sets[key] ?? []
  const { prev, history } = useMemo(
    () => exerciseHistory(sessions, workout.id, ex, date),
    [sessions, workout.id, ex, date],
  )
  const [extra, setExtra] = useState(0)
  const count = Math.max(ex.sets + extra, rows.length)

  const logged = isLogged(rows)
  const trend = liftTrend(logged ? [...history, rows] : history)
  const best = logged && trend === 'pr'
  const ups = rows.filter((r, i) => r.r != null && compareSet(r, prev[i]) === 'up').length

  // A set that beats last time: a light tap in the hand, the moment it is typed.
  const lastUps = useRef(ups)
  useEffect(() => {
    if (ups > lastUps.current) tick()
    lastUps.current = ups
  }, [ups])

  // A new all-time best: confetti, once. The short wait ignores half-typed numbers.
  const cheered = useRef(best)
  useEffect(() => {
    if (!best || cheered.current) return
    const id = setTimeout(() => {
      cheered.current = true
      pop()
      toast(`New best · ${ex.name}`, true)
    }, 600)
    return () => clearTimeout(id)
  }, [best, ex.name])

  const target = ex.reps ? `${ex.sets} × ${ex.reps.replace('-', '–')}` : `${ex.sets} sets`

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="min-w-0 truncate text-[19px] font-semibold tracking-[-0.01em]">{ex.name}</h3>
        {best ? (
          <Delta text="New best" tone="up" />
        ) : trend === 'down' ? (
          <Delta text="Slipping" tone="down" />
        ) : (
          <span className="num shrink-0 text-[13px] font-medium text-ink-2">{target}</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-[16px_1fr_12px_1fr_44px] items-center gap-x-2 gap-y-2">
        <span />
        <span className="text-center text-[11px] font-medium text-ink-3">{unit}</span>
        <span />
        <span className="text-center text-[11px] font-medium text-ink-3">reps</span>
        <span />

        {Array.from({ length: count }, (_, i) => {
          const row = rows[i] ?? EMPTY
          const ghost = prev[i] ?? prev[prev.length - 1]
          const done = row.r != null
          const up = done && compareSet(row, prev[i]) === 'up'
          const paint = up ? 'animate-pop bg-up-soft text-up' : 'bg-fill'
          const set = (val: SetVal) => logSet(date, workout.id, key, i, val)

          return (
            <div key={i} className="contents">
              <span className="num text-[13px] font-medium text-ink-3">{i + 1}</span>
              <NumField
                decimal
                label={`${ex.name}, set ${i + 1}, weight`}
                placeholder={ghost?.w ? fmtLoad(ghost.w, unit) : '–'}
                value={row.w ? toUnit(row.w, unit) : null}
                format={(v) => String(Math.round(v * 10) / 10)}
                onChange={(v) => set({ w: v == null ? null : fromUnit(v, unit), r: row.r })}
                className={`${input} ${paint}`}
              />
              <span className="text-center text-[15px] text-ink-3">×</span>
              <NumField
                label={`${ex.name}, set ${i + 1}, reps`}
                placeholder={ghost?.r != null ? String(ghost.r) : '–'}
                value={row.r}
                // Typing only the reps keeps last time's weight.
                onChange={(v) => set({ w: row.w ?? (v != null ? (ghost?.w ?? null) : null), r: v })}
                className={`${input} ${paint}`}
              />
              <motion.button
                whileTap={{ scale: 0.88 }}
                transition={spring}
                aria-label={done ? `Clear set ${i + 1}` : `Set ${i + 1}: same as last time`}
                disabled={!done && ghost?.r == null}
                onClick={() => {
                  if (done) return set(EMPTY)
                  tick()
                  set({ w: ghost!.w, r: ghost!.r })
                }}
                className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
                  up ? 'bg-up text-white' : done ? 'bg-ink text-white' : 'bg-fill text-ink-3'
                }`}
              >
                <Check size={18} strokeWidth={3} />
              </motion.button>
            </div>
          )
        })}
      </div>

      <button
        onClick={() => setExtra(extra + 1)}
        className="mt-3 ml-6 flex h-8 items-center gap-1 text-[13px] font-semibold text-ink-2"
      >
        <Plus size={14} strokeWidth={2.5} /> Set
      </button>
    </Card>
  )
}
