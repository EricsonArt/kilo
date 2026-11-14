import { ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Card, spring } from '../ui'

/**
 * One card, several views. Swipe sideways or tap the arrow to move on; the
 * dots show where you are. The card grows and shrinks to fit the current view,
 * so a short chart does not leave empty space for a tall calendar.
 */
export function Pager({ labels, children }: { labels: string[]; children: ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null)
  const pages = useRef<(HTMLDivElement | null)[]>([])
  const [page, setPage] = useState(0)
  const [heights, setHeights] = useState<number[]>([])
  const n = children.length
  const next = (page + 1) % n

  useEffect(() => {
    const ro = new ResizeObserver(() => setHeights(pages.current.map((el) => el?.offsetHeight ?? 0)))
    pages.current.forEach((el) => el && ro.observe(el))
    return () => ro.disconnect()
  }, [n])

  const go = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' })

  return (
    <Card className="relative overflow-hidden">
      <div
        ref={track}
        onScroll={(e) => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        style={{ height: heights[page] || undefined }}
        className="no-scrollbar flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden transition-[height] duration-300 ease-out"
      >
        {children.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              pages.current[i] = el
            }}
            role="group"
            aria-label={labels[i]}
            className="w-full shrink-0 snap-center p-5 pb-3"
          >
            {child}
          </div>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        transition={spring}
        onClick={() => go(next)}
        aria-label={`Show ${labels[next]}`}
        className="absolute top-4 right-4 grid h-9 w-9 place-items-center rounded-full bg-fill"
      >
        <ChevronRight size={18} strokeWidth={2.5} />
      </motion.button>

      <div className="flex justify-center gap-1.5 pt-1 pb-4" aria-hidden="true">
        {children.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === page ? 'w-4 bg-ink' : 'w-1.5 bg-fill-2'}`}
          />
        ))}
      </div>
    </Card>
  )
}
