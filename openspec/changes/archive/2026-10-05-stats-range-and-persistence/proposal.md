## Why

Users asked for three things on the stats page: a two-week range (many review their work in two-week blocks), a way to see all their data at once, and for the page to stop resetting its range and filters every time they switch to another tab such as time tracking and come back.

## What Changes

- Add a **Last 2 weeks** range preset: Monday of last week through Sunday of this week (calendar-aligned like the other presets). "This week" stays the default.
- Add an **All time** range preset: from the start of the earliest entry through the end of today (just today when there are no entries).
- Add monthly bars to the hours chart for ranges longer than 366 days, so all-time ranges stay readable. Ranges up to 62 days keep daily bars, and up to 366 days keep weekly bars.
- Keep the selected range preset, custom from/to dates, and member/project/tag filters for the browser tab's session, separately per workspace, so switching tabs or reloading the page does not reset them. Saved values that are no longer valid fall back to defaults.
- New range labels in English and German.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `statistics`: the date range filter gains "Last 2 weeks" and "All time"; the hours chart gains monthly bars for ranges over 366 days; new requirement that range and filters survive leaving and returning to the stats page.

## Impact

- `src/features/stats/stats.ts`: new presets, `month` granularity, bucket logic.
- `src/features/stats/StatsPage.tsx`: state moved to a sessionStorage-backed hook; all-time range uses the shared all-entries query.
- `src/features/stats/Charts.tsx`: month axis labels.
- `src/i18n/en.ts`, `src/i18n/de.ts`: new preset labels.
- All-time reads every entry file. Repeat loads are cheap thanks to the blob-SHA cache and the query cache shared with Reassign entries, but the first load can be slow on large workspaces.
