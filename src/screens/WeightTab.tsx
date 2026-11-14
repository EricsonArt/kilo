import { Camera } from 'lucide-react'
import { useMemo, useState } from 'react'
import { logKcal, logWeight } from '../actions'
import { Compare, PhotoTile, Thumb } from '../components/Compare'
import { Header } from '../components/Header'
import { LineChart } from '../components/LineChart'
import { MonthCalendar } from '../components/MonthCalendar'
import { Pager } from '../components/Pager'
import { dayKey, daysBetween, fmtDay, fmtLong, fmtShort } from '../lib/dates'
import { fmtDelta, fmtWeight, toUnit } from '../lib/units'
import { movedToward, trendLine, weightStatus, type Point } from '../lib/weight'
import { useStore, weightPoints } from '../store'
import type { Goal } from '../types'
import { Button, Card, Delta, NumField, Segmented, Sheet } from '../ui'

type Range = '1M' | '3M' | 'All'
const RANGE_DAYS: Record<Range, number> = { '1M': 30, '3M': 90, All: Infinity }

const WORDS: Record<Goal, { good: string; bad: string }> = {
  cut: { good: 'On track', bad: 'Trending up' },
  bulk: { good: 'On track', bad: 'Trending down' },
  maintain: { good: 'Steady', bad: 'Drifting' },
}

export function WeightTab() {
  const days = useStore((s) => s.days)
  const unit = useStore((s) => s.unit)
  const today = dayKey()
  const [editing, setEditing] = useState<string | null>(null)
  const points = useMemo(() => weightPoints(days), [days])
  const past = useMemo(
    () =>
      Object.keys(days)
        .filter((k) => k !== today)
        .sort()
        .reverse(),
    [days, today],
  )

  return (
    <>
      <Header title="Weight" />
      <div className="space-y-3">
        <Compare />

        <Pager labels={['trend', 'calendar']}>
          <Trend points={points} />
          <MonthCalendar
            onPick={setEditing}
            cell={(key) => {
              const kg = days[key]?.kg
              return { on: kg != null, sub: kg != null ? fmtWeight(kg, unit) : undefined }
            }}
          />
        </Pager>

        <Card className="flex gap-3 p-3">
          <DayFields date={today} title="Today" points={points} />
          <PhotoTile date={today} className="w-[112px] shrink-0" />
        </Card>

        {past.map((date) => (
          <DayRow key={date} date={date} points={points} onOpen={() => setEditing(date)} />
        ))}
      </div>

      <Sheet open={editing != null} onClose={() => setEditing(null)} label="Edit day">
        {editing && (
          <>
            <div className="flex gap-3">
              <DayFields date={editing} title={fmtLong(editing)} points={points} />
              <PhotoTile date={editing} className="w-[112px] shrink-0" />
            </div>
            <Button className="mt-5" onClick={() => setEditing(null)}>
              Done
            </Button>
          </>
        )}
      </Sheet>
    </>
  )
}

/** Change against the weigh-in before this one. Green when it moves toward the goal, never red. */
function useDayDelta(date: string, points: Point[]) {
  const goal = useStore((s) => s.goal) ?? 'maintain'
  const unit = useStore((s) => s.unit)
  const i = points.findIndex((p) => p.date === date)
  if (i < 1) return null
  const change = points[i].kg - points[i - 1].kg
  return <Delta text={fmtDelta(change, unit)} tone={movedToward(change, goal) ? 'up' : 'none'} />
}

/** The two inputs for a day: weight (large) and calories. Both save when you leave the field. */
function DayFields({ date, title, points }: { date: string; title: string; points: Point[] }) {
  const day = useStore((s) => s.days[date])
  const unit = useStore((s) => s.unit)
  const delta = useDayDelta(date, points)

  return (
    <div className="flex min-w-0 flex-1 flex-col px-2 pt-2 pb-1">
      <p className="text-[13px] font-medium text-ink-2">{title}</p>
      <label className="mt-1.5 flex items-baseline gap-1.5">
        <NumField
          decimal
          fit
          label={`Weight, ${title}`}
          placeholder="0.0"
          value={day?.kg != null ? toUnit(day.kg, unit) : null}
          format={(v) => v.toFixed(1)}
          onCommit={(v) => logWeight(date, v)}
          className="text-[44px] leading-none font-semibold tracking-[-0.03em]"
        />
        <span className="text-[17px] font-medium text-ink-2">{unit}</span>
        <span className="ml-1 self-center">{delta}</span>
      </label>
      <label className="mt-auto flex items-baseline gap-1.5 border-t border-line pt-3">
        <NumField
          fit
          label={`Calories, ${title}`}
          value={day?.kcal ?? null}
          format={(v) => v.toLocaleString('en-US')}
          onCommit={(v) => logKcal(date, v)}
          className="text-[22px] leading-none font-semibold"
        />
        <span className="text-[15px] font-medium text-ink-2">kcal</span>
      </label>
    </div>
  )
}

/** An earlier day: the numbers on the left, the photo on the right. Tap to edit. */
function DayRow({ date, points, onOpen }: { date: string; points: Point[]; onOpen: () => void }) {
  const day = useStore((s) => s.days[date])
  const unit = useStore((s) => s.unit)
  const delta = useDayDelta(date, points)
  if (!day) return null

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[24px] bg-card py-2.5 pr-2.5 pl-5 text-left shadow-card"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink-2">{fmtDay(date)}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="num text-[22px] leading-tight font-semibold">
            {day.kg != null ? fmtWeight(day.kg, unit) : '—'}
            <span className="ml-1 text-[15px] font-medium text-ink-2">{unit}</span>
          </span>
          {delta}
        </span>
      </span>
      {day.kcal != null && (
        <span className="num text-[15px] text-ink-2">{day.kcal.toLocaleString('en-US')} kcal</span>
      )}
      <span className="relative grid h-16 w-12 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-fill text-ink-3">
        {day.media ? <Thumb media={day.media} /> : <Camera size={18} strokeWidth={1.75} />}
      </span>
    </button>
  )
}

/** The verdict in two lines, then the line itself. */
function Trend({ points }: { points: Point[] }) {
  const unit = useStore((s) => s.unit)
  const goal = useStore((s) => s.goal) ?? 'maintain'
  const [range, setRange] = useState<Range>('3M')
  const status = useMemo(() => weightStatus(points, goal), [points, goal])

  const { line, dots, from } = useMemo(() => {
    if (!points.length) return { line: [], dots: [], from: null }
    const last = points[points.length - 1].date
    const keep = (p: Point) => daysBetween(p.date, last) <= RANGE_DAYS[range]
    const first = points.find(keep)!.date
    const shape = (p: Point) => ({ t: daysBetween(first, p.date), v: p.kg, label: fmtShort(p.date) })
    return {
      line: trendLine(points).filter(keep).map(shape),
      dots: points.filter(keep).map(shape),
      from: first,
    }
  }, [points, range])

  const { verdict, rate, daysLeft } = status
  const tone = verdict === 'good' ? 'text-up' : verdict === 'bad' ? 'text-down' : ''
  const dot = verdict === 'good' ? 'bg-up' : verdict === 'bad' ? 'bg-down' : 'bg-ink-3'
  const title =
    verdict === 'learning'
      ? 'Finding your trend'
      : verdict === 'flat'
        ? 'Holding steady'
        : WORDS[goal][verdict]

  return (
    <div>
      <div className="pr-11">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {title}
        </p>
        <p className={`num mt-1.5 text-[28px] leading-none font-semibold ${tone}`}>
          {rate != null ? (
            <>
              {fmtDelta(rate, unit)}
              <span className="ml-1.5 text-[15px] font-medium text-ink-2">{unit} / week</span>
            </>
          ) : (
            <>
              {daysLeft}
              <span className="ml-1.5 text-[15px] font-medium text-ink-2">
                more {daysLeft === 1 ? 'day' : 'days'} to go
              </span>
            </>
          )}
        </p>
      </div>

      <LineChart
        line={line}
        dots={dots}
        minSpan={2}
        fmt={(kg) => `${fmtWeight(kg, unit)} ${unit}`}
        className="mt-1 h-[176px]"
      />

      <div className="mt-2 flex items-center justify-between text-[12px] font-medium text-ink-2">
        <span className="w-14">{from ? fmtShort(from) : ''}</span>
        <Segmented
          label="Chart range"
          value={range}
          onChange={setRange}
          options={[
            { id: '1M', text: '1M' },
            { id: '3M', text: '3M' },
            { id: 'All', text: 'All' },
          ]}
          className="w-[156px]"
        />
        <span className="w-14 text-right">Today</span>
      </div>
    </div>
  )
}
