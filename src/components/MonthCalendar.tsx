import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { dayKey, fmtLong, fmtMonth, fromKey, weekdayOf } from '../lib/dates'

/**
 * A month at a glance. Logged days are filled and show their value under the
 * date; missed days are plain gray; today has a ring.
 */
export function MonthCalendar({
  cell,
  onPick,
}: {
  cell: (key: string) => { on: boolean; sub?: string }
  onPick?: (key: string) => void
}) {
  const today = dayKey()
  const [month, setMonth] = useState(() => `${today.slice(0, 8)}01`)
  const first = fromKey(month)
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const isCurrent = month.slice(0, 7) === today.slice(0, 7)

  const shift = (n: number) => {
    const d = fromKey(month)
    d.setMonth(d.getMonth() + n)
    setMonth(dayKey(d))
  }

  return (
    <div>
      <div className="-ml-2 flex h-9 items-center pr-11">
        <button
          aria-label="Previous month"
          onClick={() => shift(-1)}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-2"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-[15px] font-semibold">{fmtMonth(month)}</p>
        <button
          aria-label="Next month"
          disabled={isCurrent}
          onClick={() => shift(1)}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-2 disabled:opacity-0"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-medium text-ink-3" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-y-1">
        {Array.from({ length: weekdayOf(month) }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const key = `${month.slice(0, 8)}${String(i + 1).padStart(2, '0')}`
          const future = key > today
          const c = future ? { on: false, sub: undefined } : cell(key)
          return (
            <button
              key={key}
              disabled={future || !onPick}
              onClick={() => onPick?.(key)}
              aria-label={`${fmtLong(key)}${c.sub ? `, ${c.sub}` : c.on ? ', logged' : ''}`}
              className={`mx-auto flex h-11 w-10 flex-col items-center justify-center rounded-[12px] ${c.on ? 'bg-fill' : ''} ${key === today ? 'ring-[1.5px] ring-ink' : ''}`}
            >
              <span
                className={`num text-[13px] leading-none ${
                  c.on ? 'font-semibold text-ink' : future ? 'text-fill-2' : 'text-ink-3'
                }`}
              >
                {i + 1}
              </span>
              {c.sub && <span className="num mt-1 text-[9.5px] leading-none font-medium text-ink-2">{c.sub}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
