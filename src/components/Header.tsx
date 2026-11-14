import { Check, Flame } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { addDays, dayKey, fmtLong, weekdayOf } from '../lib/dates'
import { streak } from '../lib/streak'
import { activeDays, useStore } from '../store'
import { Sheet, spring } from '../ui'

/** Current streak, recalculated whenever a log changes. */
export function useStreak() {
  const days = useStore((s) => s.days)
  const sessions = useStore((s) => s.sessions)
  return useMemo(() => {
    const active = activeDays({ days, sessions })
    return { ...streak(active, dayKey()), active }
  }, [days, sessions])
}

/** Screen title with today's date and the streak. Same on every tab. */
export function Header({ title }: { title: string }) {
  return (
    <header className="flex items-end justify-between pt-2 pb-5">
      <div>
        <p className="text-[13px] font-medium text-ink-2">{fmtLong(dayKey())}</p>
        <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">{title}</h1>
      </div>
      <StreakPill />
    </header>
  )
}

function StreakPill() {
  const { count, doneToday, active } = useStreak()
  const [open, setOpen] = useState(false)
  const today = dayKey()
  const monday = addDays(today, -weekdayOf(today))

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={spring}
        onClick={() => setOpen(true)}
        aria-label={`${count}-day streak`}
        className="flex h-10 items-center gap-1.5 rounded-full bg-card pr-3.5 pl-3 shadow-card"
      >
        <Flame
          size={18}
          className={doneToday ? 'text-flame' : 'text-ink-3'}
          fill={doneToday ? 'currentColor' : 'none'}
        />
        <motion.span
          key={count}
          initial={{ scale: 1.5 }}
          animate={{ scale: 1 }}
          transition={spring}
          className={`num text-[17px] font-semibold ${count ? '' : 'text-ink-3'}`}
        >
          {count}
        </motion.span>
      </motion.button>

      <Sheet open={open} onClose={() => setOpen(false)} label="Streak">
        <div className="flex flex-col items-center pb-3 text-center">
          <Flame
            size={52}
            strokeWidth={1.75}
            className={doneToday ? 'text-flame' : 'text-ink-3'}
            fill={doneToday ? 'currentColor' : 'none'}
          />
          <p className="num mt-3 text-[72px] leading-none font-bold tracking-[-0.04em]">{count}</p>
          <p className="mt-2 text-[17px] font-medium text-ink-2">day streak</p>

          <div className="mt-8 grid w-full grid-cols-7">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => {
              const key = addDays(monday, i)
              const on = active.has(key)
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  <span className="text-[12px] font-medium text-ink-2">{letter}</span>
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${
                      on ? 'bg-ink text-white' : key === today ? 'border-2 border-ink' : 'bg-fill'
                    }`}
                  >
                    {on && <Check size={16} strokeWidth={3} />}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="mt-7 text-[15px] text-ink-2">
            {doneToday ? 'Done for today.' : 'Log anything today to keep it going.'}
          </p>
        </div>
      </Sheet>
    </>
  )
}
