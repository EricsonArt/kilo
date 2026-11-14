import { Dumbbell, SlidersHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Fragment, useEffect } from 'react'
import { useStreak } from './components/Header'
import { boot, useAuth } from './lib/auth'
import { GymTab } from './screens/GymTab'
import { Onboarding } from './screens/Onboarding'
import { SettingsTab } from './screens/SettingsTab'
import { WeightTab } from './screens/WeightTab'
import { Welcome } from './screens/Welcome'
import { startTranslator, useLang } from './lib/i18n'
import { useStore } from './store'
import { ScaleIcon, spring, Toaster } from './ui'
import { useUi, type Tab } from './uiStore'

export default function App() {
  const { email, ready } = useAuth()
  const onboarded = useStore((s) => s.onboarded)

  const lang = useLang((s) => s.lang)

  useEffect(() => {
    boot()
    startTranslator()
  }, [])

  if (!ready) return null
  return (
    <Fragment key={lang}>
      <Toaster />
      {!email ? <Welcome /> : !onboarded ? <Onboarding /> : <Shell />}
    </Fragment>
  )
}

const TABS: { id: Tab; label: string; icon: typeof Dumbbell | typeof ScaleIcon }[] = [
  { id: 'weight', label: 'Weight', icon: ScaleIcon },
  { id: 'gym', label: 'Gym', icon: Dumbbell },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
]

function Shell() {
  const tab = useUi((s) => s.tab)
  const gym = useUi((s) => s.gym)
  const { count } = useStreak()

  // The streak as a number on the home-screen icon (installed app, where supported).
  useEffect(() => {
    if (count > 0) navigator.setAppBadge?.(count).catch(() => {})
    else navigator.clearAppBadge?.().catch(() => {})
  }, [count])

  useEffect(() => {
    window.scrollTo(0, 0) // braces matter: newer browsers return a Promise here
  }, [tab, gym])

  return (
    <>
      <main className="mx-auto max-w-[430px] px-5 pt-[max(20px,env(safe-area-inset-top))] pb-36">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {tab === 'weight' ? <WeightTab /> : tab === 'gym' ? <GymTab /> : <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-28 bg-gradient-to-t from-bg via-bg/85 to-transparent" />

      {/* Icons only, no labels. The filled pill shows where you are. */}
      <nav
        aria-label="Sections"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[max(18px,env(safe-area-inset-bottom))]"
      >
        <div className="pointer-events-auto flex gap-1 rounded-full border border-white/70 bg-white/80 p-1.5 shadow-float backdrop-blur-xl">
          {TABS.map((t) => {
            const on = t.id === tab
            return (
              <button
                key={t.id}
                aria-label={t.label}
                aria-current={on ? 'page' : undefined}
                onClick={() => useUi.setState({ tab: t.id, gym: 'main' })}
                className="relative grid h-12 w-[68px] place-items-center rounded-full"
              >
                {on && (
                  <motion.span layoutId="tab" transition={spring} className="absolute inset-0 rounded-full bg-ink" />
                )}
                <t.icon size={23} className={`relative transition-colors duration-200 ${on ? 'text-white' : 'text-ink-2'}`} />
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
