import { useCallback, useState } from 'react'

/**
 * Small choices this browser remembers for its viewer, e.g. timer or manual mode. They are
 * conveniences only: when storage is unavailable the defaults apply and a change lasts for the
 * current page view.
 */
const PREFS = {
  /** Which tab the timer bar opens on. */
  entryMode: ['timer', 'manual'],
  /** Whether manual times are entered with an end time or a duration. */
  manualTimeInput: ['end', 'duration'],
  /** The entry list's member filter. */
  entryFilter: ['me', 'everyone'],
  /** Whether the "Team now" block is collapsed. */
  teamNowHidden: ['no', 'yes'],
} as const

type Prefs = typeof PREFS
export type PrefKey = keyof Prefs
export type PrefValue<K extends PrefKey> = Prefs[K][number]

const storageKey = (key: PrefKey) => `workaddict.prefs.${key}`

/** The saved value, or the first allowed value when nothing valid is saved. */
export function readPref<K extends PrefKey>(key: K): PrefValue<K> {
  const allowed: readonly string[] = PREFS[key]
  try {
    const v = localStorage.getItem(storageKey(key))
    if (v !== null && allowed.includes(v)) return v as PrefValue<K>
  } catch {
    // storage unavailable: use the default
  }
  return allowed[0] as PrefValue<K>
}

export function writePref<K extends PrefKey>(key: K, value: PrefValue<K>) {
  try {
    localStorage.setItem(storageKey(key), value)
  } catch {
    // storage unavailable: the choice lasts for this page view only
  }
}

/** A remembered choice as React state. */
export function usePref<K extends PrefKey>(key: K) {
  const [value, setValue] = useState<PrefValue<K>>(() => readPref(key))
  const set = useCallback(
    (next: PrefValue<K>) => {
      setValue(next)
      writePref(key, next)
    },
    [key],
  )
  return [value, set] as const
}
