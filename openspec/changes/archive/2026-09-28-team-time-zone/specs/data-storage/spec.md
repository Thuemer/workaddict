## MODIFIED Requirements

### Requirement: Repository file layout
The GitHub adapter SHALL store data as JSON files: `tracker.json`, `workspace.json` (projects, tags, and the optional team `timeZone`), `roles.json` (role assignments, optional), `entries/<login>/<YYYY-MM>.json` (a user's entries whose start falls in that UTC month), and `timers/<login>.json` (the user's running timer or `null`).

#### Scenario: Saving an entry
- **WHEN** user `alice` saves an entry starting 2026-09-21T08:00:00Z
- **THEN** the entry is stored in `entries/alice/2026-09.json`

#### Scenario: Entry spanning months
- **WHEN** an entry starts 2026-09-30T22:00:00Z and ends 2026-10-01T01:00:00Z
- **THEN** the entry is stored only in the file for 2026-09

#### Scenario: Editor saves another member's entry
- **WHEN** editor `carol` saves `bob`'s entry starting 2026-09-21T08:00:00Z
- **THEN** the entry is stored in `entries/bob/2026-09.json`

#### Scenario: Role assignment
- **WHEN** an owner assigns `bob` the role editor
- **THEN** `roles.json` contains `"bob": "editor"`

#### Scenario: Team time zone
- **WHEN** a team leader sets the team time zone to `Europe/Vienna`
- **THEN** `workspace.json` contains `"timeZone": "Europe/Vienna"` next to its projects and tags

### Requirement: UTC timestamps
The system SHALL store all timestamps as ISO-8601 UTC strings and SHALL display them in the effective time zone (device override, else team time zone, else the zone the browser reports).

#### Scenario: Display in local time
- **WHEN** an entry stored with start `2026-09-21T08:00:00Z` is shown to a user in Europe/Berlin (UTC+2) and no team time zone or device override is set
- **THEN** the start time is displayed as 10:00

#### Scenario: Display in the team time zone
- **WHEN** an entry stored with start `2026-09-21T08:00:00Z` is shown in a workspace whose team time zone is `Europe/Vienna`, on a browser that reports `UTC`
- **THEN** the start time is displayed as 10:00

## ADDED Requirements

### Requirement: Team time zone write
The storage adapter SHALL provide an operation that sets or clears the team time zone in `workspace.json` in one commit whose message states the zone (or "cleared") and the acting user, keeping projects, tags, and unknown keys unchanged. The operation SHALL be allowed only for team leaders. Updating projects or tags SHALL keep the stored `timeZone` unchanged.

#### Scenario: Set by team leader
- **WHEN** team leader `alice` sets the team time zone to `Europe/Vienna`
- **THEN** one commit with the message `settings: team time zone Europe/Vienna (alice)` writes `workspace.json`

#### Scenario: Not a team leader
- **WHEN** an editor attempts to set the team time zone
- **THEN** the adapter writes nothing and throws `forbiddenRole`

### Requirement: Entry time shift
The storage adapter SHALL provide an operation that adds a signed offset to the start and end of one login's entries whose start lies in a given time range, updates their `updatedAt`, moves each entry to the month file of its new start when that month differs, and writes all changed entry files in one commit whose message states the number of entries, the login, the offset, the range, and the acting user. Shifted entries SHALL keep their id, duration, description, project, tags, and `stoppedBy`. Source files left without entries SHALL be deleted. The running timer SHALL NOT be changed. The operation SHALL be allowed only for team leaders, SHALL refuse a zero offset and an offset larger than 24 hours, SHALL write nothing when no entry matches, and SHALL write nothing and report a conflict when any affected file changed after it was read.

#### Scenario: Single commit
- **WHEN** team leader `benedikt` shifts the 12 entries of `simon` starting from 2026-09-01 to 2026-09-28 by −2 hours
- **THEN** exactly one commit with the message `shift: 12 entries of simon by -2:00 from 2026-09-01 to 2026-09-28 (benedikt)` changes them, and each keeps its duration

#### Scenario: Crossing a month
- **WHEN** an entry of `simon` starting `2026-10-01T00:30:00Z` is shifted by −2 hours
- **THEN** it is moved to `entries/simon/2026-09.json` with start `2026-09-30T22:30:00Z`, and `entries/simon/2026-10.json` is deleted if it is left empty

#### Scenario: Concurrent change
- **WHEN** `simon` saves an entry to an affected file during the shift
- **THEN** the adapter writes nothing and reports a conflict

#### Scenario: Not a team leader
- **WHEN** an editor attempts a shift
- **THEN** the adapter writes nothing and throws `forbiddenRole`

#### Scenario: Offset out of bounds
- **WHEN** a team leader requests a shift of 0 minutes or of 25 hours
- **THEN** the adapter writes nothing and rejects the request
