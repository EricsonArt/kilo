import { Check } from 'lucide-react'
import { useState } from 'react'
import {
  aiReady,
  CLAUDE_MODELS,
  getAi,
  getCfg,
  getStore,
  listModels,
  providerStatus,
  readPlanWithAi,
  setActive,
  setCfg,
  type Provider,
} from '../lib/ai'
import {
  asModelId,
  DEVICE_MODELS,
  deviceModelReady,
  downloadDeviceModel,
  removeDeviceModel,
  type DeviceModelId,
} from '../lib/localAi'
import { toast } from '../lib/reward'
import { Action, Group, Note, Row } from './settingsParts'

const input = 'min-w-0 flex-1 text-right text-[15px] font-medium'

const PROVIDERS: { id: Exclude<Provider, 'off'>; name: string }[] = [
  { id: 'device', name: 'On this phone' },
  { id: 'claude', name: 'Claude' },
  { id: 'gemini', name: 'Gemini' },
  { id: 'custom', name: 'MiMo / other API' },
  { id: 'local', name: 'Local server' },
]

export function AiSettings() {
  const [, bump] = useState(0)
  const refresh = () => bump((n) => n + 1)
  const [dl, setDl] = useState<{ id: DeviceModelId; pct: number } | null>(null)
  const [busy, setBusy] = useState(false)

  const active = getStore().active
  const ai = getAi()
  const p = active === 'off' ? null : active

  const connect = async () => {
    if (!p || p === 'device' || busy) return
    setBusy(true)
    try {
      const c = getCfg(p)
      const models = await listModels(p, c)
      if (!models.length) throw new Error('no models found')
      const keep = models.includes(c.model)
        ? c.model
        : (models.find((m) => /flash/.test(m) && !/lite|preview|exp/.test(m)) ?? models[0])
      setCfg(p, { ok: true, models, model: keep })
      toast(`Connected · ${models.length} models`, true)
    } catch (e) {
      setCfg(p, { ok: false, models: undefined })
      toast(`Could not connect: ${(e as Error).message.slice(0, 70)}`)
    }
    setBusy(false)
    refresh()
  }

  const pickModel = async (id: DeviceModelId) => {
    setCfg('device', { model: id })
    refresh()
    if (deviceModelReady(id) || dl) return
    setDl({ id, pct: 0 })
    try {
      await downloadDeviceModel(id, (pct) => setDl({ id, pct }))
      toast('Model ready', true)
    } catch (e) {
      toast(`Download failed: ${(e as Error).message.slice(0, 60)}`)
    }
    setDl(null)
    refresh()
  }

  const test = async () => {
    if (!aiReady(ai)) return toast('Not ready yet.')
    toast('Testing…')
    try {
      const r = await readPlanWithAi('Monday\nBench press 3x8 60kg', ai)
      toast(`AI works: ${r.workouts[0].exercises[0].name}`, true)
    } catch (e) {
      toast(`AI failed: ${(e as Error).message.slice(0, 80)}`)
    }
  }

  const cfg = p ? getCfg(p) : null

  return (
    <Group title="AI for your plan">
      <button
        onClick={() => {
          setActive('off')
          refresh()
        }}
        className="flex min-h-14 w-full items-center justify-between px-5 text-left text-[17px]"
      >
        Off
        {!p && <Check size={18} />}
      </button>
      {PROVIDERS.map(({ id, name }) => {
        const st = providerStatus(id)
        return (
          <button
            key={id}
            onClick={() => {
              setActive(id)
              refresh()
            }}
            className="flex min-h-14 w-full items-center justify-between gap-3 px-5 text-left"
          >
            <span className="text-[17px]">{name}</span>
            <span className="flex items-center gap-2 text-[13px] text-ink-2">
              <span className={`h-2 w-2 rounded-full ${st.ok ? 'bg-up' : 'bg-fill-2'}`} />
              {st.text}
              {p === id && <Check size={18} className="text-ink" />}
            </span>
          </button>
        )
      })}

      {p === 'device' &&
        (Object.keys(DEVICE_MODELS) as DeviceModelId[]).map((id) => {
          const m = DEVICE_MODELS[id]
          const ready = deviceModelReady(id)
          const chosen = asModelId(cfg!.model) === id
          return (
            <div key={id} className="flex min-h-14 items-center justify-between gap-3 px-5 py-2">
              <button onClick={() => pickModel(id)} className="min-w-0 flex-1 text-left">
                <p className="text-[17px]">
                  {m.name} {chosen && ready && <Check size={16} className="inline" />}
                </p>
                <p className="text-[13px] text-ink-2">
                  {m.size} · {m.note}
                </p>
              </button>
              {dl?.id === id ? (
                <span className="num text-[15px] font-semibold">{Math.round(dl.pct * 100)}%</span>
              ) : ready ? (
                <button
                  className="text-[14px] font-semibold text-down"
                  onClick={async () => {
                    await removeDeviceModel(id)
                    refresh()
                  }}
                >
                  Remove model
                </button>
              ) : (
                <button className="rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-white" onClick={() => pickModel(id)}>
                  Download
                </button>
              )}
            </div>
          )
        })}

      {p && p !== 'device' && cfg && (
        <>
          {p !== 'local' && (
            <Row label="API key">
              <input
                type="password"
                aria-label="API key"
                autoComplete="off"
                value={cfg.key}
                onChange={(e) => {
                  setCfg(p, { key: e.target.value.trim() })
                  refresh()
                }}
                className={input}
              />
            </Row>
          )}
          {(p === 'custom' || p === 'local') && (
            <Row label="Base URL">
              <input
                aria-label="Base URL"
                value={cfg.baseUrl}
                onChange={(e) => {
                  setCfg(p, { baseUrl: e.target.value.trim() })
                  refresh()
                }}
                className={input}
              />
            </Row>
          )}
          <Action label={busy ? 'Checking…' : cfg.ok ? 'Check again' : 'Connect'} onClick={connect} />
          <Row label="Model">
            {cfg.models?.length || p === 'claude' ? (
              <select
                aria-label="Model"
                value={cfg.model}
                onChange={(e) => {
                  setCfg(p, { model: e.target.value })
                  refresh()
                }}
                className="max-w-[60%] truncate rounded-full bg-fill px-3 py-1.5 text-[14px] font-medium"
              >
                {(cfg.models?.length ? cfg.models : CLAUDE_MODELS).map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                aria-label="Model"
                value={cfg.model}
                onChange={(e) => {
                  setCfg(p, { model: e.target.value.trim() })
                  refresh()
                }}
                className={input}
              />
            )}
          </Row>
        </>
      )}
      {p && <Action label="Test AI" onClick={test} />}
      <Note>
        {p === 'device'
          ? 'Runs fully on this phone. After one download it needs no key and no internet. Bigger models read messy plans better but are slower.'
          : p === 'claude'
            ? 'Paste an API key from console.anthropic.com (a Claude chat or Claude Code subscription cannot be used inside apps). Sonnet 5.5 is the starter model. The key stays on this device and goes only to Anthropic.'
            : p
            ? 'Connect checks your key and lists the models you can use. The key stays on this device and goes only to the provider you picked.'
            : 'Reads a pasted plan, in any language. Off = built-in reader.'}
      </Note>
    </Group>
  )
}
