## MODIFIED Requirements

### Requirement: Setup path for one person or a team
The setup wizard SHALL first ask who the setup is for and SHALL remember the answer with the rest of the progress. The choice SHALL be presented as a selector with three options: "Just me", "A team with an organization" and "A team on my account". The selector SHALL stay visible at the top of the wizard after a choice is made. Choosing an option SHALL mark it as selected and open the rest of the wizard below it, and the user SHALL be able to switch to another option at any time from the same selector. Before a choice is made, nothing below the selector SHALL be shown except a short hint on which option to pick. A person who only tracks their own time SHALL NOT be asked to create an organization, because a fine-grained token reaches a private repository in the user's own account without one.

When either team option is selected, the wizard SHALL show a comparison of the two team paths that states at least these points: with an organization, members use fine-grained tokens that reach only the data repository, and the owner creates a free organization and sets its base permission and token approval policy; on the owner's account, no organization is needed, but every member needs a classic token with the "repo" scope that can access all of that member's repositories; in both paths the user's code repositories stay where they are. The organization path SHALL be marked as recommended.

For the solo path the wizard SHALL ask for the user's GitHub username instead of an organization name and SHALL show only these steps: create the new, empty data repository; create the token; check setup and sign in. It SHALL NOT show the organization, base permission, token approval, invite or invite-link steps. It SHALL state that a repository in a personal account can only be shared using classic tokens, and that "A team on my account" or moving the repository to an organization are the ways to work with others later.

For the "A team on my account" path the wizard SHALL ask for the owner's GitHub username and SHALL show these steps in order: create the new, empty data repository in the owner's account; add members as collaborators on the repository (link to `https://github.com/<user>/<repo>/settings/access`); create the owner's own token; invite the team; check setup and sign in.

#### Scenario: Solo setup skips the organization steps
- **WHEN** the user chooses "Just me" and enters the username `my-name`
- **THEN** the wizard shows two steps plus sign-in, links to `https://github.com/new?owner=my-name&name=time-data&visibility=private`, prefills the sign-in repository with `my-name/time-data`, and shows no organization, base permission, approval or invite step

#### Scenario: Team on a personal account
- **WHEN** the user chooses "A team on my account" and enters the username `ben`
- **THEN** the wizard shows the steps repository, collaborators, token and invite plus sign-in, the collaborators step links to `https://github.com/ben/time-data/settings/access`, and no organization, base permission or approval step is shown

#### Scenario: Comparison of team paths
- **WHEN** the user selects either team option
- **THEN** the wizard shows the comparison, marks the organization path as recommended and states that a classic token on the personal-account path can access all of the member's repositories

#### Scenario: Choice stays visible
- **WHEN** the user chooses "A team with an organization"
- **THEN** all three options remain visible, that option is shown as selected, and the organization field and team steps appear below the selector

#### Scenario: Switching the path
- **WHEN** the user has chosen one path and then selects another option in the selector
- **THEN** the wizard shows that path's field and steps, keeping the entered name

#### Scenario: Nothing chosen yet
- **WHEN** the wizard opens without saved progress
- **THEN** no option is selected and no name field or step is shown

#### Scenario: Keyboard selection
- **WHEN** a keyboard user focuses the selector and presses an arrow key
- **THEN** the next option becomes selected, as in a radio group

#### Scenario: Progress saved before the choice existed
- **WHEN** saved progress holds a name but no chosen path
- **THEN** the wizard treats it as a team setup with an organization and keeps the progress

### Requirement: Personalized setup steps
The setup wizard SHALL say near the top, before any name is asked, that Workaddict does not use or change the user's code project and stores the time data in its own new, empty repository. For a team with an organization, it SHALL also say that the organization holds only that repository and that the user's code stays where it is.

The wizard SHALL ask for the account name once (organization for a team with an organization, username otherwise). The repository name SHALL default to `time-data` and SHALL be shown as a line "Data repository: <owner>/<repo>, new and empty" with a "Change name" action that reveals the repository name field. The field SHALL be shown expanded when the saved name differs from the default.

For a team with an organization the wizard SHALL show these steps in order: create a free organization; create a new, empty private data repository from a link that prefills owner, name and private visibility; set the organization's base repository permission to Write; choose the fine-grained token approval policy; invite members; create the owner's own token; invite the team; check setup and sign in. Each step SHALL have a link to the matching GitHub page personalized with the account and repository names, a short explanation and a fallback menu path.

Until the account name is a valid GitHub login and the repository name is valid, every step including sign-in SHALL be locked: it SHALL show its number and title, the first step SHALL also show one note saying which field to fill in (not repeated on every step), and it SHALL NOT show its explanation, links, choices, commands, copy buttons, sign-in form or done action. Steps already done SHALL stay done while locked and SHALL unlock unchanged once the names are valid again.

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
- **THEN** every step is shown locked, the first step notes to enter the name first, and no step offers a done action or GitHub link

#### Scenario: Invalid organization name
- **WHEN** the owner enters an organization name that does not match GitHub's login pattern
- **THEN** the wizard shows a validation message at the field, keeps every step locked, and does not build links from the name

#### Scenario: Invalid repository name
- **WHEN** the owner enters a valid organization name but an invalid repository name
- **THEN** every step stays locked and the first step notes to fix the repository name

#### Scenario: Steps unlock with a valid name
- **WHEN** the owner enters a valid organization name while the repository name is valid
- **THEN** all steps unlock and previously done steps are still done

#### Scenario: Base permission explained
- **WHEN** the owner views the base permission step
- **THEN** the wizard explains that Write applies to all repositories of the organization and recommends an organization used only for the time data

### Requirement: Invite link and message
Before the final sign-in step, the wizard SHALL show an invite link `#/join?repo=<owner>/<name>` on the app's current URL and a ready-to-copy invite message in the current language that contains the link. For a team with an organization the message SHALL say to accept the organization invitation first. For a team on a personal account the link SHALL carry `&kind=user` and the message SHALL say to accept the repository invitation first and that a classic token is needed. The same link and message SHALL stay available after sign-in in the team helper in settings.

#### Scenario: Copy invite message
- **WHEN** the owner clicks "Copy message"
- **THEN** the clipboard contains the message with the invite link, and the button confirms the copy

#### Scenario: Personal-account invite link
- **WHEN** the owner `ben` on the "A team on my account" path reaches the invite step
- **THEN** the invite link ends with `#/join?repo=ben/time-data&kind=user` and the message mentions the repository invitation and a classic token

#### Scenario: Clipboard unavailable
- **WHEN** the clipboard API is unavailable or rejects
- **THEN** the message is shown selected in a read-only text field so the owner can copy it manually

### Requirement: Join flow
Opening `#/join?repo=<owner>/<name>` while logged out SHALL show a join flow for that repository with these steps in order: accept the invitation, confirm access to the repository in the browser, create a token, sign in. The token step SHALL stay locked until the member confirms they can open the repository. The sign-in step SHALL prefill the repository. With `&kind=user`, the invitation step SHALL link to the repository invitation `https://github.com/<owner>/<name>/invitations`, and the token step SHALL guide the member to a classic token with the "repo" scope, warning that it can access all of their repositories.

#### Scenario: Valid join link
- **WHEN** a logged-out member opens `#/join?repo=my-team/time-data`
- **THEN** the join flow shows the repository `my-team/time-data` and a link to `https://github.com/orgs/my-team/invitation`

#### Scenario: Join link for a personal account
- **WHEN** a logged-out member opens `#/join?repo=ben/time-data&kind=user`
- **THEN** the invitation step links to `https://github.com/ben/time-data/invitations` and, once access is confirmed, the token step links to the classic token form with the "repo" scope and shows the warning

#### Scenario: Invalid join link
- **WHEN** a member opens `#/join?repo=not a repo`
- **THEN** the start page opens with a notice that the invite link is invalid

#### Scenario: Member cannot open the repository
- **WHEN** the member answers that the repository shows a 404 page
- **THEN** the token step stays locked, the flow explains that access is missing, and it offers a copyable message for the owner

#### Scenario: Member can open the repository
- **WHEN** the member confirms they can see the repository of an organization
- **THEN** the token step unlocks with a prefilled token creation link and a checklist naming the resource owner, the repository and the Contents read-and-write permission

#### Scenario: Logged-in user opens join link
- **WHEN** a signed-in user opens a join link
- **THEN** the app shows the tracker page as for any unknown route

### Requirement: Team helper for owners
On the settings page, owners of the data repository SHALL see the invite link and message with copy buttons. For a repository owned by an organization, they SHALL also see an "Add a member" section with the people page link and generated `gh` commands, and a link to the organization's pending token requests. For a repository owned by a personal account, they SHALL instead see an "Add a member" section linking to the repository's collaborator settings.

#### Scenario: Owner of organization repository
- **WHEN** an owner of an organization-owned data repository opens settings
- **THEN** the team helper shows the invite link, the add-member helper and the pending token requests link

#### Scenario: Owner of personal-account repository
- **WHEN** the owner `ben` of `ben/time-data` opens settings
- **THEN** the team helper shows the invite link with `&kind=user` and a link to `https://github.com/ben/time-data/settings/access`, and no pending token requests link

#### Scenario: Non-owner
- **WHEN** a member without admin permission opens settings
- **THEN** the team helper is not shown

## ADDED Requirements

### Requirement: One step at a time
The setup wizard SHALL treat the first step that is not done as the current step and SHALL show only that step expanded. Done steps SHALL be shown collapsed with their title and a done mark, and SHALL offer to reopen them and to mark them as not done. Later steps SHALL show only their number and title in a muted style and SHALL open when their title is clicked. Opening a step other than the current one SHALL NOT be saved.

#### Scenario: Fresh start
- **WHEN** the owner has entered valid names and no step is done
- **THEN** only the first step is expanded and all later steps show only number and title

#### Scenario: Step finished
- **WHEN** the owner clicks "Done, next step" on the current step
- **THEN** that step collapses with a done mark, the next step expands, and focus moves to its heading

#### Scenario: Look ahead
- **WHEN** the owner clicks the title of a later step
- **THEN** that step expands without being marked done and without changing which step is current after a reload

#### Scenario: Undo a step
- **WHEN** the owner reopens a done step and chooses "Not done yet"
- **THEN** the step is no longer done and becomes the current step if it is the first step not done

### Requirement: Done criteria per step
Every setup step SHALL state what the user sees on GitHub when the step is done ("Done when …") and SHALL end with a "Done, next step" action that replaces the "Done" checkbox.

#### Scenario: Repository step done criterion
- **WHEN** the owner views the repository step for `my-team/time-data`
- **THEN** the step says it is done when GitHub shows the new, empty repository `my-team/time-data` with the "Quick setup" page

### Requirement: Return from GitHub prompt
When the user opens a GitHub link from the current step and the setup page becomes visible again, the wizard SHALL show an inline prompt in that step asking whether the user saw the step's done criterion, with the answers "Yes, next step" and "No, help me". "Yes, next step" SHALL act like "Done, next step". "No, help me" SHALL show the most common mistakes for that step. The prompt SHALL NOT be a modal dialog and SHALL NOT appear when no link of the current step was opened.

#### Scenario: User comes back from GitHub
- **WHEN** the owner clicks the "Create my-team/time-data" link, switches to the GitHub tab, and later returns to the setup tab
- **THEN** the repository step asks whether GitHub showed the new, empty repository, with "Yes, next step" and "No, help me"

#### Scenario: Help after return
- **WHEN** the owner answers "No, help me"
- **THEN** the step shows the common mistakes for that step and stays the current step

#### Scenario: Unrelated tab switch
- **WHEN** the owner switches to another tab and back without opening a link from the current step
- **THEN** no prompt is shown

### Requirement: Public account checks
After a valid account name is entered, the wizard SHALL look the name up on GitHub's public API without a token and SHALL use the result only as advice; lookup failures and rate limits SHALL show nothing and SHALL NOT block any step. The wizard SHALL mark the organization step as done with a "found on GitHub" note when the organization exists; SHALL, on the organization path, show a notice with a button to switch to "A team on my account" when the name is a personal account; SHALL suggest the organization path when a personal path is given an organization name; and SHALL show "No GitHub account with this name" on a personal path when the account does not exist. When a public repository with the chosen owner and name already exists, the wizard SHALL warn that Workaddict needs a new, empty, private repository and SHALL suggest choosing another name.

#### Scenario: Organization already exists
- **WHEN** the owner on the organization path enters `my-team` and GitHub reports an organization with that name
- **THEN** the organization step is marked done with a note that it was found on GitHub

#### Scenario: Personal account on the organization path
- **WHEN** the owner on the organization path enters `ben` and GitHub reports a user account
- **THEN** the wizard says `ben` is a personal account and offers to switch to "A team on my account"

#### Scenario: Existing public repository
- **WHEN** the owner keeps the name `time-data` and `ben/time-data` is a public repository on GitHub
- **THEN** the wizard warns that a new, empty, private repository is needed and suggests changing the name

#### Scenario: Lookup unavailable
- **WHEN** GitHub's public API answers with a rate limit error
- **THEN** the wizard shows no notice and all steps behave as without the check

### Requirement: Setup check at sign-in
The last setup step SHALL be titled "Check setup and sign in". When sign-in from the setup wizard fails, the fix page SHALL name the setup step that most likely needs to be redone and SHALL link back to the wizard with that step opened.

#### Scenario: Repository missing
- **WHEN** sign-in from the setup wizard fails because `my-team/time-data` is not found
- **THEN** the fix page links back to the setup wizard with the repository step opened

#### Scenario: Token for wrong owner
- **WHEN** sign-in from the setup wizard fails because the token's resource owner is not `my-team`
- **THEN** the fix page links back to the setup wizard with the token step opened
