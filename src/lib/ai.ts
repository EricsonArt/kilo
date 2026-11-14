import { grounded } from './cleanPlan'
import { askDeviceModel, asModelId, deviceModelReady, type Status } from './localAi'
import type { ParsedPlan } from './parsePlan'

// Optional AI reading of a pasted plan. The model only fills the plan fields;
// it never designs any UI. Keys stay in this browser (localStorage) and are
// sent only to the provider the user picked.

export type Provider = 'off' | 'device' | 'gemini' | 'custom' | 'local'
export type Cfg = { key: string; model: string; baseUrl: string; ok?: boolean; models?: string[] }
export type AiConfig = { provider: Provider } & Cfg

export const DEFAULTS: Record<Exclude<Provider, 'off'>, Pick<Cfg, 'model' | 'baseUrl'>> = {
  device: { model: 'medium', baseUrl: '' },
  gemini: { model: 'gemini-2.5-flash', baseUrl: '' },
  custom: { model: 'mimo-v2-flash', baseUrl: 'https://api.xiaomimimo.com/v1' },
  local: { model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' },
}

type Store = { active: Provider; cfg: Partial<Record<Provider, Cfg>> }
const KEY = 'kilo.ai2'

export function getStore(): Store {
  try {
    const s = localStorage.getItem(KEY)
    if (s) return JSON.parse(s)
    const old = JSON.parse(localStorage.getItem('kilo.ai') ?? 'null')
    if (old?.provider && old.provider !== 'off')
      return { active: old.provider, cfg: { [old.provider]: { key: old.key ?? '', model: old.model ?? '', baseUrl: old.baseUrl ?? '' } } }
  } catch {
    /* fall through to defaults */
  }
  return { active: 'off', cfg: {} }
}

const save = (s: Store) => localStorage.setItem(KEY, JSON.stringify(s))

export function getCfg(p: Exclude<Provider, 'off'>): Cfg {
  const d = DEFAULTS[p]
  return { key: '', ...d, ...getStore().cfg[p] }
}

export function setCfg(p: Exclude<Provider, 'off'>, patch: Partial<Cfg>) {
  const s = getStore()
  // Changing the key or address means the old "connected" check no longer counts.
  const reset = 'key' in patch || 'baseUrl' in patch ? { ok: false, models: undefined } : {}
  s.cfg[p] = { ...getCfg(p), ...reset, ...patch }
  save(s)
}

export function setActive(p: Provider) {
  const s = getStore()
  s.active = p
  save(s)
}

export function getAi(): AiConfig {
  const { active } = getStore()
  return active === 'off' ? { provider: 'off', key: '', model: '', baseUrl: '' } : { provider: active, ...getCfg(active) }
}

export const aiReady = (c: AiConfig) =>
  c.provider === 'device'
    ? deviceModelReady(asModelId(c.model))
    : c.provider === 'gemini'
      ? !!c.key
      : c.provider === 'custom'
        ? !!c.key && !!c.baseUrl
        : c.provider === 'local'
          ? !!c.baseUrl
          : false

/** Which providers the user can use right now, and why not. */
export function providerStatus(p: Exclude<Provider, 'off'>): { ok: boolean; text: string } {
  const c = getCfg(p)
  if (p === 'device') return deviceModelReady(asModelId(c.model)) ? { ok: true, text: 'Downloaded' } : { ok: false, text: 'Not downloaded' }
  if (p !== 'local' && !c.key) return { ok: false, text: 'Add a key' }
  if (c.ok) return { ok: true, text: c.models?.length ? `Connected · ${c.models.length} models` : 'Connected' }
  return { ok: false, text: 'Not checked' }
}

const PROMPT = `Extract the workout plan from the text. Ignore everything that is not a workout: links, motivation, notes, advertising, nutrition.
Return ONLY JSON in this exact shape:
{"workouts":[{"name":string,"label":string,"weekday":number|null,"exercises":[{"name":string,"sets":number,"reps":string,"kg":number|null}]}]}
Rules:
- One workout per training day or split. "label" is a short uppercase pill name, max 6 characters (UPP, LOW, PUSH, PULL, LEGS, CHEST, TRI+BI, MON...). Same label twice: add A, B.
- "weekday": 0=Monday ... 6=Sunday if the plan names a day, else null.
- Only real exercises, with the name exactly as written. Never invent exercises that are not in the text.
- "sets": integer, 3 if unknown. "reps": string like "8", "8-10", "AMRAP", "60s"; "" if unknown.
- "kg": weight in kilograms (convert pounds); the latest weight if progress is listed; null if none.
Example input:
Upper A
Bench press 4x8 80kg
Row 3x10
Example output:
{"workouts":[{"name":"Upper A","label":"UPP A","weekday":null,"exercises":[{"name":"Bench press","sets":4,"reps":"8","kg":80},{"name":"Row","sets":3,"reps":"10","kg":null}]}]}
Text:
`

function extractJson(text: string) {
  const a = text.indexOf('{')
  const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error('no json')
  return JSON.parse(text.slice(a, b + 1))
}

const str = (v: unknown, n = 80) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
const num = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function clean(raw: any, source: string): ParsedPlan {
  const workouts = (Array.isArray(raw?.workouts) ? raw.workouts : [])
    .map((w: any, i: number) => ({
      name: str(w?.name) || `Workout ${i + 1}`,
      label: str(w?.label, 12).toUpperCase() || String(i + 1),
      weekday: Number.isInteger(w?.weekday) && w.weekday >= 0 && w.weekday <= 6 ? (w.weekday as number) : null,
      exercises: (Array.isArray(w?.exercises) ? w.exercises : [])
        .map((e: any) => ({
          name: str(e?.name, 50),
          sets: Math.min(20, Math.max(1, Math.round(num(e?.sets) ?? 3))),
          reps: str(e?.reps, 12),
          kg: num(e?.kg) || null,
        }))
        // Drop anything the model made up: the name must come from the pasted text.
        .filter((e: { name: string }) => e.name && !/https?:|www\./i.test(e.name) && grounded(e.name, source))
        .slice(0, 20),
    }))
    .filter((w: { exercises: unknown[] }) => w.exercises.length)
  return { workouts, leftovers: [] }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

async function getJson(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
  return data
}

/** Models this provider offers to this key. Throws if the key or address is wrong. */
export async function listModels(p: 'gemini' | 'custom' | 'local', c: Cfg): Promise<string[]> {
  if (p === 'gemini') {
    const data = await getJson('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', {
      headers: { 'x-goog-api-key': c.key },
    })
    return (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: { name: string }) => m.name.replace(/^models\//, ''))
      .filter((n: string) => n.startsWith('gemini'))
  }
  const base = (c.baseUrl || DEFAULTS[p].baseUrl).replace(/\/+$/, '')
  const data = await getJson(`${base}/models`, { headers: c.key ? { Authorization: `Bearer ${c.key}` } : {} })
  return (data.data ?? []).map((m: { id: string }) => m.id)
}

/** Throws with a readable message when the provider, key or answer is bad. */
export async function readPlanWithAi(
  text: string,
  c: AiConfig,
  onStatus: (s: Status) => void = () => {},
): Promise<ParsedPlan> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 90_000)
  try {
    let out: string
    if (c.provider === 'device') {
      const expected = Math.max(150, text.split('\n').filter(Boolean).length * 22)
      out = await askDeviceModel(asModelId(c.model), PROMPT + text, expected, onStatus)
    } else if (c.provider === 'gemini') {
      onStatus({ label: 'Asking Gemini…', pct: null })
      const model = c.model || DEFAULTS.gemini.model
      const data = await getJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': c.key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: PROMPT + text }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0 },
          }),
        },
      )
      out = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    } else {
      onStatus({ label: 'Asking the AI…', pct: null })
      const d = DEFAULTS[c.provider as 'custom' | 'local']
      const base = (c.baseUrl || d.baseUrl).replace(/\/+$/, '')
      const data = await getJson(`${base}/chat/completions`, {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', ...(c.key ? { Authorization: `Bearer ${c.key}` } : {}) },
        body: JSON.stringify({
          model: c.model || d.model,
          temperature: 0,
          messages: [{ role: 'user', content: PROMPT + text }],
        }),
      })
      out = data?.choices?.[0]?.message?.content ?? ''
    }
    const plan = clean(extractJson(out), text)
    if (!plan.workouts.length) throw new Error('no exercises found')
    return plan
  } finally {
    clearTimeout(timer)
  }
}
