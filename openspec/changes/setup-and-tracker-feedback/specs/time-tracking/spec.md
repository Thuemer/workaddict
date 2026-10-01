## MODIFIED Requirements

### Requirement: Inline entry editing
The system SHALL let a user with permission to change an entry edit its description, project, tags, date, start time, end time, and duration directly in the entry list by clicking the field, without opening a dialog. The editable date, start time, end time, and duration SHALL be recognizable as editable without hovering, including on touch screens. After a timer is stopped, the confirmation SHALL tell the user that the times can be corrected in the entry list. Enter or leaving the field SHALL save the change, Escape SHALL cancel it, and an unchanged field SHALL NOT be saved. Invalid values SHALL be rejected with the same validation as manual entries while keeping the typed value. Changing the date SHALL move the start and end by the same number of days, keeping the times and the duration, and SHALL show the entry in the group of its new day.

#### Scenario: Editable times visible on touch screens
- **WHEN** a user views their entries on a phone
- **THEN** date, start time, end time, and duration show a visible edit affordance without any hover

#### Scenario: Hint after stopping
- **WHEN** the user stops their timer
- **THEN** the confirmation says that the entry was saved and that its times can be corrected by tapping them in the list

#### Scenario: Edit description inline
- **WHEN** the user clicks the description of their entry, types "Review PR", and presses Enter
- **THEN** the entry's description is saved as "Review PR" without a dialog opening

#### Scenario: Edit start time inline
- **WHEN** the user clicks the start time 09:00 of their 09:00–10:00 entry, enters 08:30, and leaves the field
- **THEN** the entry is saved as 08:30–10:00 and its shown duration becomes 1:30

#### Scenario: Edit duration inline
- **WHEN** the user clicks the duration 1:00 of their 09:00–10:00 entry and enters 2:15
- **THEN** the entry is saved as 09:00–11:15

#### Scenario: Edit date inline
- **WHEN** the user clicks the date of their entry from 2026-09-21 09:00–10:00 and picks 2026-09-18
- **THEN** the entry is saved as 2026-09-18 09:00–10:00 without a dialog opening and appears in the group of that day

#### Scenario: Date moved to another month
- **WHEN** the user changes the date of an entry from 2026-10-01 to 2026-09-30
- **THEN** the entry is saved in the September entry file and removed from the October file

#### Scenario: Cancel with Escape
- **WHEN** the user changes the description inline and presses Escape
- **THEN** the original description is shown and nothing is saved

#### Scenario: Invalid inline value
- **WHEN** the user enters a duration of 25:00 inline
- **THEN** the system shows a validation error, keeps the field in edit mode with the typed value, and saves nothing

#### Scenario: Change project inline
- **WHEN** the user clicks the project chip of their entry and selects "Website"
- **THEN** the entry's project is saved as "Website"

#### Scenario: Save fails
- **WHEN** an inline save fails because the device is offline
- **THEN** the system shows the offline error and restores the field to edit mode with the typed value

## ADDED Requirements

### Requirement: Edit dialog closes after a valid save
When the user saves the edit dialog and the values pass validation, the dialog SHALL close immediately and the entry list SHALL show the new values, without waiting for the save to reach GitHub. When that save later fails, the system SHALL restore the previous values in the list and SHALL show an error with an action to open the dialog again with the values the user entered. When the values do not pass validation, the dialog SHALL stay open and show the errors.

#### Scenario: Valid save
- **WHEN** the user changes the description in the edit dialog and clicks Save
- **THEN** the dialog closes at once and the list shows the new description

#### Scenario: Save fails later
- **WHEN** the dialog has closed and the save fails because the device is offline
- **THEN** the list shows the previous values and an error offers "Open again", which reopens the dialog with the entered values

#### Scenario: Invalid values
- **WHEN** the user enters a duration of 25:00 in the edit dialog and clicks Save
- **THEN** the dialog stays open and shows the validation error

### Requirement: Remembered entry preferences
The system SHALL remember in this browser, for the current viewer, the last chosen entry mode (timer or manual), whether manual times are entered as end time or as duration, and the entry list's member filter (me or everyone), and SHALL use them as the starting values on the next visit. The edit dialog SHALL start with the remembered end-time or duration choice. When browser storage is unavailable, the defaults SHALL apply and changing them SHALL work for the current page view.

#### Scenario: Manual mode with duration remembered
- **WHEN** the user switches to manual mode, chooses to enter a duration, and reloads the page
- **THEN** the tracker opens in manual mode with the duration input selected

#### Scenario: Member filter remembered
- **WHEN** an editor sets the entry list filter to "Everyone" and reloads the page
- **THEN** the list shows everyone's entries

#### Scenario: Storage blocked
- **WHEN** browser storage throws on access
- **THEN** the tracker opens in timer mode with end time input and the "Me" filter, and switching still works
