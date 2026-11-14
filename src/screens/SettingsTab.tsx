import { clear } from 'idb-keyval'
import { useMemo, useState } from 'react'
import { importPhotos, logWeight, moveDay } from '../actions'
import { exportBackup, importBackup } from '../lib/backup'
import { setLang, useLang, type Lang } from '../lib/i18n'
import { Header } from '../components/Header'
import { getGoogleClientId, setGoogleClientId, signOut, useAuth } from '../lib/auth'
import { dayKey, WEEKDAYS_LONG } from '../lib/dates'
import { loadDemo } from '../lib/demo'
import { toast } from '../lib/reward'
import { fromUnit, toUnit } from '../lib/units'
import { emptyData, useStore } from '../store'
import type { Goal, Unit } from '../types'
import { Button, NumField, Segmented, Sheet } from '../ui'
import { AiSettings } from './AiSettings'
import { Action, Group, Note, Row } from './settingsParts'
import { useUi } from '../uiStore'


const input = 'min-w-0 flex-1 text-right text-[15px] font-medium'

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

        <AiSettings />

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
          <Action label="Export my data" onClick={exportBackup} />
          <Action label="Import backup" onClick={importBackup} />
          <Note>To move your data from the website to the app: export here, send the file to your phone, then import it in the app.</Note>
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
