## MODIFIED Requirements

### Requirement: Data repository initialization
The system SHALL initialize an empty data repository by creating `tracker.json` (with `schemaVersion`) and an empty `workspace.json` when they are absent. The new `workspace.json` SHALL contain `timeZone` set to the zone the browser reports, unless the browser reports UTC, in which case `timeZone` SHALL be omitted.

#### Scenario: First login to an empty repository
- **WHEN** a user logs in to a repository without `tracker.json`
- **THEN** the system creates `tracker.json` and `workspace.json` and proceeds normally

#### Scenario: Newer schema version
- **WHEN** `tracker.json` declares a schema version newer than the app supports
- **THEN** the system opens in read-only mode and shows a message to reload or update the app

#### Scenario: Initial team time zone
- **WHEN** a user whose browser reports `Europe/Vienna` logs in to a repository without `tracker.json`
- **THEN** the created `workspace.json` contains `"timeZone": "Europe/Vienna"`

#### Scenario: Browser reports UTC on initialization
- **WHEN** a user whose browser reports `UTC` logs in to a repository without `tracker.json`
- **THEN** the created `workspace.json` has no `timeZone`
