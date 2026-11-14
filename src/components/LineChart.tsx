import { motion } from 'motion/react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

export type ChartPoint = { t: number; v: number; label: string }

/**
 * One smooth line, nothing else. No axes, no grid.
 * `line` is the bold line. `dots` are optional faint raw readings behind it.
 * Tap anywhere to read the exact value for that day.
 */
export function LineChart({
  line,
  dots,
  fmt,
  minSpan,
  className = '',
}: {
  line: ChartPoint[]
  dots?: ChartPoint[]
  fmt: (v: number) => string
  /** Smallest value range the chart will show, so small noise does not look dramatic. */
  minSpan: number
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 })
  const [picked, setPicked] = useState<number | null>(null)
  const gradient = useId().replace(/:/g, '')

  useLayoutEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(box.current!)
    return () => ro.disconnect()
  }, [])

  // A picked point goes back to rest after a moment.
  useEffect(() => {
    if (picked == null) return
    const id = setTimeout(() => setPicked(null), 2600)
    return () => clearTimeout(id)
  }, [picked])

  const readable = dots?.length ? dots : line
  const all = [...line, ...(dots ?? [])]
  const TOP = 36
  const BOTTOM = 8
  const SIDE = 8

  const t0 = Math.min(...all.map((p) => p.t))
  const t1 = Math.max(...all.map((p) => p.t))
  let lo = Math.min(...all.map((p) => p.v))
  let hi = Math.max(...all.map((p) => p.v))
  const grow = Math.max(0, minSpan - (hi - lo)) / 2
  lo -= grow
  hi += grow

  const x = (t: number) => (t1 === t0 ? w - SIDE : SIDE + ((t - t0) / (t1 - t0)) * (w - 2 * SIDE))
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo)) * (h - TOP - BOTTOM)

  const xy = line.map((p) => [x(p.t), y(p.v)] as const)
  const path = xy
    .map(([px, py], i) => {
      if (i === 0) return `M${px},${py}`
      const [qx, qy] = xy[i - 1]
      const mid = (qx + px) / 2
      return `C${mid},${qy} ${mid},${py} ${px},${py}`
    })
    .join('')
  const end = xy[xy.length - 1]
  const sel = picked != null ? readable[Math.min(picked, readable.length - 1)] : null

  return (
    <div
      ref={box}
      className={`relative touch-pan-y select-none ${className}`}
      onPointerDown={(e) => {
        if (!readable.length) return
        const px = e.clientX - e.currentTarget.getBoundingClientRect().left
        let best = 0
        readable.forEach((p, i) => {
          if (Math.abs(x(p.t) - px) < Math.abs(x(readable[best].t) - px)) best = i
        })
        setPicked(best)
      }}
    >
      {w > 0 && line.length > 0 && (
        <>
          <svg width={w} height={h} className="block overflow-visible" aria-hidden="true">
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0a0a0a" stopOpacity="0.1" />
                <stop offset="1" stopColor="#0a0a0a" stopOpacity="0" />
              </linearGradient>
            </defs>
            {xy.length > 1 && (
              <motion.path
                key={`a${path}`}
                d={`${path}L${end[0]},${h}L${xy[0][0]},${h}Z`}
                fill={`url(#${gradient})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              />
            )}
            {dots?.map((p) => <circle key={p.t} cx={x(p.t)} cy={y(p.v)} r={2} fill="#c7c7cc" />)}
            {xy.length > 1 && (
              <motion.path
                key={path}
                d={path}
                fill="none"
                stroke="#0a0a0a"
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}
            {sel ? (
              <>
                <line x1={x(sel.t)} x2={x(sel.t)} y1={TOP - 8} y2={h} stroke="#e5e5ea" strokeWidth={1} />
                <circle cx={x(sel.t)} cy={y(sel.v)} r={5.5} fill="#0a0a0a" stroke="#fff" strokeWidth={3} />
              </>
            ) : (
              <circle cx={end[0]} cy={end[1]} r={5.5} fill="#0a0a0a" stroke="#fff" strokeWidth={3} />
            )}
          </svg>
          {sel && (
            <div
              className="num pointer-events-none absolute top-0 -translate-x-1/2 rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-white"
              style={{ left: Math.min(Math.max(x(sel.t), 52), w - 52) }}
            >
              {fmt(sel.v)}
              <span className="ml-1.5 font-medium text-white/60">{sel.label}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
