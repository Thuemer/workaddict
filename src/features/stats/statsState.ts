import { format, fromDateKey } from '../../domain/zoned'
import { useEffect, useState } from 'react'
import { useSessionData } from '../auth/AuthContext'
import type { Session } from '../auth/session'
import { NO_FILTERS, presetRange, RANGE_PRESETS, type RangePreset, type StatsFilters } from './stats'

/**
 * Range and filters of the stats page, remembered for this browser tab (sessionStorage) so that
 * leaving the page or reloading it does not reset them. Kept separately per workspace.
 */
export interface StatsState {
  preset: RangePreset | 'custom'
  /** Date keys (yyyy-MM-dd). */
  custom: { from: string; to: string }
  filters: StatsFilters
}

const VERSION = 1

export function defaultStatsState(now = new Date()): StatsState {
  const r = presetRange('thisMonth', now)
  return {
    preset: 'thisWeek',
    custom: { from: format(r.from, 'yyyy-MM-dd'), to: format(r.to, 'yyyy-MM-dd') },
    filters: NO_FILTERS,
  }
}

export function statsStateKey(session: Session): string {
  return `workaddict.stats:${session.mode === 'github' ? `github:${session.repo}` : 'demo'}`
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null

/** Parses a stored value; each invalid field falls back to its default. */
export function parseStatsState(raw: string | null, now = new Date()): StatsState {
  const fallback = defaultStatsState(now)
  let data: unknown
  try {
    data = raw === null ? null : JSON.parse(raw)
  } catch {
    return fallback
  }
  if (!isRecord(data) || data.v !== VERSION) return fallback

  const preset =
    data.preset === 'custom' || RANGE_PRESETS.includes(data.preset as RangePreset)
      ? (data.preset as StatsState['preset'])
      : fallback.preset
  const dateKey = (x: unknown) => typeof x === 'string' && fromDateKey(x) !== null
  const custom =
    isRecord(data.custom) && dateKey(data.custom.from) && dateKey(data.custom.to)
      ? { from: data.custom.from as string, to: data.custom.to as string }
      : fallback.custom
  const f = isRecord(data.filters) ? data.filters : {}
  const ids = (x: unknown): string[] | null =>
    Array.isArray(x) && x.every((v) => typeof v === 'string') ? x : null
  return { preset, custom, filters: { members: ids(f.members), projects: ids(f.projects), tags: ids(f.tags) } }
}

export function serializeStatsState(state: StatsState): string {
  return JSON.stringify({ v: VERSION, ...state })
}

/**
 * Drops ids that are no longer among the options. A selection emptied this way means "all" again;
 * a selection the user saved empty stays empty.
 */
export function pruneFilters(
  filters: StatsFilters,
  options: { members: string[]; projects: string[]; tags: string[] },
): StatsFilters {
  const prune = (value: string[] | null, valid: string[]) => {
    if (value === null || value.length === 0) return value
    const kept = value.filter((id) => valid.includes(id))
    return kept.length === 0 ? null : kept
  }
  return {
    members: prune(filters.members, options.members),
    projects: prune(filters.projects, options.projects),
    tags: prune(filters.tags, options.tags),
  }
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Storage unavailable or full: the state just isn't remembered.
  }
}

/** Stats page state, restored from and saved to this tab's sessionStorage. */
export function useStatsState() {
  const key = statsStateKey(useSessionData().session)
  const [state, setState] = useState(() => parseStatsState(read(key)))
  useEffect(() => write(key, serializeStatsState(state)), [key, state])
  return [state, setState] as const
}
