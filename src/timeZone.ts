import { useSyncExternalStore } from 'react'
import { browserZone, isValidZone } from './domain/zoneNames'

export { browserZone, isValidZone, reportsUtc } from './domain/zoneNames'

/**
 * Time zone used to show and read clock times: the device override, else the team zone from
 * `workspace.json`, else the zone the browser reports. Privacy browsers report UTC on purpose,
 * so a team zone keeps everyone's times aligned whatever the browser claims.
 */
const KEY = 'workaddict.timeZone'
const listeners = new Set<() => void>()

export type ZoneSource = 'device' | 'team' | 'browser'

function readDevice(): string | null {
  try {
    const v = localStorage.getItem(KEY)
    return isValidZone(v) ? v : null
  } catch {
    return null
  }
}

let device: string | null = readDevice()
let team: string | null = null
let snapshot = compute()

function compute(): { zone: string; source: ZoneSource } {
  if (device) return { zone: device, source: 'device' }
  if (team) return { zone: team, source: 'team' }
  return { zone: browserZone(), source: 'browser' }
}

function changed() {
  const next = compute()
  if (next.zone === snapshot.zone && next.source === snapshot.source) return
  snapshot = next
  listeners.forEach((l) => l())
}

/** Effective zone for code outside React (exports, domain defaults). */
export function getZone(): string {
  return snapshot.zone
}

export function getZoneSource(): ZoneSource {
  return snapshot.source
}

export function getDeviceZone(): string | null {
  return device
}

export function getTeamZone(): string | null {
  return team
}

/** Device override; `null` returns to the team (or browser) zone. Remembered on the device. */
export function setDeviceZone(zone: string | null) {
  device = isValidZone(zone) ? zone : null
  try {
    if (device) localStorage.setItem(KEY, device)
    else localStorage.removeItem(KEY)
  } catch {
    // storage unavailable: choice lasts for this session only
  }
  changed()
}

/** Team zone from `workspace.json`, pushed in by the app whenever the workspace loads. */
export function setTeamZone(zone: string | null | undefined) {
  team = isValidZone(zone) ? zone : null
  changed()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Effective zone and where it comes from; re-renders when either changes. */
export function useZoneInfo(): { zone: string; source: ZoneSource } {
  return useSyncExternalStore(subscribe, () => snapshot)
}

export function useZone(): string {
  return useZoneInfo().zone
}

/** All IANA zones the browser knows, or an empty list on browsers without the API. */
export function zoneList(): string[] {
  try {
    const f = (Intl as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
    return f ? f('timeZone') : []
  } catch {
    return []
  }
}
