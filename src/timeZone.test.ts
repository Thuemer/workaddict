import {
  browserZone,
  getZone,
  getZoneSource,
  isValidZone,
  reportsUtc,
  setDeviceZone,
  setTeamZone,
} from './timeZone'

describe('time zone', () => {
  afterEach(() => {
    setDeviceZone(null)
    setTeamZone(null)
  })

  it('recognizes UTC and its aliases', () => {
    for (const z of ['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT', 'etc/universal', 'Zulu'])
      expect(reportsUtc(z)).toBe(true)
    expect(reportsUtc('Europe/Vienna')).toBe(false)
    expect(reportsUtc('Europe/London')).toBe(false)
  })

  it('validates IANA names', () => {
    expect(isValidZone('Europe/Vienna')).toBe(true)
    expect(isValidZone('Mars/Olympus')).toBe(false)
    expect(isValidZone('')).toBe(false)
    expect(isValidZone(42)).toBe(false)
  })

  it('falls back to the browser zone', () => {
    expect(browserZone()).toBe('UTC')
    expect(getZone()).toBe('UTC')
    expect(getZoneSource()).toBe('browser')
  })

  it('prefers the device override over the team zone', () => {
    setTeamZone('Europe/Vienna')
    expect([getZone(), getZoneSource()]).toEqual(['Europe/Vienna', 'team'])
    setDeviceZone('America/New_York')
    expect([getZone(), getZoneSource()]).toEqual(['America/New_York', 'device'])
    expect(localStorage.getItem('workaddict.timeZone')).toBe('America/New_York')
    setDeviceZone(null)
    expect(getZone()).toBe('Europe/Vienna')
    expect(localStorage.getItem('workaddict.timeZone')).toBeNull()
  })

  it('ignores an invalid team zone', () => {
    setTeamZone('Mars/Olympus')
    expect(getZoneSource()).toBe('browser')
  })
})
