import { NO_FILTERS, NO_PROJECT } from './stats'
import {
  defaultStatsState,
  parseStatsState,
  pruneFilters,
  serializeStatsState,
  statsStateKey,
  type StatsState,
} from './statsState'

const now = new Date(2026, 9, 5, 10, 0)
const defaults = defaultStatsState(now)

describe('stats state', () => {
  it('defaults to this week, this month as custom dates and no filters', () => {
    expect(defaults).toEqual({
      preset: 'thisWeek',
      custom: { from: '2026-10-01', to: '2026-10-31' },
      filters: NO_FILTERS,
    })
  })

  it('round-trips', () => {
    const state: StatsState = {
      preset: 'lastTwoWeeks',
      custom: { from: '2026-09-01', to: '2026-09-15' },
      filters: { members: ['alice'], projects: [NO_PROJECT, 'web'], tags: [] },
    }
    expect(parseStatsState(serializeStatsState(state), now)).toEqual(state)
  })

  it('falls back to defaults for missing, malformed or other-version values', () => {
    expect(parseStatsState(null, now)).toEqual(defaults)
    expect(parseStatsState('{oops', now)).toEqual(defaults)
    expect(parseStatsState('"text"', now)).toEqual(defaults)
    expect(parseStatsState(JSON.stringify({ v: 2, preset: 'today' }), now)).toEqual(defaults)
  })

  it('falls back per field for an unknown preset, bad dates or bad filters', () => {
    const raw = JSON.stringify({
      v: 1,
      preset: 'nextDecade',
      custom: { from: '2026-13-01x', to: '2026-09-15' },
      filters: { members: 'alice', projects: [1, 2], tags: ['meet'] },
    })
    expect(parseStatsState(raw, now)).toEqual({
      preset: 'thisWeek',
      custom: defaults.custom,
      filters: { members: null, projects: null, tags: ['meet'] },
    })
  })

  it('keeps a separate key per workspace', () => {
    const a = statsStateKey({ mode: 'github', token: 't', repo: 'acme/a', branch: 'main' })
    const b = statsStateKey({ mode: 'github', token: 't', repo: 'acme/b', branch: 'main' })
    expect(a).not.toBe(b)
    expect(statsStateKey({ mode: 'demo' })).not.toBe(a)
  })
})

describe('pruneFilters', () => {
  const options = { members: ['alice', 'bob'], projects: ['web', NO_PROJECT], tags: ['meet'] }

  it('drops ids that no longer exist', () => {
    expect(
      pruneFilters({ members: ['alice', 'carol'], projects: [NO_PROJECT, 'gone'], tags: null }, options),
    ).toEqual({ members: ['alice'], projects: [NO_PROJECT], tags: null })
  })

  it('reverts a selection emptied by pruning to all', () => {
    expect(pruneFilters({ members: null, projects: ['gone'], tags: null }, options).projects).toBeNull()
  })

  it('keeps a selection the user saved empty', () => {
    expect(pruneFilters({ members: [], projects: null, tags: null }, options).members).toEqual([])
  })
})
