import { Wllama } from '@wllama/wllama'
import wasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url'

// A small language model that runs inside the app, with no internet after the
// one-time download (about 400 MB, from Hugging Face). It is cached on the device.

export const MODEL = { repo: 'Qwen/Qwen2.5-0.5B-Instruct-GGUF', file: 'qwen2.5-0.5b-instruct-q4_k_m.gguf' }
const FLAG = 'kilo.deviceModel'

export const deviceModelReady = () => localStorage.getItem(FLAG) === '1'

let engine: Wllama | null = null
const get = () => (engine ??= new Wllama({ default: wasmUrl }, { allowOffline: true, suppressNativeLog: true }))

/** Download the model once. `onProgress` gets 0..1. */
export async function downloadDeviceModel(onProgress: (p: number) => void) {
  const w = get()
  await w.loadModelFromHF(MODEL, {
    n_ctx: 4096,
    progressCallback: ({ loaded, total }) => onProgress(total ? loaded / total : 0),
  })
  localStorage.setItem(FLAG, '1')
}

export async function removeDeviceModel() {
  const w = get()
  const models = await w.modelManager.getModels({ includeInvalid: true })
  await Promise.all(models.map((m) => m.remove()))
  engine = null
  localStorage.removeItem(FLAG)
}

/** Ask the on-device model. Loads it from the cache on first use. */
export async function askDeviceModel(prompt: string): Promise<string> {
  const w = get()
  if (!w.isModelLoaded()) await w.loadModelFromHF(MODEL, { n_ctx: 4096 })
  const res = await w.createChatCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    max_tokens: 1500,
  })
  return res.choices[0]?.message?.content ?? ''
}
