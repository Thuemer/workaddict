## 1. Ranges and granularity (stats.ts)

- [x] 1.1 Add `lastTwoWeeks` and `allTime` to `RangePreset` and `RANGE_PRESETS` (order: today, thisWeek, lastWeek, lastTwoWeeks, thisMonth, lastMonth, thisYear, allTime); narrow `presetRange` to `Exclude<RangePreset, 'allTime'>` and add the `lastTwoWeeks` case
- [x] 1.2 Add `allTimeRange(entries, now)` helper: start of day of the earliest entry → end of today, or today when there are no entries
- [x] 1.3 Extend `Granularity` with `month`; `granularityFor`: ≤62 days day, ≤366 week, else month; `timeBuckets` supports month buckets
- [x] 1.4 Unit tests in `stats.test.ts`: lastTwoWeeks on 2026-10-05 → 2026-09-28..2026-10-11; allTimeRange with and without entries; granularity thresholds (62/63, 366/367 days); month buckets across a year boundary

## 2. Remembered state

- [x] 2.1 Create `useStatsState()` (e.g. `src/features/stats/statsState.ts`) holding preset, custom dates and filters, read from and written to sessionStorage under `workaddict.stats:<github:repo|demo>`, with all storage access in try/catch
- [x] 2.2 Validate on read (version, preset, date keys, filter shapes), falling back per field to defaults (`thisWeek`, this-month custom dates, `NO_FILTERS`)
- [x] 2.3 Add a pure `pruneFilters(filters, options)` helper: drop unknown ids (keeping `NO_PROJECT`/`NO_TAG`); an array emptied by pruning becomes `null`; an array saved empty stays empty
- [x] 2.4 Unit tests: round-trip, malformed JSON, unknown preset, bad date keys, pruning cases, separate keys per workspace

## 3. Stats page

- [x] 3.1 Replace the local `useState`s in `StatsPage` with `useStatsState()` and apply `pruneFilters` via `useMemo` against the current options
- [x] 3.2 For `allTime`, use `useAllEntries({ enabled: preset === 'allTime' })` and `useEntries` disabled otherwise (add an `enabled` option to `useEntries`); derive the range with `allTimeRange`; filter out entries starting after the end of today
- [x] 3.3 Make sure the spinner, empty state, displayed range and export header work for all time
- [x] 3.4 Month labels in `HoursBarChart`: axis `MMM yy`, tooltip `MMMM yyyy`

## 4. i18n

- [x] 4.1 Add `stats.presets.lastTwoWeeks` / `allTime` in `en.ts` ("Last 2 weeks", "All time") and `de.ts` ("Letzte 2 Wochen", "Gesamter Zeitraum"); `de.test.ts` passes

## 5. Verify

- [x] 5.1 `npm run lint`, typecheck and tests pass
- [x] 5.2 In the demo workspace: choose a preset and filters, switch to time tracking and back, reload, and check that the state is kept; open a new browser tab and check it starts fresh
- [x] 5.3 In the demo workspace: All time shows the correct start date and month bars when the data spans more than a year
