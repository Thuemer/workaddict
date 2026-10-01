## MODIFIED Requirements

### Requirement: Personalized setup steps
The setup wizard SHALL say near the top, before any name is asked, that Workaddict does not use or change the user's code project and stores the time data in its own new, empty repository. For a team with an organization, it SHALL also say that the organization holds only that repository and that the user's code stays where it is.

The wizard SHALL ask for the account name once (organization for a team with an organization, username otherwise). The repository name SHALL default to `time-data` and SHALL be shown as a line "Data repository: <owner>/<repo>, new and empty" with a "Change name" action that reveals the repository name field. The field SHALL be shown expanded when the saved name differs from the default.

For a team with an organization the wizard SHALL show these steps in order: create a free organization; create a new, empty private data repository from a link that prefills owner, name and private visibility; set the organization's base repository permission to Write; choose the fine-grained token approval policy; invite members; create the owner's own token; invite the team; check setup and sign in. Each step SHALL have a link to the matching GitHub page personalized with the account and repository names, a short explanation and a fallback menu path.

Until the account name is a valid GitHub login and the repository name is valid, the wizard SHALL stay on the name page: its "Next" action SHALL be disabled and no step page SHALL open, also not from a page named in the address. Steps already done SHALL stay done while the names are invalid.

#### Scenario: Code project untouched
- **WHEN** the user opens the wizard and chooses any path
- **THEN** the page states that Workaddict creates its own new, empty repository and does not use the user's code project

#### Scenario: Repository name hidden by default
- **WHEN** the user enters the organization `my-team` without changing the repository name
- **THEN** the wizard shows "Data repository: my-team/time-data, new and empty" with a "Change name" action and no repository name input

#### Scenario: Change repository name
- **WHEN** the user clicks "Change name"
- **THEN** the repository name input appears prefilled with `time-data`

#### Scenario: Links use the entered names
- **WHEN** the owner enters the organization `my-team` and keeps the repository name `time-data`
- **THEN** the repository step links to `https://github.com/new` with owner `my-team`, name `time-data` and private visibility, and the organization settings links contain `my-team`

#### Scenario: Steps locked before a name
- **WHEN** the owner has chosen a team path and the name field is empty
- **THEN** the wizard stays on the name page with "Next" disabled and shows no step's GitHub link

#### Scenario: Invalid organization name
- **WHEN** the owner enters an organization name that does not match GitHub's login pattern
- **THEN** the wizard shows a validation message at the field, keeps "Next" disabled, and does not build links from the name

#### Scenario: Invalid repository name
- **WHEN** the owner enters a valid organization name but an invalid repository name
- **THEN** "Next" stays disabled

#### Scenario: Step in the address before a valid name
- **WHEN** the owner opens `#/setup?step=token` while no valid name is saved
- **THEN** the wizard shows the name page

#### Scenario: Base permission explained
- **WHEN** the owner views the base permission step
- **THEN** the wizard explains that Write applies to all repositories of the organization and recommends an organization used only for the time data

### Requirement: One step at a time
The setup wizard SHALL show one page at a time, in this order: who the setup is for, the account name, one page per setup step of the chosen path, and "check setup and sign in". Above the page it SHALL show a progress bar with "Step <n> of <total>" (just "Step 1" before a path is chosen) and a "Start over" action. Below the page content it SHALL offer "Back" (except on the first page) and the main action: "Next" on the first two pages (disabled until a path is chosen or the names are valid), "Done, next step" on a step that is not done (marking it done and opening the next page), and "Next" on a step that is already done, together with "Not done yet". Going back SHALL NOT undo a step. A new page SHALL slide in from the right when moving on and from the left when going back, without animation when the user prefers reduced motion, and focus SHALL move to the page title.

The current page SHALL be kept in the address as `#/setup?step=<page>`, so the browser's back and forward buttons move between pages. Without a page in the address, the wizard SHALL open the first page that still needs work (who it is for, the names, or the first step not done) and SHALL put that page into the address, so that choosing a path or typing a name never changes the page by itself.

#### Scenario: Fresh start
- **WHEN** the wizard opens without saved progress
- **THEN** only the question who it is for is shown, with "Next" disabled and no name field or GitHub link

#### Scenario: Step finished
- **WHEN** the owner on the organization step clicks "Done, next step"
- **THEN** the step is marked done, the repository page slides in from the right, and focus moves to its title

#### Scenario: Back without undoing
- **WHEN** the owner clicks "Back" on the repository page after finishing the organization step
- **THEN** the organization page is shown as done with "Next" and "Not done yet"

#### Scenario: Continue after a reload
- **WHEN** the owner finished three steps and reopens `#/setup`
- **THEN** the wizard opens the fourth step's page

#### Scenario: Typing does not move on
- **WHEN** the owner on the name page enters a valid name
- **THEN** the name page stays open until the owner clicks "Next"
