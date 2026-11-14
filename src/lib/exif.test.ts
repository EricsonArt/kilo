import { describe, expect, it } from 'vitest'
import { photoDate } from './exif'

function jpegWithDate(date: string) {
  const tiff: number[] = []
  const w16 = (n: number) => tiff.push(n >> 8, n & 255)
  const w32 = (n: number) => tiff.push((n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255)
  tiff.push(0x4d, 0x4d)
  w16(0x2a)
  w32(8)
  w16(1) // IFD0: one entry, the Exif sub-IFD pointer
  w16(0x8769)
  w16(4)
  w32(1)
  w32(26)
  w32(0)
  w16(1) // Exif IFD: DateTimeOriginal
  w16(0x9003)
  w16(2)
  w32(20)
  w32(44)
  w32(0)
  for (const ch of date + '\0') tiff.push(ch.charCodeAt(0))
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
  const len = body.length + 2
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...body, 0xff, 0xd9])
}

describe('photoDate', () => {
  it('reads the EXIF date', async () => {
    const f = new File([jpegWithDate('2024:01:01 10:00:00')], 'a.jpg', { type: 'image/jpeg' })
    expect(await photoDate(f)).toBe('2024-01-01')
  })
  it('falls back to the file date', async () => {
    const f = new File(['x'], 'b.jpg', { type: 'image/jpeg', lastModified: new Date(2023, 5, 3).getTime() })
    expect(await photoDate(f)).toBe('2023-06-03')
  })
})
