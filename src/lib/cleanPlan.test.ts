import { describe, expect, it } from 'vitest'
import { cleanPlanText, grounded } from './cleanPlan'

describe('cleanPlanText', () => {
  it('drops links, images, hashtags and motivation', () => {
    const raw = `Push Day 💪🔥
https://example.com/photo.jpg
No pain no gain, keep going and never give up today!
Bench press 4x8 80kg #gains
Follow me on instagram for more
![img](https://x.com/a.png)
Overhead press 3 x 10

Pull
Row 4x8`
    expect(cleanPlanText(raw)).toBe('Push Day\nBench press 4x8 80kg\nOverhead press 3 x 10\n\nPull\nRow 4x8')
  })
  it('grounds names in the source', () => {
    expect(grounded('Bench press', 'bench press 4x8')).toBe(true)
    expect(grounded('Unicorn curl', 'bench press 4x8')).toBe(false)
  })
})
