import { clear } from 'idb-keyval'
import { ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Header } from '../components/Header'
import { signOut, useAuth } from '../lib/auth'
import { dayKey, WEEKDAYS_LONG } from '../lib/dates'
import { loadDemo } from '../lib/demo'
import { toast } from '../lib/reward'
import { fromUnit, toUnit } from '../lib/units'
import { emptyData, useStore } from '../store'
import type { Goal, Unit } from '../types'
import { Button, Card, NumField, Segmented, Sheet } from '../ui'
import { useUi } from '../uiStore'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-5 pb-2 text-[13px] font-medium text-ink-2">{title}</h2>
      <Card className="divide-y divide-line overflow-hidden">{children}</Card>
    </section>
  )
}

function Row({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-5 py-2">
      <span className="text-[17px]">{label}</span>
      {children}
    </div>
  )
}

function Action({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-between px-5 text-left text-[17px] ${danger ? 'text-down' : ''}`}
    >
      {label}
      {!danger && <ChevronRight size={18} className="text-ink-3" />}
    </button>
  )
}

function exportData() {
  const { goal, goalKg, unit, days, trainDays, plan, sessions } = useStore.getState()
  const blob = new Blob([JSON.stringify({ goal, goalKg, unit, days, trainDays, plan, sessions }, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `kilo-${dayKey()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function SettingsTab() {
  const email = useAuth((s) => s.email)
  const goal = useStore((s) => s.goal) ?? 'maintain'
  const goalKg = useStore((s) => s.goalKg)
  const unit = useStore((s) => s.unit)
  const trainDays = useStore((s) => s.trainDays)
  const hasPlan = useStore((s) => s.plan != null)
  const patch = useStore((s) => s.patch)
  const [confirm, setConfirm] = useState(false)

  const openGym = (gym: 'edit' | 'import') => useUi.setState({ tab: 'gym', gym })

  return (
    <>
      <Header title="Settings" />
      <div className="space-y-7">
        <Group title="Goal">
          <div className="p-3">
            <Segmented<Goal>
              label="Goal"
              value={goal}
              onChange={(g) => patch({ goal: g })}
              options={[
                { id: 'cut', text: 'Cut' },
                { id: 'bulk', text: 'Bulk' },
                { id: 'maintain', text: 'Maintain' },
              ]}
            />
          </div>
          <Row label="Goal weight">
            <label className="flex items-baseline gap-1.5">
              <NumField
                decimal
                fit
                label="Goal weight"
                placeholder="–"
                value={goalKg != null ? toUnit(goalKg, unit) : null}
                format={(v) => v.toFixed(1)}
                onCommit={(v) => patch({ goalKg: v == null ? null : fromUnit(v, unit) })}
                className="text-right text-[17px] font-semibold"
              />
              <span className="text-[15px] text-ink-2">{unit}</span>
            </label>
          </Row>
          <Row label="Units">
            <Segmented<Unit>
              label="Units"
              value={unit}
              onChange={(u) => patch({ unit: u })}
              options={[
                { id: 'kg', text: 'kg' },
                { id: 'lb', text: 'lb' },
              ]}
              className="w-28"
            />
          </Row>
        </Group>

        <Group title="Training">
          <div className="flex justify-between px-4 py-3.5">
            {WEEKDAYS_LONG.map((name, i) => {
              const on = trainDays.includes(i)
              return (
                <button
                  key={name}
                  role="checkbox"
                  aria-checked={on}
                  aria-label={name}
                  onClick={() =>
                    patch({ trainDays: on ? trainDays.filter((d) => d !== i) : [...trainDays, i].sort() })
                  }
                  className={`h-10 w-10 rounded-full text-[14px] font-semibold transition-colors ${on ? 'bg-ink text-white' : 'bg-fill text-ink-2'}`}
                >
                  {name[0]}
                </button>
              )
            })}
          </div>
          {hasPlan && <Action label="Edit plan" onClick={() => openGym('edit')} />}
          <Action label={hasPlan ? 'Paste a new plan' : 'Set up your plan'} onClick={() => openGym('import')} />
        </Group>

        <Group title="Account">
          <Row label={email ?? ''}>
            <span className="text-[13px] text-ink-2">This device</span>
          </Row>
          <Action label="Sign out" onClick={signOut} />
        </Group>

        <Group title="Data">
          <Action
            label="Load sample data"
            onClick={async () => {
              await loadDemo()
              useUi.setState({ tab: 'weight', gym: 'main' })
              toast('Sample data loaded')
            }}
          />
          <Action label="Export my data" onClick={exportData} />
          <Action label="Delete everything" danger onClick={() => setConfirm(true)} />
        </Group>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} label="Delete everything">
        <h2 className="text-[24px] font-bold tracking-[-0.02em]">Delete everything?</h2>
        <p className="mt-2 text-[15px] text-ink-2">
          All weights, photos and workouts on this device. This cannot be undone.
        </p>
        <Button
          className="mt-6 bg-down"
          onClick={async () => {
            await clear()
            useStore.setState(emptyData)
            useUi.setState({ tab: 'weight', gym: 'main' })
          }}
        >
          Delete
        </Button>
        <Button look="soft" className="mt-2" onClick={() => setConfirm(false)}>
          Keep my data
        </Button>
      </Sheet>
    </>
  )
}
