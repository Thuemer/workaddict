## Context

`StatsPage` keeps preset, custom dates and filters in local `useState`. The route unmounts when the user navigates elsewhere, so everything resets to "This week" with all filters on return. Entry data already survives in the react-query cache; only the UI state is lost.

Ranges come from `presetRange(preset)`, a pure, synchronous function in `stats.ts`. Chart buckets come from `timeBuckets`, which supports `day` and `week`. Entries are stored as `entries/<login>/<YYYY-MM>.json`; `useEntries(range)` reads the months in range, and `useAllEntries()` reads every file and is already used by Reassign entries and backups.

## Goals / Non-Goals

**Goals:**
- "Last 2 weeks" and "All time" presets.
- Readable chart for multi-year ranges.
- Range and filters survive navigation and reload within one browser tab, per workspace.

**Non-Goals:**
- Anchored biweekly periods (sprints or pay periods) with prev/next stepping.
- Changing the default preset.
- Persisting DetailTable sort or "show all", or keeping state across browser tabs or restarts.
- Shareable URLs for stats views.

## Decisions

**1. "Last 2 weeks" is calendar-aligned.** `{ from: startOfWeek(addWeeks(now, -1)), to: endOfWeek(now) }`. It matches the other presets, which all align to calendar boundaries. Rejected: a rolling 14 days, which would be the only preset not aligned to the calendar.

**2. All time is resolved from data, outside `presetRange`.** `presetRange` stays pure and covers only the date-only presets. `allTime` is a separate `RangePreset` member that `presetRange` does not handle (its type narrows to `Exclude<RangePreset, 'allTime'>`). In `StatsPage`:
- `preset === 'allTime'` → data from `useAllEntries()`; range = `{ from: startOfDay(min(entry.start)), to: endOfDay(now) }`, or today when there are none.
- otherwise → `useEntries(range)` as today.

Both hooks are called on every render (`enabled` flags) to keep hook order stable; only the active one fetches. `listAllEntries` reads only entry files, and timers live in `timers/`, so "running timers excluded" still holds. Entries starting after the end of today (if any were imported) are filtered out by the same `start <= to` check that `listEntries` applies.

Rejected: passing a huge fixed range (e.g. 1970 → now) to `useEntries`. `monthKeysInRange` would build hundreds of month keys, it would not share the Reassign cache, and the displayed range would show 1970.

**3. Month granularity above 366 days.** `Granularity = 'day' | 'week' | 'month'`; `granularityFor`: ≤62 days → day, ≤366 → week, else month. `timeBuckets` gains `startOfMonth`/`addMonths`. The chart label is `MMM yy` and the tooltip is `MMMM yyyy`. 366 keeps "This year" (and leap years) on weekly bars, so the existing scenario stays valid.

**4. State lives in a `useStatsState()` hook backed by sessionStorage.**
- Key: `workaddict.stats:<scope>`, where scope is `github:<repo>` or `demo` from the session. The repo identifies the workspace; the branch is constant per repo in practice.
- Value: `{ v: 1, preset, custom: { from, to }, filters: { members, projects, tags } }`.
- Read once on mount (lazy `useState` init) and written on every change. All access goes through try/catch, like `session.ts`'s `safe()`.
- Validation on read: `v` must be 1; `preset` must be in `RANGE_PRESETS` or `'custom'`; custom dates must parse with `fromDateKey`; each filter must be `null` or a string array. Anything else falls back to the default for that field.
- Stale ids: pruned against the current options (members, project ids plus `NO_PROJECT`, tag ids plus `NO_TAG`) once the workspace has loaded. If an array ends up empty after pruning but was non-empty before, it becomes `null` (all). An array that was saved empty (user deselected everything) stays empty. Pruning is derived at read time (in a `useMemo`), not written back, so a workspace that loads late cannot wipe the saved filters.

Rejected:
- Module-level store or Layout context: lost on reload.
- localStorage: stale filters would linger for weeks across sessions, which you chose not to have.
- URL params: they need extra "last query" handling for nav links. Shareable links could be a later change.

**5. Dates stored as the preset name.** A remembered `thisWeek` is recomputed from `now` on each render, so it follows the calendar. Custom from/to are date keys (`yyyy-MM-dd`) as they are today.

## Risks / Trade-offs

- [All time is slow on a first load in large workspaces] → Spinner as for other loads; later loads are cheap thanks to the blob-SHA cache and the shared query cache. `useAllEntries` has no refetch interval, so all time does not poll the way `useEntries` does. Acceptable: stats show completed entries, and refetch on window focus can be added to that query if needed.
- [The workspace loads after the stats state is read] → Pruning is derived, never written back (Decision 4).
- [Duplicating a browser tab copies sessionStorage] → The copy starts with the same filters, which is harmless and arguably expected.
- [Month bars hide day-level detail] → Only for ranges over a year; users can narrow the range for detail.
