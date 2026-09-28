## 1. Foundations

- [x] 1.1 Add `src/features/auth/signInAttempt.ts`: in-memory store `{ token, repo, remember, from, failure }` with `set`, `get`, `clear` (D2)
- [x] 1.2 Add `ownerPageLink(org, repo, member?, kind?)` to `githubLinks.ts` next to `inviteLink`, with a unit test (D6)
- [x] 1.3 Add `fixSteps(error, ctx)` returning `{ text, link?, menu? }[]` per error code, plus `needsOwner(error, ctx)`, with unit tests for every error code (D9, spec "Steps per sign-in error")
- [x] 1.4 Replace `ownerMessage()` with the short owner message containing the owner-page link; add the "note for the member" builder; update `onboarding.test.ts` and assert that neither text contains the token (D7)

## 2. Sign-in flow

- [x] 2.1 Extract `useSignIn()` from `SignInForm`: runs `checkLogin` and `login`, clears the attempt on success, stores it and navigates to `#/fix?e=&repo=&from=` on failure (D1, D3)
- [x] 2.2 `SignInForm` takes a `from` prop, uses `useSignIn()`, and no longer renders `LoginDiagnosis`; the start page, `SetupPage` and `JoinPage` pass `start`, `setup` and `join`
- [x] 2.3 Start page and join flow prefill the repository (and the token while the attempt is in memory) when returning from the fix page (D4)
- [x] 2.4 Clear the attempt store on logout

## 3. Fix page (member)

- [x] 3.1 `FixPage.tsx` at `#/fix` in the logged-out routes: back link, headline with the repository, step list from `fixSteps` with full-width buttons and menu paths, no landing marketing (D8)
- [x] 3.2 Actions: "Try again" (only when the attempt is in memory) via `useSignIn()`, "Change token or repository" to the `from` target, "Back to sign-in" fallback
- [x] 3.3 "Copy message for your owner" for owner-related errors, using `ownerPageLink` with the member login and `kind=user` from the held failure
- [x] 3.4 Handle an unknown or missing `e` and an invalid `repo` parameter
- [x] 3.5 Show the rate-limit reset time in the user's time format

## 4. Owner page

- [x] 4.1 `ApprovePage.tsx` at `#/approve`, registered in both the logged-out and logged-in routes, outside `Layout` (D5)
- [x] 4.2 Validate `org`, `repo` and `member`; show a broken-link notice for invalid `org` or `repo`, and use neutral wording without `member`
- [x] 4.3 Organization owner: big buttons for Pending requests, People and repository access, the empty-list hint with "Copy note for <member>", and the recommendation to turn approval off (token policy link)
- [x] 4.4 Personal-account owner (`kind=user`): a single button to repository access for adding a collaborator with Write access

## 5. Texts and cleanup

- [x] 5.1 Add `fix.*` and `approve.*` strings to `en.ts` and `de.ts`; move the reused `onboarding.diagnosis.*` texts and remove unused ones together with `ownerMsg.*`
- [x] 5.2 Delete `LoginDiagnosis.tsx` and its styles once nothing imports them
- [x] 5.3 Styles for the step rows (full-width button plus menu path), light and dark, and at phone width

## 6. Tests and checks

- [x] 6.1 Rewrite `LoginPage.test.tsx` and `onboardingPages.test.tsx`: failure redirects to `#/fix`, no inline diagnosis, the session notices stay
- [x] 6.2 `FixPage` tests: steps per error, retry success signs in, retry failure changes the error, reload shows "Back to sign-in", no token in the URL or storage
- [x] 6.3 `ApprovePage` tests: logged-in and logged-out rendering, broken link, `kind=user`, neutral wording
- [x] 6.4 Run `npm run lint`, `npm test` and `npm run build`
- [ ] 6.5 Manual check in the browser: start page, setup and join failures in German and English, dark mode, phone width
