import { clear } from 'idb-keyval'
import { ChevronRight } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { importPhotos, logWeight, moveDay } from '../actions'
import { AI_DEFAULTS, aiReady, getAi, readPlanWithAi, setAi, type Provider } from '../lib/ai'
import { setLang, useLang, type Lang } from '../lib/i18n'
import { Header } from '../components/Header'
import { getGoogleClientId, setGoogleClientId, signOut, useAuth } from '../lib/auth'
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

const input = 'min-w-0 flex-1 text-right text-[15px] font-medium'

function Note({ children }: { children: ReactNode }) {
  return <p className="px-5 py-3 text-[13px] leading-snug text-ink-2">{children}</p>
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
  const lang = useLang((s) => s.lang)
  const days = useStore((s) => s.days)
  const [pending, setPending] = useState<string | null>(null)
  const [span, setSpan] = useState<{ n: number | null; u: 'days' | 'months' | 'years' }>({ n: null, u: 'years' })
  const [ai, setAiState] = useState(getAi)
  const [gid, setGid] = useState(getGoogleClientId)

  // Day 1 = the earliest day with a weight or a photo. It may be long before today.
  const day1 = useMemo(
    () => Object.keys(days).filter((k) => days[k].kg != null || days[k].media).sort()[0] as string | undefined,
    [days],
  )
  const day1Date = day1 ?? pending ?? dayKey()
  const setDay1 = (date: string) => {
    if (!date || date > dayKey()) return
    if (day1) moveDay(day1, date)
    else setPending(date)
  }
  const applySpan = (n: number | null, u: 'days' | 'months' | 'years') => {
    if (!n) return
    const d = new Date()
    if (u === 'days') d.setDate(d.getDate() - n)
    else if (u === 'months') d.setMonth(d.getMonth() - n)
    else d.setFullYear(d.getFullYear() - n)
    setDay1(dayKey(d))
  }
  const updateAi = (p: Partial<ReturnType<typeof getAi>>) => {
    const next = { ...ai, ...p }
    setAi(next)
    setAiState(next)
  }
  const pickProvider = (provider: Provider) =>
    updateAi({ provider, ...(provider === 'off' ? {} : AI_DEFAULTS[provider]) })

  const openGym = (gym: 'edit' | 'import') => useUi.setState({ tab: 'gym', gym })

  return (
    <>
      <Header title="Settings" />
      <div className="space-y-7">
        <Group title="Language">
          <div className="p-3">
            <Segmented<Lang>
              label="Language"
              value={lang}
              onChange={setLang}
              options={[
                { id: 'pl', text: 'Polski' },
                { id: 'en', text: 'English' },
              ]}
            />
          </div>
        </Group>

        <Group title="Start of your journey">
          <Row label="Day 1 date">
            <input
              type="date"
              aria-label="Day 1 date"
              max={dayKey()}
              value={day1Date}
              onChange={(e) => setDay1(e.target.value)}
              className="text-right text-[17px] font-semibold"
            />
          </Row>
          <Row label="Day 1 weight">
            <label className="flex items-baseline gap-1.5">
              <NumField
                decimal
                fit
                label="Day 1 weight"
                placeholder="–"
                value={days[day1Date]?.kg != null ? toUnit(days[day1Date].kg!, unit) : null}
                format={(v) => v.toFixed(1)}
                onCommit={(v) => logWeight(day1Date, v)}
                className="text-right text-[17px] font-semibold"
              />
              <span className="text-[15px] text-ink-2">{unit}</span>
            </label>
          </Row>
          <Row label="Training for">
            <div className="flex items-center gap-2">
              <NumField
                fit
                label="Training for"
                placeholder="–"
                value={span.n}
                format={(v) => String(Math.round(v))}
                onCommit={(v) => {
                  setSpan({ ...span, n: v })
                  applySpan(v, span.u)
                }}
                className="text-right text-[17px] font-semibold"
              />
              <select
                aria-label="Training for"
                value={span.u}
                onChange={(e) => {
                  const u = e.target.value as typeof span.u
                  setSpan({ ...span, u })
                  applySpan(span.n, u)
                }}
                className="rounded-full bg-fill px-3 py-1.5 text-[15px] font-medium"
              >
                <option value="days">days</option>
                <option value="months">months</option>
                <option value="years">years</option>
              </select>
            </div>
          </Row>
          <Note>Not training since today? Set when you really started. Day 1 moves to that date.</Note>
          <Action label="Import photos" onClick={importPhotos} />
          <Note>
            Pick many photos at once. Kilo reads the date each one was taken and sorts them from newest to oldest, one
            per day. The oldest becomes your Day 1 photo and the newest your latest. You can change any date later.
          </Note>
        </Group>

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

        <Group title="AI for your plan">
          <div className="p-3">
            <Segmented<Provider>
              label="Provider"
              value={ai.provider}
              onChange={pickProvider}
              options={[
                { id: 'off', text: 'Off' },
                { id: 'gemini', text: 'Gemini' },
                { id: 'custom', text: 'MiMo' },
                { id: 'local', text: 'Local' },
              ]}
            />
          </div>
          {ai.provider !== 'off' && ai.provider !== 'local' && (
            <Row label="API key">
              <input
                type="password"
                aria-label="API key"
                autoComplete="off"
                value={ai.key}
                onChange={(e) => updateAi({ key: e.target.value.trim() })}
                className={input}
              />
            </Row>
          )}
          {ai.provider !== 'off' && (
            <Row label="Model">
              <input aria-label="Model" value={ai.model} onChange={(e) => updateAi({ model: e.target.value.trim() })} className={input} />
            </Row>
          )}
          {(ai.provider === 'custom' || ai.provider === 'local') && (
            <Row label="Base URL">
              <input aria-label="Base URL" value={ai.baseUrl} onChange={(e) => updateAi({ baseUrl: e.target.value.trim() })} className={input} />
            </Row>
          )}
          {ai.provider !== 'off' && (
            <Action
              label="Test AI"
              onClick={async () => {
                if (!aiReady(ai)) return toast('Fill in the key first.')
                toast('Testing…')
                try {
                  const r = await readPlanWithAi('Monday\nBench press 3x8 60kg', ai)
                  toast(`AI works: ${r.workouts[0].exercises[0].name}`, true)
                } catch (e) {
                  toast(`AI failed: ${(e as Error).message.slice(0, 80)}`)
                }
              }}
            />
          )}
          <Note>
            {ai.provider === 'off'
              ? 'Reads a pasted plan, in any language. Off = built-in reader.'
              : 'Key stays on this device and goes only to the provider you picked. Local = Ollama or LM Studio on your computer (the phone must reach it).'}
          </Note>
        </Group>

        <Group title="Account">
          <Row label="Google client ID">
            <input
              aria-label="Google client ID"
              value={gid}
              onChange={(e) => {
                setGid(e.target.value)
                setGoogleClientId(e.target.value)
              }}
              className={input}
            />
          </Row>
          <Row label={email === 'device' ? 'Guest' : (email ?? '')}>
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
