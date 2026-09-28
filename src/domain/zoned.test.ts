import {
  addDays,
  atClockTime,
  dateKey,
  differenceInCalendarDays,
  endOfDay,
  format,
  fromDateKey,
  fromWallClock,
  isSameDay,
  isYesterday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  wallClock,
} from './zoned'

const VIENNA = 'Europe/Vienna'

describe('zoned helpers', () => {
  it('runs with the process pinned to UTC', () => {
    expect(new Date('2026-09-21T06:00:00Z').getHours()).toBe(6)
  })

  it('formats in the zone, not the process zone', () => {
    expect(format('2026-09-21T06:00:00Z', 'HH:mm', {}, VIENNA)).toBe('08:00')
    expect(format('2026-09-21T06:00:00Z', 'HH:mm', {}, 'UTC')).toBe('06:00')
  })

  it('finds day boundaries in the zone', () => {
    // 00:30 in Vienna on 22 September
    const late = '2026-09-21T22:30:00Z'
    expect(startOfDay(late, VIENNA).toISOString()).toBe('2026-09-21T22:00:00.000Z')
    expect(endOfDay(late, VIENNA).toISOString()).toBe('2026-09-22T21:59:59.999Z')
    expect(dateKey(late, VIENNA)).toBe('2026-09-22')
    expect(dateKey(late, 'UTC')).toBe('2026-09-21')
  })

  it('returns plain Dates that serialize in Z form', () => {
    const d = startOfDay('2026-09-21T10:00:00Z', VIENNA)
    expect(Object.getPrototypeOf(d)).toBe(Date.prototype)
    expect(d.toISOString()).toMatch(/Z$/)
  })

  it('builds instants from wall-clock parts across the DST change', () => {
    expect(fromWallClock(2026, 8, 21, 8, 0, VIENNA).toISOString()).toBe('2026-09-21T06:00:00.000Z')
    // Daylight saving time ends on 2026-10-25.
    expect(fromWallClock(2026, 9, 26, 8, 0, VIENNA).toISOString()).toBe('2026-10-26T07:00:00.000Z')
    expect(fromWallClock(2026, 8, 31, 8, 0, VIENNA).toISOString()).toBe('2026-10-01T06:00:00.000Z')
  })

  it('reads wall-clock parts in the zone', () => {
    expect(wallClock('2026-09-21T22:30:00Z', VIENNA)).toEqual({
      year: 2026,
      month: 8,
      day: 22,
      hours: 0,
      minutes: 30,
      seconds: 0,
    })
  })

  it('keeps the clock time when adding days over the DST change', () => {
    const before = fromWallClock(2026, 9, 24, 8, 0, VIENNA)
    expect(format(addDays(before, 1, VIENNA), 'yyyy-MM-dd HH:mm', {}, VIENNA)).toBe(
      '2026-10-25 08:00',
    )
    // The DST day has 25 hours.
    const day = startOfDay('2026-10-25T12:00:00Z', VIENNA)
    expect(endOfDay(day, VIENNA).getTime() - day.getTime() + 1).toBe(25 * 3_600_000)
  })

  it('replaces the clock time on the zone day', () => {
    expect(atClockTime('2026-09-21T22:30:00Z', 9, 15, VIENNA).toISOString()).toBe(
      '2026-09-22T07:15:00.000Z',
    )
  })

  it('compares calendar days in the zone', () => {
    expect(isSameDay('2026-09-21T21:00:00Z', '2026-09-21T22:30:00Z', VIENNA)).toBe(false)
    expect(isSameDay('2026-09-21T21:00:00Z', '2026-09-21T22:30:00Z', 'UTC')).toBe(true)
    expect(isYesterday('2026-09-21T21:00:00Z', '2026-09-21T22:30:00Z', VIENNA)).toBe(true)
    expect(differenceInCalendarDays('2026-09-21T22:30:00Z', '2026-09-21T21:00:00Z', VIENNA)).toBe(1)
  })

  it('finds week and month starts in the zone', () => {
    // Monday 21 September 2026, 00:30 in Vienna is still Sunday in UTC.
    expect(startOfWeek('2026-09-20T22:30:00Z', VIENNA).toISOString()).toBe(
      '2026-09-20T22:00:00.000Z',
    )
    expect(startOfMonth('2026-09-30T22:30:00Z', VIENNA).toISOString()).toBe(
      '2026-09-30T22:00:00.000Z',
    )
  })

  it('parses date keys as the start of that day in the zone', () => {
    expect(fromDateKey('2026-09-22', VIENNA)?.toISOString()).toBe('2026-09-21T22:00:00.000Z')
    expect(fromDateKey('22.09.2026', VIENNA)).toBeNull()
  })
})
