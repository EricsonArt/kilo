import { Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { continueAsGuest, continueWithEmail, continueWithGoogle } from '../lib/auth'
import { Button, Sheet } from '../ui'

export function Logo({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
      <rect width="512" height="512" rx="116" fill="#0a0a0a" />
      <circle cx="256" cy="256" r="132" fill="none" stroke="#fff" strokeWidth="44" />
      <circle cx="256" cy="256" r="34" fill="#fff" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export function Welcome() {
  const [sheet, setSheet] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(await continueWithEmail(email, password))
    setBusy(false)
  }

  const field = 'h-14 w-full rounded-[18px] bg-fill px-4 text-[17px]'

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pt-10 pb-[max(28px,env(safe-area-inset-bottom))]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <Logo />
        <h1 className="mt-7 text-[48px] leading-none font-bold tracking-[-0.045em]">Kilo</h1>
        <p className="mt-3 text-[19px] text-ink-2">See yourself change.</p>
      </motion.div>

      <div className="space-y-3">
        <Button
          look="outline"
          onClick={async () => {
            setNote(null)
            const err = await continueWithGoogle()
            if (err) setNote(err === 'no-client-id' ? 'Google sign-in needs a Google client ID. Add it in Settings → Account, or continue without an account.' : err)
          }}
        >
          <GoogleMark /> Continue with Google
        </Button>
        <Button onClick={() => setSheet(true)}>
          <Mail size={19} /> Continue with email
        </Button>
        <Button look="soft" onClick={() => continueAsGuest()}>
          Continue without account
        </Button>
        <p className="min-h-8 pt-1 text-center text-[13px] text-ink-2" aria-live="polite">
          {note ?? 'Your data stays on this phone. No cloud, no sign-up.'}
        </p>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)} label="Continue with email">
        <form onSubmit={submit} className="space-y-3">
          <h2 className="pb-2 text-[24px] font-bold tracking-[-0.02em]">Your email</h2>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            aria-label="Email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <input
            type="password"
            autoComplete="current-password"
            aria-label="Password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <p className={`text-[13px] ${error ? 'font-medium text-down' : 'text-ink-2'}`} aria-live="polite">
            {error ?? 'New here? This creates your account.'}
          </p>
          <Button type="submit" disabled={busy || !email || !password}>
            Continue
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
