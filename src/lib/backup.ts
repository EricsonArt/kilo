import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { get, set } from 'idb-keyval'
import { dayKey } from './dates'
import { pickFile } from './media'
import { toast } from './reward'
import { useStore } from '../store'

// One file with everything: weights, plan, workouts and photos. It moves your
// data between the website and the Android app (each keeps its own storage).

const toDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })

export async function exportBackup() {
  const { goal, goalKg, unit, days, trainDays, plan, sessions } = useStore.getState()
  const media: Record<string, string> = {}
  for (const d of Object.values(days)) {
    if (!d.media) continue
    for (const key of [d.media.id, d.media.thumb]) {
      const blob = await get<Blob>(key)
      if (blob) media[key] = await toDataUrl(blob)
    }
  }
  const json = JSON.stringify({ kilo: 1, goal, goalKg, unit, days, trainDays, plan, sessions, media })
  const name = `kilo-backup-${dayKey()}.json`

  if (Capacitor.isNativePlatform()) {
    const bytes = new TextEncoder().encode(json)
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const file = await Filesystem.writeFile({ path: name, data: btoa(bin), directory: Directory.Cache })
    await Share.share({ title: name, url: file.uri })
    return
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function importBackup() {
  const file = await pickFile('application/json,.json')
  if (!file) return
  try {
    const b = JSON.parse(await file.text())
    if (b?.kilo !== 1 || typeof b.days !== 'object') throw new Error('not a Kilo backup')
    for (const [key, url] of Object.entries(b.media ?? {})) await set(key, await (await fetch(url as string)).blob())
    useStore.getState().patch({
      goal: b.goal ?? null,
      goalKg: b.goalKg ?? null,
      unit: b.unit === 'lb' ? 'lb' : 'kg',
      days: b.days,
      trainDays: b.trainDays ?? [],
      plan: b.plan ?? null,
      sessions: b.sessions ?? [],
      onboarded: true,
    })
    toast('Backup restored', true)
  } catch {
    toast('That file is not a Kilo backup.')
  }
}
