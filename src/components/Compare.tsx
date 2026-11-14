import { CalendarDays, Camera, Play, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { addPhoto, moveDay, removePhoto } from '../actions'
import { dayKey, fmtFull, fmtLong } from '../lib/dates'
import { useMediaUrl } from '../lib/media'
import { fmtDelta, fmtWeight } from '../lib/units'
import { goalProgress, movedToward, weightStatus } from '../lib/weight'
import { photoDays, useStore, weightPoints } from '../store'
import type { Media } from '../types'
import { Card, Delta, spring } from '../ui'

/** Picture of a stored photo, or the first frame of a video with a play mark. */
export function Thumb({ media }: { media: Media }) {
  const url = useMediaUrl(media.thumb)
  return (
    <>
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="block h-full w-full bg-fill-2" />
      )}
      {media.kind === 'video' && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
            <Play size={16} fill="currentColor" />
          </span>
        </span>
      )}
    </>
  )
}

/** The photo slot for one day. Gray with a camera until a photo exists. */
export function PhotoTile({
  date,
  hint,
  locked = false,
  auto = false,
  className = '',
}: {
  date: string
  hint?: string
  /** Shown but not tappable (nothing to add here yet). */
  locked?: boolean
  /** The photo sets its own date (EXIF) instead of using this slot's day. */
  auto?: boolean
  className?: string
}) {
  const stored = useStore((s) => s.days[date]?.media)
  const media = locked ? undefined : stored // a locked slot is always the empty placeholder
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.button
        whileTap={locked ? undefined : { scale: 0.97 }}
        transition={spring}
        disabled={locked}
        onClick={() => (media ? setOpen(true) : addPhoto(date, auto))}
        aria-label={media ? `Open photo from ${fmtLong(date)}` : `Add a photo or video for ${fmtLong(date)}`}
        className={`relative grid aspect-[3/4] place-items-center overflow-hidden rounded-[20px] bg-fill text-ink-3 ${className}`}
      >
        {media ? (
          <Thumb media={media} />
        ) : (
          <span className="flex flex-col items-center gap-2">
            {!locked && <Camera size={26} strokeWidth={1.75} />}
            {hint && <span className="text-[13px] font-medium">{hint}</span>}
          </span>
        )}
      </motion.button>
      <Viewer date={open ? date : null} onClose={() => setOpen(false)} />
    </>
  )
}

/** Full-screen photo or video, with replace and delete. */
function Viewer({ date, onClose }: { date: string | null; onClose: () => void }) {
  const media = useStore((s) => (date ? s.days[date]?.media : undefined))
  const url = useMediaUrl(media?.id)

  return createPortal(
    <AnimatePresence>
      {date && media && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))] pb-2 text-white">
            <p className="pl-1 text-[15px] font-semibold">{fmtLong(date)}</p>
            <button aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white/15">
              <X size={20} />
            </button>
          </div>
          <div className="min-h-0 flex-1" onClick={onClose}>
            {url &&
              (media.kind === 'video' ? (
                <video
                  src={url}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img src={url} alt="" className="h-full w-full object-contain" />
              ))}
          </div>
          <div className="flex gap-3 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
            <button
              onClick={() => {
                onClose()
                addPhoto(date)
              }}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/15 text-[15px] font-semibold text-white"
            >
              <Camera size={18} /> Replace
            </button>
            <label className="relative flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white/15 text-[15px] font-semibold text-white">
              <CalendarDays size={18} /> Change date
              <input
                type="date"
                aria-label="Change date"
                max={dayKey()}
                value={date}
                onChange={(e) => {
                  if (!e.target.value) return
                  onClose()
                  moveDay(date, e.target.value)
                }}
                className="absolute inset-0 h-full w-full opacity-0"
              />
            </label>
            <button
              aria-label="Delete photo"
              onClick={() => {
                onClose()
                removePhoto(date)
              }}
              className="grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/**
 * Day 1 on the left, now on the right. The single most motivating view in the
 * app, so it sits at the top: first photo vs latest photo, start weight vs
 * current weight, and the change between them.
 */
export function Compare({ bare = false }: { bare?: boolean }) {
  const days = useStore((s) => s.days)
  const unit = useStore((s) => s.unit)
  const goal = useStore((s) => s.goal) ?? 'maintain'
  const goalKg = useStore((s) => s.goalKg)
  const today = dayKey()

  const points = useMemo(() => weightPoints(days), [days])
  const photos = useMemo(() => photoDays(days), [days])
  const now = points[points.length - 1]

  const firstPhoto = photos[0]
  // Day 1 is the earliest day with a photo or a weight. It can be set in the past.
  const day1 = [firstPhoto, points[0]?.date].filter(Boolean).sort()[0]
  const start = day1 && days[day1]?.kg != null ? { date: day1, kg: days[day1].kg! } : points[0]
  const lastPhoto = photos.length > 1 ? photos[photos.length - 1] : undefined
  const rightDate = lastPhoto ?? now?.date

  const change = points.length > 1 ? now.kg - start.kg : null
  const tone =
    change == null
      ? 'none'
      : movedToward(change, goal)
        ? 'up'
        : weightStatus(points, goal).verdict === 'bad'
          ? 'down'
          : 'none'
  const progress = goalKg != null && start ? goalProgress(start.kg, now.kg, goalKg) : null

  const body = (
    <>
      <div className="relative grid grid-cols-2 gap-2">
        <PhotoTile date={firstPhoto ?? today} hint="Day 1 photo" auto />
        {/* The right slot opens once there is a Day 1 photo from an earlier day. */}
        <PhotoTile
          date={lastPhoto ?? today}
          hint={firstPhoto === today ? 'Next photo' : 'Today'}
          locked={!firstPhoto || (firstPhoto === today && !lastPhoto)}
          auto
        />
        {change != null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-card p-1 shadow-float">
            <Delta text={`${fmtDelta(change, unit)} ${unit}`} tone={tone} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 px-2 pt-3 pb-1">
        <Side label={day1 && day1 !== today ? fmtFull(day1) : 'Day 1'} kg={start?.kg} unit={unit} muted />
        <Side label={!rightDate || rightDate === today ? 'Today' : fmtFull(rightDate)} kg={now?.kg} unit={unit} right />
      </div>

      {progress != null && goalKg != null && (
        <div className="px-2 pt-3 pb-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-fill">
            <motion.div
              className="h-full rounded-full bg-ink"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ ...spring, delay: 0.2 }}
            />
          </div>
          <div className="mt-2 flex justify-between text-[13px]">
            <span className="num font-semibold">{Math.round(progress * 100)}%</span>
            <span className="num text-ink-2">
              Goal {fmtWeight(goalKg, unit)} {unit}
            </span>
          </div>
        </div>
      )}
    </>
  )

  return bare ? body : <Card className="p-3">{body}</Card>
}

function Side({
  label,
  kg,
  unit,
  muted,
  right,
}: {
  label: string
  kg: number | undefined
  unit: 'kg' | 'lb'
  muted?: boolean
  right?: boolean
}) {
  return (
    <div className={right ? 'text-right' : ''}>
      <p className="text-[13px] font-medium text-ink-2">{label}</p>
      <p className={`num text-[24px] leading-tight font-semibold ${muted ? 'text-ink-2' : ''}`}>
        {kg != null ? fmtWeight(kg, unit) : '—'}
        <span className="ml-1 text-[15px] font-medium text-ink-2">{unit}</span>
      </p>
    </div>
  )
}
