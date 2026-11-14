import { Wllama } from '@wllama/wllama'
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url'

// Language models that run inside the app. After the one-time download they
// work with no internet. Bigger = better at reading messy plans, but slower.

export type DeviceModelId = 'small' | 'medium' | 'large'

export const DEVICE_MODELS: Record<DeviceModelId, { name: string; size: string; repo: string; file: string; note: string }> = {
  small: {
    name: 'Qwen 0.5B',
    size: '400 MB',
    repo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
    file: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
    note: 'Fast, weak',
  },
  medium: {
    name: 'Qwen 1.5B',
    size: '1.1 GB',
    repo: 'Qwen/Qwen2.5-1.5B-Instruct-GGUF',
    file: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
    note: 'Balanced, recommended',
  },
  large: {
    name: 'Qwen 3B',
    size: '2 GB',
    repo: 'Qwen/Qwen2.5-3B-Instruct-GGUF',
    file: 'qwen2.5-3b-instruct-q4_k_m.gguf',
    note: 'Best, slow',
  },
}

export const asModelId = (v: string): DeviceModelId => (v in DEVICE_MODELS ? (v as DeviceModelId) : 'medium')

const flag = (id: DeviceModelId) => `kilo.deviceModel.${id}`
export const deviceModelReady = (id: DeviceModelId) => localStorage.getItem(flag(id)) === '1'

let engine: Wllama | null = null
let loaded: DeviceModelId | null = null
const get = () => (engine ??= new Wllama({ default: wasmUrl }, { allowOffline: true, suppressNativeLog: true }))

/** Download one model. `onProgress` gets 0..1. Safe to call again to resume. */
export async function downloadDeviceModel(id: DeviceModelId, onProgress: (p: number) => void) {
  const w = get()
  const { repo, file } = DEVICE_MODELS[id]
  await w.loadModelFromHF(
    { repo, file },
    { n_ctx: 4096, progressCallback: ({ loaded: l, total }) => onProgress(total ? l / total : 0) },
  )
  loaded = id
  localStorage.setItem(flag(id), '1')
}

export async function removeDeviceModel(id: DeviceModelId) {
  const w = get()
  const { file } = DEVICE_MODELS[id]
  const models = await w.modelManager.getModels({ includeInvalid: true })
  await Promise.all(models.filter((m) => m.url.includes(file)).map((m) => m.remove()))
  if (loaded === id) {
    engine = null
    loaded = null
  }
  localStorage.removeItem(flag(id))
}

export type Status = { label: string; pct: number | null }

/** Ask the on-device model. Reports progress while it loads and while it writes. */
export async function askDeviceModel(
  id: DeviceModelId,
  prompt: string,
  expectedTokens: number,
  onStatus: (s: Status) => void,
): Promise<string> {
  const w = get()
  const { repo, file } = DEVICE_MODELS[id]
  if (!w.isModelLoaded() || loaded !== id) {
    onStatus({ label: 'Loading the model…', pct: null })
    await w.loadModelFromHF({ repo, file }, { n_ctx: 4096 })
    loaded = id
  }
  onStatus({ label: 'Reading your plan…', pct: 0 })
  const stream = await w.createChatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 1800,
    response_format: { type: 'json_object' },
    stream: true,
  })
  let out = ''
  let n = 0
  for await (const chunk of stream) {
    out += chunk.choices[0]?.delta?.content ?? ''
    n++
    onStatus({ label: 'Reading your plan…', pct: Math.min(0.95, n / expectedTokens) })
  }
  return out
}
