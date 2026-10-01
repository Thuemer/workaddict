## Context

The setup wizard (`src/features/onboarding/SetupPage.tsx`) currently shows a path selector ("Just me" / "A team"), then a "Your GitHub names" card with an organization/username field and a repository name field, then every step at once, each with a self-reported "Done" checkbox. Every GitHub link opens in a new tab. Nothing checks against GitHub until sign-in. Setup is where most customers give up (the owner's observation). Most of those customers set up a team, and many have their code repository on a personal account.

Fine-grained tokens can only reach repositories of the user's own account or of organizations the user belongs to. A collaborator on someone else's personal repository therefore needs a classic token with the `repo` scope. `fixSteps.ts` already explains this (`personalFineGrained`), and the owner page already knows `kind=user`.

The tracker items are independent small fixes. `useSaveEntry` is already optimistic (`onMutate` patches the cache); `EntryEditModal` still closes only in `onSuccess`, after the GitHub commit round trip.

## Goals / Non-Goals

**Goals:**
- A first-time team owner understands in the first screen that a new, empty repository is created and their code is untouched.
- The user always knows which step they are on, what "done" looks like, and gets asked when they come back from GitHub.
- Team owners without an organization can finish setup, and they see an honest comparison before choosing.
- Fix the five tester issues with minimal surface.

**Non-Goals:**
- Using an existing code repository as the data repository.
- Creating the repository or organization through the API for the user (would need broad token scopes before a token exists).
- Syncing preferences across devices (they are per-browser conveniences).
- Verifying base permission or the approval policy (needs `admin:org`).

## Decisions

### D1 Three setup modes in one state field
`SetupMode = 'solo' | 'team' | 'personal-team'`. Steps per mode:

```
solo           repo → token → sign in
team           org → repo → base → approval → invite → token → share → sign in
personal-team  repo → collaborators → token → share → sign in
```

`collaborators` is a new step that links to `github.com/<user>/<repo>/settings/access` ("Add people"). The mode selector shows three options. Picking either team option shows a comparison block (see D6). Saved progress with `team`/`solo` loads unchanged.
*Alternative:* a sub-choice inside "A team". Rejected: one flat choice is easier to scan and to store.

### D2 Current step derived, not stored
The current step is the first step not in `done`. A user can open any done or later step by clicking its title; that "opened" step is kept in component state only, not persisted. Done steps render collapsed (title + ✓ + "change"); later steps render title-only with muted style but stay clickable, so experienced users are never blocked. The existing name-validity lock still applies before names are valid.
*Alternative:* a strict linear wizard with Next/Back. Rejected: it hides the overview that some users want, and it can't recover when someone skips ahead on GitHub.

### D3 "Done, next step" replaces the checkbox
Each step's body ends with a "Done when: …" line (i18n `onboarding.setup.<step>DoneWhen`) and a primary **Done, next step** button that adds the step to `done` and scrolls the next step into view with focus on its heading. Collapsed done steps offer "Not done yet" to untick.

### D4 Return from GitHub prompt
`GitHubLink` gets an optional `onOpen` callback. The setup page records `awaitingReturn = step` when a link in the current step is clicked. On `visibilitychange` to visible (or window `focus`), when `awaitingReturn` is set, the step shows an inline banner (not a modal): "Back from GitHub. Did you see <DoneWhen>?" with **Yes, next step** (same as D3) and **No, help me**, which expands a per-step list of common mistakes (`<step>Help`). `awaitingReturn` is in-memory only. A banner that is ignored stays until the user acts.

### D5 Public GitHub checks without a token
New `publicGitHub.ts` with `lookupAccount(name)` → `'user' | 'org' | 'missing' | 'unknown'` via `GET https://api.github.com/users/{name}` (returns `type`), and `repoExists(owner, repo)` → `'public' | 'unknown'` via `GET /repos/{owner}/{repo}` (a private or missing repository both return 404, which is reported as `unknown`). Called debounced (500 ms) after a valid name is entered, and again for the org step on return from GitHub. Network errors and rate limits (60/h/IP) resolve to `unknown` and show nothing. Uses:
- team mode + `org` → auto-tick the org step with "✓ found on GitHub".
- team mode + `user` → notice: "<name> is a personal account." with buttons **Team on my account** / **Create an organization instead** (the latter just clears the field hint).
- personal-team or solo + `org` → notice suggesting team mode.
- solo or personal-team + `missing` → field error "No GitHub account with this name".
- `repoExists` = `public` → warning at the repository line: "This repository already exists and is public. Workaddict needs a new, empty, private one. Pick another name."

Requests send no credentials and no custom headers.

### D6 Comparison for the two team paths
Shown under the selector when a team option is selected:

| | With an organization | On my account |
|---|---|---|
| Members' tokens | fine-grained, reach only `time-data` | classic `repo` token, reaches **all** repositories of that member |
| Extra setup | create a free org (≈1 min), base permission, approval policy | none |
| Your code | stays where it is | stays where it is |
| Later | — | repository can be transferred to an org |

The org path is marked "recommended".

### D7 Repository name hidden
The names card shows only the account field. Below it: "Data repository: **<owner>/time-data**, new and empty · Change name". "Change name" reveals the existing input. When the saved `repo` differs from the default, the input is shown expanded. The intro gets the sentence "Workaddict does not use your code project. It stores the time data in its own new, empty repository."

### D8 Personal-team join flow
The invite link gains `&kind=user` (same convention as `ownerPageLink`). `JoinPage` with `kind=user`: the invitation step links to `github.com/<owner>/<repo>/invitations`, the token step uses the classic-token checklist (`githubLinks.classicToken()`, "repo" scope, with the reach-all-repos warning), and the invite message wording talks about a repository invitation instead of an organization. `TeamHelper` shows for owners of user-owned repositories too, with the "Add people" link instead of People/`gh` org commands. Links without `kind` behave as today.

### D9 Setup check = sign-in
The last step becomes "Check setup and sign in". `SignInForm` with `from="setup"` already routes failures; a new `setupStepFor(error)` in `fixSteps.ts` maps error kinds to a setup step (repo not found → `repo`, wrong resource owner / no access → `token`, org membership → `invite`/`collaborators`). The fix page shows a "Back to step N: <title>" link to `#/setup?step=<id>`, which opens that step.

### D10 Per-viewer preferences
New `src/lib/prefs.ts`: `usePref<T>(key, default, validate)` storing under `workaddict.prefs.<key>` with try/catch for every read and write. Keys: `entryMode` (`timer|manual`), `manualTimeInput` (`end|duration`), `entryFilter` (`me|everyone`), `teamNowHidden` (boolean). The edit dialog starts with the same `manualTimeInput` choice.

### D11 Inline date
The entry row shows a small date button (calendar icon plus short date, visible without hover like the time fields) that opens a native `<input type="date">`. On commit, start and end move by the same number of days, keeping times and duration, and the entry is saved through the existing inline save path (`previousStart` = old start, so it moves month files). An entry that crosses midnight keeps its overnight shape. The row moves to its new day group.

### D12 Edit dialog closes on valid submit
After local validation passes, `EntryEditModal` calls `save.mutate(...)` and `onClose()` immediately; the toast "Saved" stays. `useSaveEntry` already rolls back on error. The error toast gets an **Open again** action that reopens the dialog with the typed values. That needs the modal's open state lifted into `EntryList`, which already holds `editingEntry`.
*Alternative:* keep the dialog open with a spinner. Rejected: the list already shows the new values optimistically, so the waiting looks like a hang.

### D13 Clockify key directions
Copy only: "In Clockify, open your account menu (top right) → Preferences → Advanced → Manage API keys → Generate." The advice after the import changes the same way. Verified against Clockify Help on 2026-09-28.

## Risks / Trade-offs

- [Classic tokens reach all of a member's repositories] → only in the explicitly chosen personal-team path, with the comparison and warning shown before the choice and again at the token step; the org path stays recommended.
- [Unauthenticated API rate limit, 60/h per IP, e.g. shared office NAT] → checks are advisory, debounced and cached per name for the page view; `unknown` shows nothing and never blocks.
- [Focus-return prompt fires on unrelated tab switches] → only when a link of the current step was clicked and the step isn't done; the banner is inline and dismissible, not a modal.
- [Closing the dialog before the commit confirms hides errors] → the error toast with "Open again" and the existing rollback cover it.
- [Moving the date across a month boundary] → reuses the existing month-file move via `previousStart`, which is already tested for edits.
- [Saved setup state from before this change] → `mode` values stay valid; `personal-team` is additive.

## Migration Plan

Frontend-only; deploy as usual on GitHub Pages. Old invite links without `kind` keep working. Rollback = revert the commit; saved `personal-team` progress falls back to "no choice" through the existing validation in `loadSetup`.

## Open Questions

- None blocking. Exact GitHub page wording for "Done when" lines is checked against GitHub during implementation (as done for the token form on 2026-09-23).
