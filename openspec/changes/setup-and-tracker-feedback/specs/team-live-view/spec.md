## ADDED Requirements

### Requirement: Hide the Team now block
The "Team now" block SHALL offer a control to hide it. When hidden, the tracker page SHALL show only a small "Show team now" action in its place. The choice SHALL be remembered in this browser for the current viewer, and the page SHALL behave as not hidden when browser storage is unavailable.

#### Scenario: Hide the block
- **WHEN** editor `carol` clicks "Hide" on the "Team now" block
- **THEN** the block's list is no longer shown and a "Show team now" action appears in its place

#### Scenario: Choice remembered
- **WHEN** `carol` has hidden the block and reloads the tracker page
- **THEN** the block stays hidden

#### Scenario: Show again
- **WHEN** `carol` clicks "Show team now"
- **THEN** the block is shown again and stays shown after a reload

#### Scenario: Storage blocked
- **WHEN** browser storage throws on access
- **THEN** the block is shown and hiding it works for the current page view
