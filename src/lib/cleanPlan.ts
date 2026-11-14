// Pasted plans come with links, image links, hashtags, emoji and motivation
// lines. Strip all of that before any reader (AI or rules) sees the text, so
// none of it can turn into fake exercises.

const URL = /https?:\/\/\S+|www\.\S+|\S+\.(?:jpe?g|png|gif|webp|heic|mp4|mov|pdf)\b\S*/gi
const EMOJI = /[\p{Extended_Pictographic}‍️]/gu
// "4x8", "3 x 10", "8 reps", "80 kg", "@ 80", "5 sets"
const SETLIKE = /\d\s*[x×*]\s*\d|\d\s*(?:sets?|serie|serii|seria|reps?|powt\w*|kg|kgs|lbs?)\b|@\s*\d|\b\d+\s*[-–]\s*\d+\b/i
const SPAM = /\b(follow|subscribe|instagram|youtube|tiktok|discount|promo|download|click|link in bio|motivation|motywacja)\b/i

export function cleanPlanText(raw: string): string {
  const out: string[] = []
  for (const line of raw.replace(/\r/g, '').split('\n')) {
    const t = line
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // markdown images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // markdown links
      .replace(URL, ' ')
      .replace(EMOJI, ' ')
      .replace(/#\w+/g, ' ') // hashtags
      .replace(/[*_`~|]+/g, ' ')
      .replace(/^\s*>+\s*/, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!t) {
      // Only a really empty line separates workouts; a line that was all link or emoji just vanishes.
      if (!line.trim() && out.length && out[out.length - 1] !== '') out.push('')
      continue
    }
    if (!/\p{L}/u.test(t) && !/\d/.test(t)) continue
    const words = t.split(' ').length
    if (SPAM.test(t) && !SETLIKE.test(t)) continue
    if (SETLIKE.test(t)) {
      if (words <= 16) out.push(t)
      continue
    }
    // No sets/reps/weight: only a short name line (a workout title or an exercise) can stay.
    if (words <= 5 && !/[!?]/.test(t) && !(words > 3 && /[.,]$/.test(t))) out.push(t)
  }
  while (out[out.length - 1] === '') out.pop()
  return out.join('\n')
}

/** True when an exercise name shares a word with the text the user pasted. */
export function grounded(name: string, source: string): boolean {
  const s = source.toLowerCase()
  const parts = name.toLowerCase().match(/\p{L}{3,}/gu) ?? []
  return parts.length > 0 && parts.some((w) => s.includes(w.slice(0, Math.max(3, w.length - 2))))
}
