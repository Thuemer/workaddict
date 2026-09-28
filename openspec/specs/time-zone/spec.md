# time-zone Specification

## Purpose
TBD - created by archiving change team-time-zone. Update Purpose after archive.
## Requirements
### Requirement: Team time zone
The system SHALL support an optional team time zone, stored as an IANA zone name in the `timeZone` field of `workspace.json`. Only team leaders SHALL be able to set, change, or clear it, in Settings. A value that is not a zone accepted by the browser's `Intl.DateTimeFormat` SHALL be treated as unset, SHALL be counted as a data issue, and SHALL be kept unchanged in the file.

#### Scenario: Leader sets the team zone
- **WHEN** a team leader chooses `Europe/Vienna` as the team time zone in Settings
- **THEN** `workspace.json` contains `"timeZone": "Europe/Vienna"` and all members use this zone after their data refreshes

#### Scenario: Editor cannot set it
- **WHEN** an editor opens Settings
- **THEN** the team time zone is shown read-only

#### Scenario: Invalid stored value
- **WHEN** `workspace.json` contains `"timeZone": "Mars/Olympus"`
- **THEN** the app behaves as if no team time zone is set, the data problem notice counts one issue, and the value stays in the file

#### Scenario: Project edit keeps the zone
- **WHEN** an editor renames a project in a workspace with the team zone `Europe/Vienna`
- **THEN** `workspace.json` still contains `"timeZone": "Europe/Vienna"`

### Requirement: Effective time zone
The system SHALL show and interpret all clock times and calendar days in the effective time zone. It is the device override when one is set, otherwise the team time zone when one is set, otherwise the zone the browser reports. This SHALL apply to entry times, the timer and its start input, manual and inline entry input, day grouping in the entry list, "Team now" daily totals, statistics date ranges and buckets, and every export format (PDF, Excel, OpenDocument, CSV).

#### Scenario: Browser reports UTC but team zone is set
- **WHEN** the team zone is `Europe/Vienna`, the browser reports `UTC`, and an entry is stored with start `2026-09-21T06:00:00Z`
- **THEN** its start is shown as 08:00

#### Scenario: Typed time uses the team zone
- **WHEN** the team zone is `Europe/Vienna`, the browser reports `UTC`, and a user creates a manual entry on 2026-09-21 from 08:00 to 09:00
- **THEN** the entry is stored with start `2026-09-21T06:00:00Z` and end `2026-09-21T07:00:00Z`

#### Scenario: Day boundary
- **WHEN** the team zone is `Europe/Vienna` and an entry starts at `2026-09-21T22:30:00Z`
- **THEN** the entry is listed under 22 September 2026 at 00:30 in the entry list and counted on that day in statistics, even when the browser reports `UTC`

#### Scenario: Daylight saving change
- **WHEN** the team zone is `Europe/Vienna` and a user enters 08:00 to 09:00 on 2026-10-26
- **THEN** the entry is stored with start `2026-10-26T07:00:00Z`

#### Scenario: Excel export
- **WHEN** the team zone is `Europe/Vienna`, the browser reports `UTC`, and an entry starting `2026-09-21T06:00:00Z` is exported to Excel
- **THEN** the start cell shows 08:00

#### Scenario: No team zone
- **WHEN** no team zone and no device override is set
- **THEN** times are shown in the zone the browser reports, as before

### Requirement: Device time zone override
The system SHALL let each user choose, in Settings, between "Team time zone" (default) and a specific IANA zone for the current device. The choice SHALL be remembered on the device and SHALL NOT be written to the repository. When the team has no zone, the default option SHALL read "Browser time zone".

#### Scenario: Travelling member
- **WHEN** the team zone is `Europe/Vienna` and a user chooses `America/New_York` on their laptop
- **THEN** on that laptop an entry stored with start `2026-09-21T12:00:00Z` shows 08:00, other members still see 14:00, and the choice survives a reload

#### Scenario: Default
- **WHEN** a user never changed the setting on a device
- **THEN** "Team time zone" is selected

### Requirement: Time zone diagnosis in Settings
The Settings page SHALL show the effective time zone and its source (team, this device, or browser), and the zone the browser reports. It SHALL show a warning line when the effective zone differs from the browser's zone, or when the browser reports UTC (`UTC`, `Etc/UTC`, `GMT`, `Etc/GMT`, or an equivalent alias).

#### Scenario: Privacy browser with team zone
- **WHEN** the team zone is `Europe/Vienna` and the browser reports `UTC`
- **THEN** Settings shows "Europe/Vienna (team)", "Browser reports: UTC", and a line saying the browser hides its real zone and the team zone is used instead

#### Scenario: Everything matches
- **WHEN** the team zone and the browser zone are both `Europe/Vienna`
- **THEN** no warning line is shown

### Requirement: UTC browser warning
When no team time zone and no device override is set and the browser reports UTC, the tracker page SHALL show a notice that times may be shifted because the browser hides its time zone. The notice SHALL link to Settings for team leaders, SHALL ask other members to tell their team leader, and SHALL be dismissible, remembered on the device.

#### Scenario: Worker on a privacy browser
- **WHEN** a worker whose browser reports `UTC` opens the tracker in a workspace without a team zone
- **THEN** the notice is shown and asks them to tell their team leader

#### Scenario: Team zone set
- **WHEN** the team zone is set
- **THEN** the notice is not shown, whatever the browser reports

### Requirement: Setting the team zone for an existing workspace
While no team time zone is set, Settings SHALL show team leaders a prompt to set it, prefilled with the browser's zone unless the browser reports UTC.

#### Scenario: Leader with a normal browser
- **WHEN** a team leader whose browser reports `Europe/Vienna` opens Settings in a workspace without a team zone
- **THEN** a prompt offers to set `Europe/Vienna` as the team time zone

### Requirement: Shift entry times
Team leaders SHALL be able to shift the start and end of one member's entries in a date range by a signed offset in hours and minutes, under Settings → Data → "Shift entry times". The range SHALL be given as from and to dates in the effective zone, and SHALL select entries whose start falls on those days. Before confirming, the system SHALL show the number of affected entries and one example with its old and new start time. The running timer SHALL NOT be changed.

#### Scenario: Repair a wrong zone
- **WHEN** a team leader shifts `simon`'s entries from 2026-09-01 to 2026-09-28 by −2:00, and one of them started at 10:00
- **THEN** the preview shows the number of entries and "10:00 → 08:00", and after confirming, that entry starts at 08:00 and keeps its duration

#### Scenario: Nothing matches
- **WHEN** the chosen member has no entries in the range
- **THEN** the preview says no entries match and the confirm action is disabled

#### Scenario: Not shown to other roles
- **WHEN** an editor opens Settings
- **THEN** no "Shift entry times" action is shown

