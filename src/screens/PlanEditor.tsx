import { ChevronLeft, Plus, Trash2, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { uid } from '../lib/id'
import { fromUnit, toUnit } from '../lib/units'
import { useStore } from '../store'
import type { Exercise, Workout } from '../types'
import { Button, Card, NumField } from '../ui'

/** Workout picker: short pill buttons, the selected one filled black. */
export function Pills({
  items,
  selected,
  onSelect,
  dot,
  children,
}: {
  items: { id: string; label: string }[]
  selected: string
  onSelect: (id: string) => void
  /** Marks today's workout when another one is selected. */
  dot?: string
  children?: ReactNode
}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1" role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          aria-selected={it.id === selected}
          onClick={() => onSelect(it.id)}
          className={`relative h-11 shrink-0 rounded-full px-5 text-[14px] font-semibold tracking-[0.02em] transition-colors ${
            it.id === selected ? 'bg-ink text-white' : 'bg-card text-ink-2 shadow-card'
          }`}
        >
          {it.label}
          {it.id === dot && it.id !== selected && (
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-ink" />
          )}
        </button>
      ))}
      {children}
    </div>
  )
}

const blank = (): Exercise => ({ id: uid(), name: '', sets: 3, reps: '', kg: null })

/**
 * The plan as cards with every value editable in place. Used right after the
 * import (to check it) and later from Settings (to change it).
 */
export function PlanEditor({
  initial,
  leftovers = [],
  title,
  cta,
  onBack,
  onSave,
}: {
  initial: Workout[]
  leftovers?: string[]
  title: string
  cta: string
  onBack: () => void
  onSave: (plan: Workout[]) => void
}) {
  const unit = useStore((s) => s.unit)
  const [plan, setPlan] = useState(initial)
  const [selected, setSelected] = useState(initial[0]?.id)
  const w = plan.find((x) => x.id === selected) ?? plan[0]

  const update = (patch: Partial<Workout>) =>
    setPlan((p) => p.map((x) => (x.id === w.id ? { ...x, ...patch } : x)))
  const updateEx = (id: string, patch: Partial<Exercise>) =>
    update({ exercises: w.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) })

  const addWorkout = () => {
    const next: Workout = { id: uid(), name: '', label: String(plan.length + 1), weekday: null, exercises: [blank()] }
    setPlan([...plan, next])
    setSelected(next.id)
  }

  const save = () =>
    onSave(
      plan
        .map((x, i) => ({
          ...x,
          label: x.label.trim() || String(i + 1),
          exercises: x.exercises.filter((e) => e.name.trim()).map((e) => ({ ...e, name: e.name.trim() })),
        }))
        .filter((x) => x.exercises.length),
    )

  const box = 'flex h-11 min-w-0 flex-1 items-center gap-1.5 rounded-[14px] bg-fill px-3'
  const boxInput = 'w-full min-w-0 text-[17px] font-semibold'
  const boxUnit = 'text-[13px] font-medium text-ink-2'

  return (
    <>
      <div className="flex h-11 items-center">
        <button aria-label="Back" onClick={onBack} className="-ml-2 grid h-11 w-11 place-items-center rounded-full">
          <ChevronLeft size={24} />
        </button>
      </div>
      <h1 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 mb-4 text-[15px] text-ink-2">Tap anything to change it.</p>

      <Pills items={plan} selected={w.id} onSelect={setSelected}>
        <button
          aria-label="Add workout"
          onClick={addWorkout}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-card text-ink-2 shadow-card"
        >
          <Plus size={18} />
        </button>
      </Pills>

      <Card className="mt-2 p-5">
        <div className="flex items-center gap-2">
          <input
            aria-label="Button name"
            placeholder="NAME"
            maxLength={12}
            value={w.label}
            onChange={(e) => update({ label: e.target.value.toUpperCase() })}
            className="min-w-0 flex-1 text-[22px] font-bold tracking-[-0.01em]"
          />
          {plan.length > 1 && (
            <button
              aria-label="Delete workout"
              onClick={() => {
                const rest = plan.filter((x) => x.id !== w.id)
                setPlan(rest)
                setSelected(rest[0].id)
              }}
              className="grid h-9 w-9 place-items-center rounded-full text-ink-3"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        <div className="mt-3 flex justify-between" role="radiogroup" aria-label="Day of the week">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <button
              key={i}
              role="radio"
              aria-checked={w.weekday === i}
              onClick={() => update({ weekday: w.weekday === i ? null : i })}
              className={`h-9 w-9 rounded-full text-[13px] font-semibold transition-colors ${
                w.weekday === i ? 'bg-ink text-white' : 'bg-fill text-ink-2'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {w.exercises.map((e) => (
            <div key={e.id} className="border-t border-line py-3.5">
              <div className="flex items-center gap-2">
                <input
                  aria-label="Exercise name"
                  placeholder="Exercise"
                  value={e.name}
                  onChange={(ev) => updateEx(e.id, { name: ev.target.value })}
                  className="min-w-0 flex-1 text-[17px] font-semibold"
                />
                <button
                  aria-label={`Remove ${e.name || 'exercise'}`}
                  onClick={() => update({ exercises: w.exercises.filter((x) => x.id !== e.id) })}
                  className="-mr-2 grid h-8 w-8 place-items-center rounded-full text-ink-3"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mt-2.5 flex gap-2">
                <label className={box}>
                  <NumField
                    label="Sets"
                    value={e.sets}
                    placeholder="3"
                    onChange={(v) => updateEx(e.id, { sets: Math.min(Math.max(v ?? 1, 1), 12) })}
                    className={boxInput}
                  />
                  <span className={boxUnit}>sets</span>
                </label>
                <label className={box}>
                  <input
                    aria-label="Reps"
                    inputMode="numeric"
                    placeholder="8"
                    value={e.reps}
                    onChange={(ev) => updateEx(e.id, { reps: ev.target.value.slice(0, 7) })}
                    className={`num ${boxInput}`}
                  />
                  <span className={boxUnit}>reps</span>
                </label>
                <label className={box}>
                  <NumField
                    decimal
                    label="Weight"
                    placeholder="–"
                    value={e.kg != null ? toUnit(e.kg, unit) : null}
                    format={(v) => String(Math.round(v * 10) / 10)}
                    onChange={(v) => updateEx(e.id, { kg: v == null ? null : fromUnit(v, unit) })}
                    className={boxInput}
                  />
                  <span className={boxUnit}>{unit}</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => update({ exercises: [...w.exercises, blank()] })}
          className="mt-1 flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-fill text-[15px] font-semibold"
        >
          <Plus size={16} /> Add exercise
        </button>
      </Card>

      {leftovers.length > 0 && (
        <Card className="mt-3 p-5">
          <p className="text-[13px] font-medium text-ink-2">Lines I skipped</p>
          {leftovers.map((line, i) => (
            <p key={i} className="mt-2 text-[15px] text-ink-2">
              {line}
            </p>
          ))}
        </Card>
      )}

      <Button className="mt-4" onClick={save}>
        {cta}
      </Button>
    </>
  )
}
