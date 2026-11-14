import { askDeviceModel, deviceModelReady } from './localAi'
import type { ParsedPlan } from './parsePlan'

// Optional AI reading of a pasted plan. The model only fills the plan fields;
// it never designs any UI. Keys stay in this browser (localStorage) and are
// sent only to the provider the user picked.

export type Provider = 'off' | 'device' | 'gemini' | 'custom' | 'local'
export type AiConfig = { provider: Provider; key: string; model: string; baseUrl: string }

export const AI_DEFAULTS: Record<Exclude<Provider, 'off' | 'device'>, Pick<AiConfig, 'model' | 'baseUrl'>> = {
  gemini: { model: 'gemini-2.5-flash', baseUrl: '' },
  custom: { model: 'mimo-v2-flash', baseUrl: 'https://api.xiaomimimo.com/v1' },
  local: { model: 'llama3.2', baseUrl: 'http://localhost:11434/v1' },
}

const KEY = 'kilo.ai'

export function getAi(): AiConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return { provider: 'off', key: '', model: '', baseUrl: '', ...raw }
  } catch {
    return { provider: 'off', key: '', model: '', baseUrl: '' }
  }
}

export const setAi = (c: AiConfig) => localStorage.setItem(KEY, JSON.stringify(c))

export const aiReady = (c: AiConfig) =>
  c.provider === 'device'
    ? deviceModelReady()
    : c.provider === 'gemini'
    ? !!c.key
    : c.provider === 'custom'
      ? !!c.key && !!c.baseUrl
      : c.provider === 'local'
        ? !!c.baseUrl
        : false

const PROMPT = `You read a workout plan a user pasted. It may be in any language and any format.
Return ONLY JSON, no markdown, exactly this shape:
{"workouts":[{"name":string,"label":string,"weekday":number|null,"exercises":[{"name":string,"sets":number,"reps":string,"kg":number|null}]}],"leftovers":[string]}
Rules:
- One workout per training day or split (Upper A, Push, Monday...). "label" is a short pill name, max 6 characters, uppercase (UPP, LOW, PUSH, PULL, LEGS, CHEST, TRI+BI, or MON...). Same label twice: add A, B.
- "weekday": 0=Monday ... 6=Sunday if the plan names a day, else null.
- "sets": integer, 3 if unknown. "reps": string such as "8", "8-10", "AMRAP", "60s"; "" if unknown.
- "kg": the weight in kilograms (convert pounds), or the latest weight if progress is listed; null for bodyweight or unknown.
- Keep exercise names as written, in the user's language.
- Skip rest days. Lines you cannot place (notes, warm-ups) go to "leftovers".
Plan:
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function clean(raw: any): ParsedPlan {
  const workouts = (Array.isArray(raw?.workouts) ? raw.workouts : [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((w: any, i: number) => ({
      name: str(w?.name) || `Workout ${i + 1}`,
      label: str(w?.label, 12).toUpperCase() || String(i + 1),
      weekday: Number.isInteger(w?.weekday) && w.weekday >= 0 && w.weekday <= 6 ? (w.weekday as number) : null,
      exercises: (Array.isArray(w?.exercises) ? w.exercises : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((e: any) => ({
          name: str(e?.name),
          sets: Math.min(20, Math.max(1, Math.round(num(e?.sets) ?? 3))),
          reps: str(e?.reps, 12),
          kg: num(e?.kg) || null,
        }))
        .filter((e: { name: string }) => e.name),
    }))
    .filter((w: { exercises: unknown[] }) => w.exercises.length)
  const leftovers = (Array.isArray(raw?.leftovers) ? raw.leftovers : []).map((x: unknown) => str(x)).filter(Boolean)
  return { workouts, leftovers }
}

/** Throws with a readable message when the provider, key or answer is bad. */
export async function readPlanWithAi(text: string, c: AiConfig): Promise<ParsedPlan> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 60_000)
  try {
    let out: string
    if (c.provider === 'device') {
      out = await askDeviceModel(PROMPT + text)
    } else if (c.provider === 'gemini') {
      const model = c.model || AI_DEFAULTS.gemini.model
      const res = await fetch(
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
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
      out = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
    } else {
      const d = AI_DEFAULTS[c.provider as 'custom' | 'local']
      const base = (c.baseUrl || d.baseUrl).replace(/\/+$/, '')
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', ...(c.key ? { Authorization: `Bearer ${c.key}` } : {}) },
        body: JSON.stringify({
          model: c.model || d.model,
          temperature: 0,
          messages: [{ role: 'user', content: PROMPT + text }],
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
      out = data?.choices?.[0]?.message?.content ?? ''
    }
    const plan = clean(extractJson(out))
    if (!plan.workouts.length) throw new Error('empty')
    return plan
  } finally {
    clearTimeout(timer)
  }
}
