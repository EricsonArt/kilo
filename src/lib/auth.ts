import { create } from 'zustand'
import { openUser } from '../store'
import { uid } from './id'

// Device-only accounts. This is the stand-in until a cloud backend is
// connected: the email + password flow is real, but accounts and data exist
// only in this browser. Google sign-in needs the backend and is off until then.

const ACCOUNTS = 'kilo.accounts'
const SESSION = 'kilo.session'

type Account = { salt: string; hash: string }

const accounts = (): Record<string, Account> => JSON.parse(localStorage.getItem(ACCOUNTS) ?? '{}')

async function hash(password: string, salt: string) {
  const data = new TextEncoder().encode(salt + password)
  // WebCrypto is missing on plain http (testing over a LAN address).
  if (!crypto.subtle) {
    let h = 5381
    for (const b of data) h = ((h << 5) + h + b) >>> 0
    return h.toString(16)
  }
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const GCLIENT = 'kilo.googleClientId'
export const getGoogleClientId = () =>
  localStorage.getItem(GCLIENT) || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || ''
export const setGoogleClientId = (id: string) => localStorage.setItem(GCLIENT, id.trim())
export const googleAvailable = () => !!getGoogleClientId()

const GUEST = 'device'

async function start(email: string) {
  localStorage.setItem(SESSION, email)
  await openUser(email)
  useAuth.setState({ email })
}

/** No sign-up: data lives on this device only. */
export const continueAsGuest = () => start(GUEST)

type GoogleId = {
  initialize(o: { client_id: string; callback: (r: { credential: string }) => void }): void
  prompt(cb: (n: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void): void
}

function loadGoogle() {
  return new Promise<GoogleId>((resolve, reject) => {
    const w = window as unknown as { google?: { accounts: { id: GoogleId } } }
    if (w.google) return resolve(w.google.accounts.id)
    const el = document.createElement('script')
    el.src = 'https://accounts.google.com/gsi/client'
    el.async = true
    el.onload = () => (w.google ? resolve(w.google.accounts.id) : reject(new Error('Google did not load.')))
    el.onerror = () => reject(new Error('Could not reach Google.'))
    document.head.appendChild(el)
  })
}

/** Google Identity Services, no backend: Google proves the email, data stays on this device. */
export async function continueWithGoogle(): Promise<string | null> {
  const clientId = getGoogleClientId()
  if (!clientId) return 'no-client-id'
  try {
    const g = await loadGoogle()
    return await new Promise<string | null>((resolve) => {
      g.initialize({
        client_id: clientId,
        callback: async (r) => {
          try {
            const body = r.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
            const email = String(JSON.parse(atob(body)).email ?? '').toLowerCase()
            if (!email) return resolve('Google did not share an email.')
            await start(email)
            resolve(null)
          } catch {
            resolve('Google sign-in failed.')
          }
        },
      })
      g.prompt((n) => {
        if (n.isNotDisplayed() || n.isSkippedMoment()) resolve('Google sign-in was closed or blocked. Try again.')
      })
    })
  } catch (e) {
    return (e as Error).message
  }
}

export const useAuth = create<{ email: string | null; ready: boolean }>(() => ({
  email: null,
  ready: false,
}))

/** Restore the last session on app start. */
export async function boot() {
  const email = localStorage.getItem(SESSION)
  await openUser(email)
  useAuth.setState({ email, ready: true })
}

/** One form for both cases: logs in if the email is known, otherwise creates the account. */
export async function continueWithEmail(rawEmail: string, password: string): Promise<string | null> {
  const email = rawEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email.'
  if (password.length < 6) return 'Use at least 6 characters.'

  const all = accounts()
  const known = all[email]
  if (known) {
    if ((await hash(password, known.salt)) !== known.hash) return 'Wrong password.'
  } else {
    const salt = uid()
    all[email] = { salt, hash: await hash(password, salt) }
    localStorage.setItem(ACCOUNTS, JSON.stringify(all))
  }

  localStorage.setItem(SESSION, email)
  await openUser(email)
  useAuth.setState({ email })
  return null
}

export async function signOut() {
  localStorage.removeItem(SESSION)
  await openUser(null)
  useAuth.setState({ email: null })
}
