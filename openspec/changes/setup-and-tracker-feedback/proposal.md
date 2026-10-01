## Why

Most new customers give up on the setup page. They think Workaddict connects to the GitHub project they already have, so they type their code repository into the form and refuse to create an organization because "my repo is on my personal account". After they jump to a GitHub page they lose their place in the long list of steps, and they can't tell whether a step is really done because only their own checkbox says so. A German tester also reported five smaller issues in the tracker and the Clockify import. This change fixes both.

## What Changes

**Setup wizard (team-onboarding)**
- State plainly at the top that Workaddict creates its own **new, empty** repository for the time data and never touches the user's code project. An organization only holds that one repository; the user's code stays where it is.
- Hide the repository name behind a "change name" link (default `time-data`) and reword the repository step to "Create a new, empty repository". A public repository that already exists under that name triggers a warning.
- Show one step at a time: the current step is open, done steps collapse to one line (they can be reopened), and later steps show only their title, greyed out.
- Each step says what the user sees on GitHub when it is done ("Done when …") and replaces the plain checkbox with a "Done, next step" button.
- When the user returns from a GitHub tab they opened from the current step, ask "Did you see …?" with **Yes, next step** / **No, help me**. "No" shows common mistakes for that step.
- Check names against GitHub's public API, no token needed: does the account exist, and is it a user or an organization? An organization step is ticked automatically when the organization exists. A personal account entered in team mode offers the matching team path.
- Rename the last step to "Check setup and sign in". A failed sign-in names the setup step to redo and links back to it.
- **New third path, "A team on my account"**: the repository stays in the owner's personal account and members are added as collaborators. Members need a classic token, because fine-grained tokens don't reach repositories where they're only collaborators. When choosing a path, a comparison shows the honest pros and cons against "A team with an organization". The join flow, invite message and team helper support this path.

**Tracker and import (feedback from a German user)**
- Clockify import: fix the outdated directions for the API key. It is now under *account menu → Preferences → Advanced → Manage API keys*. This applies to the import hint and to the "delete the key" advice after the import, in English and German.
- Remember per-viewer choices in this browser: timer vs. manual mode, end time vs. duration in manual entries, and the "Me/Everyone" filter of the entry list.
- The "Team now" block can be hidden, and the choice is remembered.
- An entry's date can be changed inline in the entry list, without opening the edit dialog.
- The edit dialog closes as soon as a valid entry is saved, instead of waiting for GitHub to confirm the save. If that save later fails, the user sees an error with a way to reopen the entry.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `team-onboarding`: third setup path (team on a personal account); one step at a time; per-step "done when" text; return-from-GitHub prompt; public name checks; hidden repository name with a "new, empty repository" message; setup check at sign-in; join flow and team helper for personal-account repositories.
- `clockify-import`: updated API key location in the hint and in the advice after the import.
- `time-tracking`: remembered entry mode, end-time/duration choice and member filter; inline date editing; the edit dialog closes right after a valid save.
- `team-live-view`: the "Team now" block can be hidden and the choice is remembered.

## Impact

- `src/features/onboarding/*`: `SetupPage.tsx` (mostly rewritten), `setupState.ts` (new mode, current step), `parts.tsx` (`Step`), `githubLinks.ts` (collaborator links, invite link kind), `JoinPage.tsx`, `TeamHelper.tsx`, `messages.ts`, tests.
- New small module for public GitHub checks (`api.github.com/users/{name}` and `/repos/{owner}/{repo}`, unauthenticated, 60 requests per hour per IP; failures are ignored).
- `src/features/auth/fixSteps.ts` and `SignInForm.tsx`: map a sign-in failure to a setup step.
- `src/features/tracker/*`: `TimerBar.tsx`, `EntryList.tsx`, `EntryEditModal.tsx`, `TeamNow.tsx`, `TrackerPage.tsx`; new per-viewer preferences helper (localStorage with try/catch).
- `src/i18n/en.ts` and `de.ts`: new and changed copy.
- No change to the data format of the repository. No new dependencies.
