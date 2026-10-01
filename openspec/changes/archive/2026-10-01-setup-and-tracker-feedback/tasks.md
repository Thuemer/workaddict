## 1. Quick fixes (tester feedback)

- [x] 1.1 Update the Clockify API key hint and the post-import deletion advice in `en.ts` and `de.ts` to account menu → Preferences → Advanced → Manage API keys (D13); adjust the import wizard test if it asserts the text
- [x] 1.2 `EntryEditModal`: call `onClose()` right after a valid `save.mutate`, keep the "Saved" toast; show validation errors without closing (D12)
- [x] 1.3 Lift the reopen path into `EntryList`: on a failed save, show an error toast with an "Open again" action that reopens the dialog with the entered values; add tests for close-on-valid, stay-open-on-invalid, and reopen-after-failure

## 2. Per-viewer preferences

- [x] 2.1 Add `src/lib/prefs.ts` with `usePref(key, default, validate)` storing under `workaddict.prefs.<key>`, with try/catch on every read and write; unit tests including throwing storage
- [x] 2.2 `TimerBar`: persist timer/manual mode (`entryMode`) and end/duration choice (`manualTimeInput`)
- [x] 2.3 `EntryEditModal`: start with the remembered `manualTimeInput`
- [x] 2.4 `TrackerPage`: persist the Me/Everyone filter (`entryFilter`)
- [x] 2.5 `TeamNow`: add Hide control and a "Show team now" action, persisted as `teamNowHidden`; tests for hide, reload and blocked storage
- [x] 2.6 i18n strings (en/de) for hide/show

## 3. Inline date editing

- [x] 3.1 Add a date shift helper in `domain/time` that moves start and end by whole days, keeping times, duration and overnight shape; unit tests including month boundary and DST day
- [x] 3.2 `EntryList`: add a visible date button per editable row with a native date input; save through the inline save path with `previousStart`; Escape cancels, unchanged date is not saved
- [x] 3.3 Tests: inline date change moves the row to the new day group and saves to the right month file; no date control on entries the user cannot edit

## 4. Setup state and links

- [x] 4.1 `setupState.ts`: add mode `personal-team` with steps `repo, collaborators, token, share`; add `collaborators` to known steps; loading old progress stays unchanged; tests
- [x] 4.2 `githubLinks.ts`: `inviteLink` takes an optional `kind: 'user'` and appends `&kind=user`; reuse `repoAccess` and `repoInvitations`; tests
- [x] 4.3 Add `publicGitHub.ts`: `lookupAccount(name)` (`user|org|missing|unknown`) and `repoExists(owner, repo)` (`public|unknown`), no credentials, network or rate-limit errors → `unknown`, results cached per page view; tests with mocked fetch

## 5. Setup wizard UI

- [x] 5.1 Mode selector with three options plus the team-path comparison block (org path marked recommended) (D1, D6)
- [x] 5.2 Intro sentence "your code project is untouched / own new, empty repository"; names card with only the account field and the "Data repository: owner/repo, new and empty · Change name" line; expanded input when the name differs from the default (D7)
- [x] 5.3 Rework `Step` in `parts.tsx`: states current / done (collapsed, reopen, "Not done yet") / later (muted title, click to open); "Done when …" line and "Done, next step" button replacing the checkbox; focus the next heading (D2, D3)
- [x] 5.4 Add steps for `personal-team`: repository in own account, collaborators (Add people link), owner token, invite (message with repository invitation plus classic token note), sign-in
- [x] 5.5 `GitHubLink` `onOpen` callback; return-from-GitHub inline prompt on `visibilitychange`/`focus`, with "Yes, next step" and "No, help me" showing per-step common mistakes (D4)
- [x] 5.6 Wire public checks: auto-done org step, personal-account notice with a switch button, org-name-on-personal-path hint, missing-account error, existing-public-repo warning (D5)
- [x] 5.7 Rename the last step to "Check setup and sign in"; support `#/setup?step=<id>` to open a step
- [ ] 5.8 Write all new copy in `en.ts` and `de.ts`: comparison, done criteria, help lists, notices, personal-team steps and invite message. Check the "Done when" wording against the live GitHub pages
- [x] 5.9 Update `onboardingPages.test.tsx` for the one-step-at-a-time flow, three paths, comparison, return prompt, public checks (mocked) and the hidden repository name

## 6. Join flow, team helper, fix page

- [x] 6.1 `JoinPage` with `kind=user`: link to the repository invitation, classic token step with the "repo" scope and the reach-all-repositories warning; tests
- [x] 6.2 `TeamHelper`: show for owners of user-owned repositories with the invite link (`kind=user`) and the collaborator settings link, without the pending requests link; tests
- [x] 6.3 `fixSteps.ts`: `setupStepFor(error)` mapping; the fix page shows "Back to step N: <title>" linking to `#/setup?step=<id>` when `from=setup`; tests

## 7. Verify

- [x] 7.1 Run lint, typecheck and the full test suite
- [ ] 7.2 Walk through all three setup paths and the personal-account join flow in the running app, in both languages and at phone width
- [x] 7.3 Walk through the tracker changes: remembered preferences, Team now hide, inline date, edit dialog closing
