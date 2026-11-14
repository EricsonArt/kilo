import { dayKey } from './dates'

// When was this photo taken? Reads the EXIF date from a JPEG. Falls back to the
// file's own date (videos, screenshots, photos without EXIF).

function exifDate(buf: ArrayBuffer): string | null {
  const v = new DataView(buf)
  if (v.byteLength < 12 || v.getUint16(0) !== 0xffd8) return null
  let p = 2
  while (p + 4 < v.byteLength) {
    if (v.getUint8(p) !== 0xff) return null
    const marker = v.getUint8(p + 1)
    const len = v.getUint16(p + 2)
    if (marker === 0xe1 && v.getUint32(p + 4) === 0x45786966) {
      const t = p + 10 // start of the TIFF header
      const le = v.getUint16(t) === 0x4949
      const u16 = (o: number) => v.getUint16(t + o, le)
      const u32 = (o: number) => v.getUint32(t + o, le)
      const text = (o: number, n: number) => {
        let s = ''
        for (let i = 0; i < n && t + o + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(t + o + i))
        return s
      }
      const readIfd = (ifd: number, wanted: number[]) => {
        const found: Record<number, string | number> = {}
        if (ifd + 2 > v.byteLength) return found
        const count = u16(ifd)
        for (let i = 0; i < count; i++) {
          const e = ifd + 2 + i * 12
          const tag = u16(e)
          if (!wanted.includes(tag)) continue
          const type = u16(e + 2)
          const n = u32(e + 4)
          if (type === 2) found[tag] = text(n > 4 ? u32(e + 8) : e + 8, n)
          else found[tag] = u32(e + 8)
        }
        return found
      }
      const main = readIfd(u32(4), [0x8769, 0x0132])
      const sub = typeof main[0x8769] === 'number' ? readIfd(main[0x8769], [0x9003, 0x9004]) : {}
      const raw = String(sub[0x9003] ?? sub[0x9004] ?? main[0x0132] ?? '')
      const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(raw)
      return m && m[1] !== '0000' ? `${m[1]}-${m[2]}-${m[3]}` : null
    }
    p += 2 + len
  }
  return null
}

/** The day a file was shot, as "YYYY-MM-DD". Never in the future. */
export async function photoDate(file: File): Promise<string> {
  let key: string | null = null
  if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) {
    try {
      key = exifDate(await file.slice(0, 256 * 1024).arrayBuffer())
    } catch {
      key = null
    }
  }
  key ??= dayKey(new Date(file.lastModified || Date.now()))
  const today = dayKey()
  return key > today ? today : key
}
