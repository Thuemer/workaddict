/** IANA time zone names: validation and UTC detection (no app state). */

/** Zone names browsers report when they hide the real zone (or the device really is on UTC). */
const UTC_ALIASES = new Set([
  'utc',
  'etc/utc',
  'etc/uct',
  'uct',
  'gmt',
  'etc/gmt',
  'etc/gmt0',
  'etc/gmt+0',
  'etc/gmt-0',
  'gmt0',
  'gmt+0',
  'gmt-0',
  'etc/greenwich',
  'greenwich',
  'etc/universal',
  'universal',
  'etc/zulu',
  'zulu',
])

export function isValidZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !zone.trim()) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone })
    return true
  } catch {
    return false
  }
}

/** True for UTC and its aliases. */
export function reportsUtc(zone: string): boolean {
  return UTC_ALIASES.has(zone.trim().toLowerCase())
}

/** The zone the browser reports (may be UTC on privacy browsers). */
export function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
