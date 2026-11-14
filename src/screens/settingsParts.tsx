import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../ui'

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="px-5 pb-2 text-[13px] font-medium text-ink-2">{title}</h2>
      <Card className="divide-y divide-line overflow-hidden">{children}</Card>
    </section>
  )
}

export function Row({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-5 py-2">
      <span className="text-[17px]">{label}</span>
      {children}
    </div>
  )
}

export function Action({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-between px-5 text-left text-[17px] ${danger ? 'text-down' : ''}`}
    >
      {label}
      {!danger && <ChevronRight size={18} className="text-ink-3" />}
    </button>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="px-5 py-3 text-[13px] leading-snug text-ink-2">{children}</p>
}
