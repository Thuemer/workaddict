## Context

- All timestamps are stored as ISO-8601 UTC (`src/domain/types.ts`).
- Everything that turns them into clock times or days uses the browser's zone implicitly:
  - date-fns `format`, `startOfDay`, `endOfDay`, `isSameDay`, `isToday`, `startOfMonth` and others (about 22 files);
  - `new Date(y, m, d, h, min)` in `localDateTime` (`src/domain/time.ts:58`);
  - `setHours` in `atLocalTime`;
  - the local getters in the Excel `excelDate` helper.
- Browsers with anti-fingerprinting report `UTC` no matter where the user is. From the page there is no way to learn the real zone.
- One affected user in a Central European team sees everyone's times 2 h early, and their typed times are stored 2 h late.
- `workspace.json` is shared by the whole team. Its codec already keeps unknown top-level keys (`WorkspaceRest.other`), so older clients preserve new fields.
- Device preferences follow the pattern in `src/timeFormat.ts`: localStorage plus `useSyncExternalStore`, with `getTimeFormat()` for non-React code such as exports.

## Goals / Non-Goals

**Goals:**
- One team-wide zone that wins over what the browser reports, so a lying browser cannot shift times.
- Device override for people who really are in another zone.
- Make the zone in use visible, so nobody needs the dev console to diagnose it.
- A leader tool to repair entries already saved with the wrong zone.
- Keep future code from reintroducing browser-zone reliance by accident.

**Non-Goals:**
- Detecting or correcting a wrong system clock (the absolute time is wrong, not only the zone).
- A time zone per member stored in the repository (multi-zone teams use the device override).
- Changing how data is stored: UTC timestamps, UTC month sharding.
- Storing a zone on each entry.

## Decisions

### 1. Team zone lives in `workspace.json` as `timeZone`
- **Why:** it is already team-wide and already read on every page, and its codec already preserves unknown keys for older clients.
- **Alternatives:**
  - `tracker.json`: it holds only schema metadata, and it would be one more file to read.
  - A new `settings.json`: one more file and another cache entry for a single field.
- **Validation:** `timeZone` is valid when it is a non-empty string that `new Intl.DateTimeFormat('en', { timeZone })` accepts. An invalid value is ignored (treated as unset), is counted as a data issue, and is kept in `rest` so it is not destroyed.

### 2. Only team leaders change it, enforced in the adapter
- New adapter operation `setTeamTimeZone(zone | null)`:
  - allowed for team leaders only, otherwise `forbiddenRole`, matching the existing role checks;
  - commit message `settings: team time zone Europe/Vienna (alice)`.
- `updateWorkspace` (projects and tags, allowed for editors) keeps the existing `timeZone` unchanged.
- The GitHub write-access limitation is already disclosed ("Enforcement limitation disclosed").

### 3. Effective zone = device override → team zone → browser zone
- New module `src/timeZone.ts`, shaped like `timeFormat.ts`:
  - device override in localStorage key `workaddict.timeZone`;
  - the team zone is pushed in from the workspace query;
  - it exposes `getZone()` and `useZone()`, plus `browserZone()` and `reportsUtc(zone)`.
- `reportsUtc` is true for `UTC`, `Etc/UTC`, `Etc/GMT`, `GMT`, `Etc/Universal`, `Etc/Zulu`, `Universal`, `Zulu`, `Etc/UCT` and `UCT`.
- When the zone changes, the app re-renders. Query keys that depend on day ranges include the zone, so ranges are computed again.

### 4. Zone-aware helpers in one module, with a lint guard
- **Dependency:** add `@date-fns/tz`. date-fns v4 functions accept `{ in: tz(zone) }`, and `TZDate` builds dates from wall-clock parts in a zone.
- **Wrapper:** new `src/domain/zoned.ts` wraps the zone-dependent calls the app uses (`format`, `startOfDay`, `endOfDay`, `startOfWeek`, `startOfMonth`, `endOfMonth`, `isSameDay`, `isToday`, `isYesterday`, `addDays`, `addMonths`, `subMonths`, building a date from wall-clock parts, reading wall-clock parts). Each takes the zone explicitly, or uses `getZone()`.
- **Pure domain code:** it takes a `zone` parameter so tests stay deterministic.
- **Lint guard:** an ESLint `no-restricted-imports` rule forbids importing those date-fns functions outside `zoned.ts`. It also forbids `Date.prototype` local getters and setters (`getHours`, `setHours`, …) where practical, via `no-restricted-syntax`. This stops the same bug from creeping back.
- **Excel:** `excelDate` reads wall-clock parts in the effective zone instead of local getters.
- **Alternative considered:** setting `process.env.TZ` is not possible in a browser. Formatting only with `Intl` `timeZone` would still leave parsing and day boundaries wrong.

### 5. Tests do not depend on the machine's zone
- The Vitest setup pins `TZ=UTC`. Zone tests pass `Europe/Vienna` explicitly and cover:
  - display;
  - typed times;
  - a day boundary near midnight;
  - the DST change on 2026-10-25.

  The machine's zone then no longer hides bugs; the Windows development machines use CET.

### 6. Default on initialization
- When the app creates `tracker.json` and `workspace.json`, it writes `timeZone: browserZone()` unless `reportsUtc`.
- Existing repositories are not migrated automatically. Settings shows team leaders a "Set team time zone" prompt while it is unset. The prompt is prefilled with their browser zone, or empty if that zone is UTC.

### 7. Diagnosis
- The Settings "Time zone" section shows:
  - the zone in use and where it comes from ("team", "this device" or "browser");
  - the browser's reported zone;
  - a warning line when the zone in use differs from the browser's, or when the browser reports UTC.
- Tracker page notice: shown only when no team zone is set and the browser reports UTC. It is dismissible per device, and for team leaders it links to Settings.

### 8. Entry time shift operation
- **Adapter:** `shiftEntries(login, { from, to }, deltaMs)`.
  - Selects the entries of `login` whose start lies in `[from, to)`.
  - Adds `deltaMs` to `start` and `end`, and sets `updatedAt`.
  - Moves an entry to another month file when its new start falls in another UTC month.
  - Writes everything in one commit, e.g. `shift: 12 entries of simon by -2:00 from 2026-09-01 to 2026-09-28 (benedikt)`.
  - Allowed for team leaders only.
  - Refuses a zero delta and any delta over 24 h.
  - Writes nothing when no entry matches.
  - Reports a conflict when an affected file changed after it was read.
  - The running timer is not touched.
- **Implementation:** it reuses the multi-file atomic write that `reassignEntries` uses.
- **UI:** Settings → Data → "Shift entry times". Pick a member, a from/to date (days in the effective zone), and a signed hours:minutes offset. The preview shows the count and one example "08:00 → 06:00". Then confirm.
- **Alternative considered:** fixing entries one by one in the edit dialog works for a few entries, but not for weeks of them.

## Risks / Trade-offs

- [Wide refactor across about 22 files could miss a call] → the lint guard (Decision 4), plus tests pinned to `TZ=UTC` with Vienna assertions.
- [A member really in another zone sees the team zone and is confused] → the device override. The Settings line always says which zone is in use.
- [`Intl.supportedValuesOf('timeZone')` missing in very old browsers] → fall back to a text field that is checked with `Intl.DateTimeFormat`.
- [A leader shifts the wrong range] → preview before confirming, one commit (easy to revert in Git), and shifting back by the opposite offset restores it.
- [Performance of `TZDate` in long lists and stats] → `@date-fns/tz` caches offsets. Measure the stats page with a year of demo data.
- [Older app versions still use the browser zone] → accepted. They also keep the field. The fix applies once members reload.

## Migration Plan

1. Ship the code. Repositories without `timeZone` behave exactly as before.
2. The team leader opens Settings and sets the team zone (`Europe/Vienna`).
3. The leader uses "Shift entry times" on Simon's affected range with −2:00 (check the preview first).
4. **Rollback:** remove `timeZone` from `workspace.json`, or deploy the previous version. Stored timestamps were never changed by the zone logic.

## Open Questions

- **Wrong system clock:** can the app read GitHub's `Date` response header through CORS to detect clock skew? If not, is the committer date returned after a write usable instead? Worth a separate spike and change.
- Should the shift tool also offer "all entries of member" without a range? Currently a range is required, to avoid accidents.
