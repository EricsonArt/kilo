import { ChevronLeft, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { dayKey } from '../lib/dates'
import { celebrate, toast } from '../lib/reward'
import { fromUnit } from '../lib/units'
import { useStore } from '../store'
import type { Goal, Unit } from '../types'
import { Button, NumField, Segmented, spring } from '../ui'

const GOALS: { id: Goal; title: string; sub: string; icon: typeof Minus }[] = [
  { id: 'cut', title: 'Lose fat', sub: 'Cut', icon: TrendingDown },
  { id: 'bulk', title: 'Build muscle', sub: 'Bulk', icon: TrendingUp },
  { id: 'maintain', title: 'Stay the same', sub: 'Maintain', icon: Minus },
]

/** Three questions, one per screen. The goal decides what counts as progress later. */
export function Onboarding() {
  const [step, setStep] = useState(0)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [unit, setUnit] = useState<Unit>('kg')
  const [weight, setWeight] = useState<number | null>(null)
  const [target, setTarget] = useState<number | null>(null)

  const valid = (v: number | null) => v != null && fromUnit(v, unit) >= 20 && fromUnit(v, unit) <= 400

  const finish = (withTarget: boolean) => {
    if (!valid(weight)) return setStep(1)
    const s = useStore.getState()
    s.logDay(dayKey(), { kg: fromUnit(weight!, unit) })
    s.patch({
      goal,
      unit,
      goalKg: withTarget && valid(target) ? fromUnit(target!, unit) : null,
      onboarded: true,
    })
    celebrate()
    toast('Day 1. Here we go.', true)
  }

  const big =
    'w-full bg-transparent text-center text-[80px] leading-none font-bold tracking-[-0.04em]'

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pt-[max(16px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))]">
      <div className="flex h-11 items-center">
        {step > 0 && (
          <button
            aria-label="Back"
            onClick={() => setStep(step - 1)}
            className="-ml-2 grid h-11 w-11 place-items-center rounded-full"
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className="mx-auto flex gap-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-ink' : 'w-1.5 bg-fill-2'}`} />
          ))}
        </div>
        {step > 0 && <span className="w-9" />}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="flex flex-1 flex-col pt-8"
        >
          {step === 0 && (
            <>
              <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">What's your goal?</h1>
              <div className="mt-8 space-y-3">
                {GOALS.map((g) => (
                  <motion.button
                    key={g.id}
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    onClick={() => {
                      setGoal(g.id)
                      setStep(1)
                    }}
                    className={`flex h-[84px] w-full items-center gap-4 rounded-card bg-card px-5 text-left shadow-card ${goal === g.id ? 'ring-2 ring-ink' : ''}`}
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-fill">
                      <g.icon size={22} />
                    </span>
                    <span>
                      <span className="block text-[19px] font-semibold">{g.title}</span>
                      <span className="block text-[15px] text-ink-2">{g.sub}</span>
                    </span>
                  </motion.button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">Your weight today</h1>
              <div className="flex flex-1 flex-col items-center justify-center">
                <NumField
                  decimal
                  autoFocus
                  label="Your weight today"
                  placeholder="0.0"
                  value={weight}
                  onChange={setWeight}
                  className={big}
                />
                <Segmented
                  label="Unit"
                  value={unit}
                  onChange={setUnit}
                  options={[
                    { id: 'kg', text: 'kg' },
                    { id: 'lb', text: 'lb' },
                  ]}
                  className="mt-6 w-32"
                />
              </div>
              <Button
                disabled={!valid(weight)}
                onClick={() => (goal === 'maintain' ? finish(false) : setStep(2))}
              >
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">Your goal weight</h1>
              <div className="flex flex-1 flex-col items-center justify-center">
                <NumField
                  decimal
                  autoFocus
                  label="Your goal weight"
                  placeholder="0.0"
                  value={target}
                  onChange={setTarget}
                  className={big}
                />
                <p className="mt-6 text-[17px] font-medium text-ink-2">{unit}</p>
              </div>
              <div className="space-y-2">
                <Button disabled={!valid(target)} onClick={() => finish(true)}>
                  Done
                </Button>
                <Button look="soft" className="bg-transparent text-ink-2" onClick={() => finish(false)}>
                  Skip
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
