## 1. Foundation

- [x] 1.1 Add `@date-fns/tz` to dependencies
- [x] 1.2 Pin `TZ=UTC` for the Vitest run (config or `src/test/setup.ts`) so tests never depend on the machine's zone
- [x] 1.3 Create `src/timeZone.ts` (pattern of `src/timeFormat.ts`): device override in localStorage `workaddict.timeZone`, team zone setter, `getZone()`, `useZone()`, `zoneSource()`, `browserZone()`, `reportsUtc(zone)`, `isValidZone(zone)`; unit tests incl. the UTC alias list and invalid names
- [x] 1.4 Create `src/domain/zoned.ts` wrapping the zone-dependent date-fns calls (`format`, `startOfDay`, `endOfDay`, `startOfWeek`, `startOfMonth`, `endOfMonth`, `isSameDay`, `isToday`, `isYesterday`, `addDays`, `addMonths`, `subMonths`, wall-clock build/read) with an explicit zone; unit tests with `Europe/Vienna` incl. midnight boundary and the 2026-10-25 DST change

## 2. Storage

- [x] 2.1 Add optional `timeZone` to the `Workspace` type; decode/encode it in `workspaceCodec` (invalid value → unset, counted as issue, kept in `rest`)
- [x] 2.2 Make `updateWorkspace` keep `timeZone` unchanged in both adapters
- [x] 2.3 Add adapter operation `setTeamTimeZone(zone | null)` (team leaders only, `forbiddenRole` otherwise, commit `settings: team time zone <zone|cleared> (<login>)`) in the GitHub and memory adapters; contract tests
- [x] 2.4 Write `timeZone: browserZone()` on repository initialization unless `reportsUtc`; tests for both cases
- [x] 2.5 Add adapter operation `shiftEntries(login, range, deltaMs)` reusing the atomic multi-file write of `reassignEntries`: month moves, emptied file deletion, commit message format, leader-only, zero/over-24 h refusal, no-match no-write, conflict; contract tests for every scenario in the data-storage delta

## 3. Switch the app to the effective zone

- [x] 3.1 `src/domain/time.ts`: `formatTime`, `localDateTime`, `resolveManualTimes`, `atLocalTime`, `resolveTimerStart` and callers take the zone; update `time.test.ts` with Vienna cases while `TZ=UTC`
- [x] 3.2 Tracker: `EntryList` day grouping, `EntryEditModal`, `InlineFields`, `TimerBar`, `StopOnClosePrompt`, `TeamNow`, `src/domain/teamNow.ts`, `useErrorText`
- [x] 3.3 Data hooks: today range in `src/features/data/hooks.ts` uses the zone, and query keys include the zone so ranges recompute on change
- [x] 3.4 Statistics: `stats.ts` presets and buckets, `StatsPage` table, `Charts`
- [x] 3.5 Exports: `report.ts`, `pdf.ts`, `ods.ts`, `csv.ts`, `xlsx.ts` (`excelDate` reads wall-clock parts in the zone), backup file name date; export tests with a Vienna zone under `TZ=UTC`
- [x] 3.6 Feed the team zone from the workspace query into `src/timeZone.ts` at app level; demo mode leaves it unset
- [x] 3.7 Add ESLint `no-restricted-imports` for the wrapped date-fns functions outside `zoned.ts`, and `no-restricted-syntax` for local `Date` getters/setters where practical; fix remaining hits (`demoData.ts` may be exempted)

## 4. Settings UI

- [x] 4.1 "Time zone" section: effective zone with source, browser's reported zone, warning line on mismatch or UTC report
- [x] 4.2 Device override picker ("Team time zone" / "Browser time zone" default + zone list from `Intl.supportedValuesOf('timeZone')`, text-field fallback validated with `isValidZone`)
- [x] 4.3 Team zone control for team leaders (read-only for others), plus the "Set team time zone" prompt when unset, prefilled with the browser zone unless UTC
- [x] 4.4 Settings → Data → "Shift entry times" for team leaders: member, from/to dates in the effective zone, signed hours:minutes, preview (count + one "old → new" example), disabled confirm on no match, success and conflict feedback
- [x] 4.5 i18n strings in `en.ts` and `de.ts` (German wording per existing terminology: "Teamleitung", "Einträge")
- [x] 4.6 Component tests: settings for leader/editor/worker, override remembered after reload, shift preview and permissions

## 5. Tracker notice

- [x] 5.1 UTC browser notice on the tracker page when no team zone and no override and the browser reports UTC; link to Settings for team leaders, "tell your team leader" for others; dismiss remembered on the device
- [x] 5.2 Tests: shown/hidden per the time-zone spec scenarios

## 6. Wrap-up

- [x] 6.1 Run `npm run lint`, `npm test`, and the build; check the stats page speed with a year of demo data
- [ ] 6.2 Manual check in Firefox with `privacy.resistFingerprinting` on: times match another member's browser once the team zone is set
- [x] 6.3 Update README/help text where it says times are shown in the browser's zone, if anywhere
