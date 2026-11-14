import confetti from 'canvas-confetti'
import { create } from 'zustand'

// Feedback for progress. Three levels, so the big one stays special:
//   tick      – a log was saved (haptic only)
//   pop       – something improved (small burst)
//   celebrate – a milestone: first day, a PR workout, a streak mark

const COLORS = ['#0a0a0a', '#6e6e73', '#d1d1d6', '#16a34a']

export const tick = () => navigator.vibrate?.(8)

export function pop(x = 0.5, y = 0.45) {
  navigator.vibrate?.(14)
  confetti({
    particleCount: 36,
    spread: 70,
    startVelocity: 26,
    scalar: 0.75,
    ticks: 110,
    origin: { x, y },
    colors: COLORS,
    disableForReducedMotion: true,
  })
}

export function celebrate() {
  navigator.vibrate?.([14, 50, 14, 50, 24])
  const shot = (x: number, angle: number) =>
    confetti({
      particleCount: 70,
      angle,
      spread: 62,
      startVelocity: 48,
      scalar: 0.9,
      ticks: 180,
      origin: { x, y: 0.75 },
      colors: COLORS,
      disableForReducedMotion: true,
    })
  shot(0.05, 62)
  shot(0.95, 118)
  setTimeout(() => pop(0.5, 0.4), 180)
}

type Toast = { id: number; text: string; good: boolean }

export const useToast = create<{ toast: Toast | null }>(() => ({ toast: null }))

let timer: ReturnType<typeof setTimeout>

/** A short line at the top of the screen. `good` adds the green mark. */
export function toast(text: string, good = false) {
  clearTimeout(timer)
  useToast.setState({ toast: { id: Date.now(), text, good } })
  timer = setTimeout(() => useToast.setState({ toast: null }), 2400)
}
