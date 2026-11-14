import { create } from 'zustand'

export type Tab = 'weight' | 'gym' | 'settings'

/** Which screen is showing. Not saved: the app always opens on Weight. */
export const useUi = create<{ tab: Tab; gym: 'main' | 'edit' | 'import' }>(() => ({
  tab: 'weight',
  gym: 'main',
}))
