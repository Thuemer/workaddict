## MODIFIED Requirements

### Requirement: Date range filter
The stats page SHALL provide preset ranges (today, this week, last week, last 2 weeks, this month, last month, this year, all time) and a custom from/to range, defaulting to this week, with weeks starting on Monday. "Last 2 weeks" SHALL cover Monday of last week through Sunday of this week. "All time" SHALL cover the start of the earliest entry through the end of today, or only today when there are no entries.

#### Scenario: Preset range
- **WHEN** the user selects "Last month" on 2026-09-21
- **THEN** stats cover 2026-08-01 through 2026-08-31 in local time

#### Scenario: Last 2 weeks
- **WHEN** the user selects "Last 2 weeks" on Monday 2026-10-05
- **THEN** stats cover 2026-09-28 through 2026-10-11 in local time

#### Scenario: All time
- **WHEN** the user selects "All time" and the earliest entry started on 2024-03-14 09:00
- **THEN** stats cover every completed entry from 2024-03-14 through the end of today, and the displayed range starts on 2024-03-14

#### Scenario: All time without entries
- **WHEN** the user selects "All time" and no entries exist
- **THEN** the range covers only today and the page shows the empty state

#### Scenario: Custom range
- **WHEN** the user picks 2026-09-01 to 2026-09-15
- **THEN** stats include only entries starting within those dates

### Requirement: Charts
The stats page SHALL show a bar chart of tracked hours stacked by project, with one bar per day for ranges up to 62 days, one bar per week for ranges up to 366 days, and one bar per month for longer ranges, and a donut chart of the share per project.

#### Scenario: Weekly bars for long ranges
- **WHEN** the selected range is "This year"
- **THEN** the bar chart shows one bar per week

#### Scenario: Monthly bars for very long ranges
- **WHEN** the selected range is "All time" and the earliest entry is more than 366 days ago
- **THEN** the bar chart shows one bar per calendar month

#### Scenario: Empty range
- **WHEN** no entries match the filters
- **THEN** the page shows an empty state message instead of empty charts

## ADDED Requirements

### Requirement: Filter persistence
The stats page SHALL remember the selected range preset, custom from/to dates, and member, project, and tag filters for the current browser tab session, separately per workspace, so that leaving the stats page or reloading it restores them. A remembered preset SHALL be re-evaluated against the current date, not stored as fixed dates. Remembered values that are malformed or unknown SHALL fall back to the defaults; remembered member, project, or tag ids that no longer exist SHALL be dropped, and a filter left with no valid ids SHALL revert to all selected.

#### Scenario: Switching tabs keeps filters
- **WHEN** the user selects "Last month" and project "Website" on the stats page, opens the time tracking page, and returns to the stats page
- **THEN** the range is still "Last month" and only "Website" is selected

#### Scenario: Reload keeps filters
- **WHEN** the user selects "Last 2 weeks" and reloads the page in the same browser tab
- **THEN** the stats page shows "Last 2 weeks"

#### Scenario: Preset follows the calendar
- **WHEN** the user left "This week" selected on 2026-10-04 and returns in the same browser tab on 2026-10-05
- **THEN** stats cover the week starting 2026-10-05

#### Scenario: Separate per workspace
- **WHEN** the user filters by a project in workspace A and then opens the stats page of workspace B in the same browser tab
- **THEN** workspace B shows its own remembered filters, or the defaults if none

#### Scenario: Deleted project in remembered filter
- **WHEN** the only remembered project filter refers to a project that has since been deleted
- **THEN** the project filter reverts to all projects selected

#### Scenario: New browser tab starts fresh
- **WHEN** the user opens the app in a new browser tab
- **THEN** the stats page starts with "This week" and all members, projects, and tags selected
