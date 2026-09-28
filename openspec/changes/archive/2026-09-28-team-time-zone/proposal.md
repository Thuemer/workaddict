## Why

The app shows and reads clock times in whatever time zone the browser reports. Privacy browsers and settings (Firefox "resist fingerprinting", LibreWolf, Tor, Brave, some extensions) report UTC on purpose. A team member using one of them sees everyone else's times 2 hours early (in Central European summer time), and the times they type are saved 2 hours late for everyone else. This already happened in our own team: Simon saw Jakob's and Benedikt's times 2 hours early, and his own entries showed 2 hours late for the others. Nothing in the app warns about it, and the app cannot find the true zone from a browser that hides it. So the app needs its own source of truth for the time zone.

## What Changes

- **Team time zone**:
  - `workspace.json` gets an optional `timeZone` field (IANA name, e.g. `Europe/Vienna`).
  - When it is set, all clock times, days, weeks and months in the app are shown and read in that zone. The browser's reported zone is ignored.
  - This covers the entry list, timer, manual entry, inline editing, "Team now", statistics ranges and buckets, and all exports.
  - Team leaders set it in Settings.
  - When it is not set, the app behaves as today (browser zone).
- **Automatic default**: when the app creates a new data repository, it writes the browser's zone as `timeZone`, unless the browser reports UTC.
- **Device override**: in Settings, each user can choose "Team time zone" (the default) or a specific zone for this device, for example while travelling. The choice is remembered on the device, like the time format.
- **Visible diagnosis**:
  - Settings shows the time zone in use and the zone the browser reports, and says clearly when they differ.
  - When no team time zone is set and the browser reports UTC, a notice on the tracker page says that times may be shifted. For team leaders, the notice links to the setting.
- **Shifting entry times**: team leaders get "Shift entry times" under Settings → Data. It moves one member's entries in a date range by a chosen number of hours and minutes, in one commit. This repairs entries saved with a wrong zone, such as Simon's. It first shows how many entries it will change.
- Stored timestamps stay ISO-8601 UTC. Entry files stay sharded by UTC month. No migration is needed. Older app versions keep the `timeZone` field untouched, because unknown `workspace.json` keys are already preserved.

## Capabilities

### New Capabilities
- `time-zone`: the team time zone, the device override, which zone applies to display and input, the diagnosis in Settings, and the UTC warning notice.

### Modified Capabilities
- `data-storage`:
  - "UTC timestamps" shows times in the effective zone instead of the browser's local zone.
  - "Repository file layout" mentions `timeZone` in `workspace.json`.
  - New requirement: the entry time shift operation.
- `auth-and-workspace`: repository initialization writes the browser's zone as `timeZone` unless it is UTC.
- `app-shell`: the Settings page lists the time zone section and, for team leaders, "Shift entry times".
- `roles-and-permissions`: the permission matrix adds "set the team time zone" and "shift entry times" for team leaders only.

## Impact

- **New dependency**: `@date-fns/tz` (small, from the date-fns authors; works with date-fns v4 through the `in` option and `TZDate`).
- **Code**:
  - `src/domain/time.ts` (building dates from typed times; formatting).
  - Every date-fns call that depends on the zone (`format`, `startOfDay`, `endOfDay`, `isSameDay`, `isToday`, `startOfMonth`, …) in about 22 files: tracker, stats, exports (the Excel `excelDate` in `xlsx.ts`, PDF, ODS, CSV), `hooks.ts` day ranges, `teamNow.ts`.
  - `src/storage/validate.ts` (the `workspace.json` codec).
  - The GitHub and memory adapters (new shift operation, contract tests).
  - Settings page, i18n (de/en).
- **Not affected**: stored data format of entries and timers, month sharding, Clockify import conversion (already UTC).
- **Not covered**: a device whose system clock itself is wrong (not just its zone) still starts timers at the wrong moment. This is noted as an open question in the design.
