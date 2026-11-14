import { del, get, set } from 'idb-keyval'
import { useEffect, useState } from 'react'
import type { Media } from '../types'
import { uid } from './id'

// Photos and videos stay on the device, in IndexedDB. Photos are scaled down
// on save so a year of daily pictures stays small.

const FULL = 1600
const THUMB = 640

async function toJpeg(source: CanvasImageSource, w: number, h: number, max: number) {
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  )
}

/** First frame of a video, for the tile. Resolves null if the browser cannot decode it. */
function videoFrame(file: File) {
  return new Promise<Blob | null>((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    const done = (b: Blob | null) => {
      URL.revokeObjectURL(url)
      resolve(b)
    }
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadeddata = () => (video.currentTime = Math.min(0.1, video.duration || 0))
    video.onseeked = () =>
      toJpeg(video, video.videoWidth, video.videoHeight, THUMB).then(done, () => done(null))
    video.onerror = () => done(null)
    setTimeout(() => done(null), 4000)
    video.src = url
  })
}

export async function saveMedia(file: File): Promise<Media> {
  const id = uid()
  const thumb = `${id}-thumb`

  if (file.type.startsWith('video/')) {
    await set(id, file)
    const frame = await videoFrame(file)
    if (frame) await set(thumb, frame)
    return { id, kind: 'video', thumb }
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  await set(id, await toJpeg(bitmap, bitmap.width, bitmap.height, FULL))
  await set(thumb, await toJpeg(bitmap, bitmap.width, bitmap.height, THUMB))
  bitmap.close()
  return { id, kind: 'image', thumb }
}

export const saveBlob = (key: string, blob: Blob) => set(key, blob)

export async function deleteMedia(m: Media) {
  await Promise.all([del(m.id), del(m.thumb)])
}

const urls = new Map<string, string>()

/** Object URL for a stored blob. Undefined while loading or if there is none. */
export function useMediaUrl(key: string | undefined) {
  const [url, setUrl] = useState(() => (key ? urls.get(key) : undefined))
  useEffect(() => {
    let live = true
    setUrl(key ? urls.get(key) : undefined)
    if (key && !urls.has(key))
      get<Blob>(key).then((blob) => {
        if (!blob) return
        if (!urls.has(key)) urls.set(key, URL.createObjectURL(blob))
        if (live) setUrl(urls.get(key))
      })
    return () => {
      live = false
    }
  }, [key])
  return url
}

/** Open the phone's camera / photo picker. Resolves an empty list if the user backs out. */
export function pickFiles(accept: string, multiple = false) {
  return new Promise<File[]>((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.multiple = multiple
    input.style.display = 'none'
    const done = (f: File[]) => {
      input.remove()
      resolve(f)
    }
    input.onchange = () => done([...(input.files ?? [])])
    input.addEventListener('cancel', () => done([]))
    document.body.appendChild(input)
    input.click()
  })
}

export const pickFile = async (accept: string) => (await pickFiles(accept))[0] ?? null
