import { afterEach, describe, expect, it, vi } from 'vitest'
import { readPref, writePref } from './prefs'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('prefs', () => {
  it('falls back to the first allowed value', () => {
    expect(readPref('entryMode')).toBe('timer')
    expect(readPref('manualTimeInput')).toBe('end')
  })

  it('remembers a written value', () => {
    writePref('manualTimeInput', 'duration')
    expect(readPref('manualTimeInput')).toBe('duration')
    expect(localStorage.getItem('workaddict.prefs.manualTimeInput')).toBe('duration')
  })

  it('ignores unknown saved values', () => {
    localStorage.setItem('workaddict.prefs.entryFilter', 'nobody')
    expect(readPref('entryFilter')).toBe('me')
  })

  it('works when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => writePref('teamNowHidden', 'yes')).not.toThrow()
    expect(readPref('teamNowHidden')).toBe('no')
  })
})
