import { Check } from 'lucide-react'
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import { useId, useState, type HTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useToast } from './lib/reward'

// Shared building blocks. Every screen is made from these, so spacing, radius
// and motion stay identical across the app.

export const spring = { type: 'spring', stiffness: 420, damping: 36 } as const

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card bg-card shadow-card ${className}`} {...rest} />
}

const LOOKS = {
  primary: 'bg-ink text-white',
  soft: 'bg-fill text-ink',
  outline: 'bg-card text-ink border border-fill-2',
}

export function Button({
  look = 'primary',
  className = '',
  ...rest
}: HTMLMotionProps<'button'> & { look?: keyof typeof LOOKS }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className={`flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-semibold transition-opacity disabled:opacity-30 ${LOOKS[look]} ${className}`}
      {...rest}
    />
  )
}

/** Bottom sheet. Tap outside to close. */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="relative max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[32px] bg-card px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
          >
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-fill-2" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: { id: T; text: string }[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const id = useId()
  return (
    <div role="radiogroup" aria-label={label} className={`flex rounded-full bg-fill p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={`relative h-8 flex-1 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition-colors ${o.id === value ? 'text-ink' : 'text-ink-2'}`}
        >
          {o.id === value && (
            <motion.span
              layoutId={id}
              transition={spring}
              className="absolute inset-0 rounded-full bg-card shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
            />
          )}
          <span className="relative">{o.text}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Number input. Always opens the numeric keypad.
 * `onChange` fires on every keystroke, `onCommit` when the field is left.
 */
export function NumField({
  value,
  onChange,
  onCommit,
  decimal = false,
  placeholder = '0',
  label,
  className = '',
  fit = false,
  format,
  autoFocus,
}: {
  value: number | null
  onChange?: (v: number | null) => void
  onCommit?: (v: number | null) => void
  decimal?: boolean
  placeholder?: string
  label: string
  className?: string
  /** Width follows the content, so a unit can sit right after the number. */
  fit?: boolean
  format?: (v: number) => string
  autoFocus?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value == null ? '' : format ? format(value) : String(value))

  const clean = (t: string) =>
    decimal
      ? t
          .replace(',', '.')
          .replace(/[^\d.]/g, '')
          .replace(/(\..*)\./g, '$1')
          .slice(0, 6)
      : t.replace(/\D/g, '').slice(0, 5)
  const parse = (t: string) => (t === '' || t === '.' ? null : Number(t))

  return (
    <input
      inputMode={decimal ? 'decimal' : 'numeric'}
      enterKeyHint="done"
      autoComplete="off"
      autoFocus={autoFocus}
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      style={fit ? { width: `${Math.max(shown.length || placeholder.length, 1) + 0.2}ch` } : undefined}
      className={`num ${className}`}
      onFocus={(e) => {
        setDraft(shown)
        e.target.select()
      }}
      onChange={(e) => {
        const t = clean(e.target.value)
        setDraft(t)
        onChange?.(parse(t))
      }}
      onBlur={() => {
        const v = parse(draft ?? '')
        setDraft(null)
        onCommit?.(v)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}

/** The one-line confirmation at the top of the screen. */
export function Toaster() {
  const t = useToast((s) => s.toast)
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[70] flex justify-center"
    >
      <AnimatePresence mode="wait">
        {t && (
          <motion.div
            key={t.id}
            initial={{ y: -28, opacity: 0, scale: 0.94 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={spring}
            className="flex h-11 items-center gap-2 rounded-full bg-ink pr-4 pl-3 text-[15px] font-semibold text-white shadow-float"
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full ${t.good ? 'bg-up' : 'bg-white/20'}`}
            >
              <Check size={14} strokeWidth={3} />
            </span>
            {t.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Bathroom scale. Drawn here because no stock icon reads as "body weight". */
export function ScaleIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <path d="M8 11a4 4 0 0 1 8 0" />
      <path d="m12 11 1.6-2.4" />
    </svg>
  )
}

/** Small coloured change marker: green toward the goal, red for real regression, gray otherwise. */
export function Delta({ text, tone }: { text: string; tone: 'up' | 'down' | 'none' }) {
  const look =
    tone === 'up' ? 'bg-up-soft text-up' : tone === 'down' ? 'bg-down-soft text-down' : 'bg-fill text-ink-2'
  return (
    <span className={`num inline-flex h-6 items-center rounded-full px-2 text-[13px] font-semibold ${look}`}>
      {text}
    </span>
  )
}
