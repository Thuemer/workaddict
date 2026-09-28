/**
 * Zone-aware date helpers. Every function works in an explicit IANA zone (default: the
 * effective zone, see `src/timeZone.ts`) instead of the browser's zone, so a browser that
 * reports UTC cannot shift times. Results are plain `Date`s: a `TZDate` would serialize with an
 * offset in `toISOString`, and stored timestamps must stay in `Z` form.
 */
import { TZDate, tz } from '@date-fns/tz'
import {
  addDays as dfAddDays,
  addMonths as dfAddMonths,
  addWeeks as dfAddWeeks,
  differenceInCalendarDays as dfDifferenceInCalendarDays,
  endOfDay as dfEndOfDay,
  endOfMonth as dfEndOfMonth,
  endOfWeek as dfEndOfWeek,
  endOfYear as dfEndOfYear,
  format as dfFormat,
  startOfDay as dfStartOfDay,
  startOfMonth as dfStartOfMonth,
  startOfWeek as dfStartOfWeek,
  startOfYear as dfStartOfYear,
  type Locale,
} from 'date-fns'
import { getZone } from '../timeZone'

type DateLike = Date | string | number

const WEEK = { weekStartsOn: 1 } as const

function plain(d: Date): Date {
  return new Date(d.getTime())
}

function inZone(zone: string) {
  return { in: tz(zone) }
}

export function format(
  date: DateLike,
  pattern: string,
  options: { locale?: Locale } = {},
  zone = getZone(),
): string {
  return dfFormat(new Date(date), pattern, { ...options, ...inZone(zone) })
}

export function startOfDay(date: DateLike, zone = getZone()): Date {
  return plain(dfStartOfDay(new Date(date), inZone(zone)))
}

export function endOfDay(date: DateLike, zone = getZone()): Date {
  return plain(dfEndOfDay(new Date(date), inZone(zone)))
}

/** Weeks start on Monday. */
export function startOfWeek(date: DateLike, zone = getZone()): Date {
  return plain(dfStartOfWeek(new Date(date), { ...WEEK, ...inZone(zone) }))
}

export function endOfWeek(date: DateLike, zone = getZone()): Date {
  return plain(dfEndOfWeek(new Date(date), { ...WEEK, ...inZone(zone) }))
}

export function startOfMonth(date: DateLike, zone = getZone()): Date {
  return plain(dfStartOfMonth(new Date(date), inZone(zone)))
}

export function endOfMonth(date: DateLike, zone = getZone()): Date {
  return plain(dfEndOfMonth(new Date(date), inZone(zone)))
}

export function startOfYear(date: DateLike, zone = getZone()): Date {
  return plain(dfStartOfYear(new Date(date), inZone(zone)))
}

export function endOfYear(date: DateLike, zone = getZone()): Date {
  return plain(dfEndOfYear(new Date(date), inZone(zone)))
}

/** Calendar days in the zone: keeps the wall-clock time across daylight saving changes. */
export function addDays(date: DateLike, amount: number, zone = getZone()): Date {
  return plain(dfAddDays(new Date(date), amount, inZone(zone)))
}

export function addWeeks(date: DateLike, amount: number, zone = getZone()): Date {
  return plain(dfAddWeeks(new Date(date), amount, inZone(zone)))
}

export function addMonths(date: DateLike, amount: number, zone = getZone()): Date {
  return plain(dfAddMonths(new Date(date), amount, inZone(zone)))
}

export function differenceInCalendarDays(a: DateLike, b: DateLike, zone = getZone()): number {
  return dfDifferenceInCalendarDays(new Date(a), new Date(b), inZone(zone))
}

export function isSameDay(a: DateLike, b: DateLike, zone = getZone()): boolean {
  return startOfDay(a, zone).getTime() === startOfDay(b, zone).getTime()
}

export function isToday(date: DateLike, now: DateLike = Date.now(), zone = getZone()): boolean {
  return isSameDay(date, now, zone)
}

export function isYesterday(date: DateLike, now: DateLike = Date.now(), zone = getZone()): boolean {
  return isSameDay(date, addDays(now, -1, zone), zone)
}

export interface WallClock {
  year: number
  /** 0-based, like `Date`. */
  month: number
  day: number
  hours: number
  minutes: number
  seconds: number
}

/** Calendar date and clock time of an instant as shown in the zone. */
export function wallClock(date: DateLike, zone = getZone()): WallClock {
  const d = new TZDate(new Date(date).getTime(), zone)
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hours: d.getHours(),
    minutes: d.getMinutes(),
    seconds: d.getSeconds(),
  }
}

/**
 * The instant at which the zone's clock shows the given date and time. Out-of-range parts roll
 * over like `new Date(y, m, d, h, min)` (e.g. day 32 is the 1st of the next month).
 */
export function fromWallClock(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  zone = getZone(),
): Date {
  return plain(new TZDate(year, month, day, hours, minutes, 0, 0, zone))
}

/** `date` with its clock time in the zone replaced (seconds cleared). */
export function atClockTime(
  date: DateLike,
  hours: number,
  minutes: number,
  zone = getZone(),
): Date {
  const w = wallClock(date, zone)
  return fromWallClock(w.year, w.month, w.day, hours, minutes, zone)
}

/** "2026-09-01": the calendar day of an instant in the zone. */
export function dateKey(date: DateLike, zone = getZone()): string {
  return format(date, 'yyyy-MM-dd', {}, zone)
}

/** Start of the day "yyyy-MM-dd" in the zone, or null when the text is not such a date. */
export function fromDateKey(key: string, zone = getZone()): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!m) return null
  return fromWallClock(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, zone)
}
