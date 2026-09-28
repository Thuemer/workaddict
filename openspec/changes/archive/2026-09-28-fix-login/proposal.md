## Why

Failed sign-ins are still the biggest drop-off. The diagnosis shows up as a large red banner inside the sign-in card on the start page, with up to six causes, five links and a long owner message, surrounded by marketing content. Members cannot tell which button they need. Owners only receive a raw GitHub URL inside a copied message and often do not find the page where they approve a token. And when a token was created for the wrong resource owner, the owner sees an empty "Pending requests" list and thinks they are on the wrong page.

## What Changes

- Every failed sign-in (start page, setup wizard, join flow) redirects to a dedicated page `#/fix` whose only purpose is solving that error: a short headline, one block of steps with direct GitHub buttons, "Try again" and "Change token or repository". There is no hero, no highlights and no footer marketing.
- The typed token, repository and "remember me" choice are kept in memory only, so "Try again" signs in without retyping. The token never goes into the URL or browser storage. After a reload the page still shows the steps and offers "Back to sign-in".
- The member's page lists only what the member can check themselves. Everything that needs an owner goes behind one button, "Copy link for your owner".
- A new owner page `#/approve?org=…&repo=…&member=…` works both logged in and logged out. It shows one large button per owner action: approve the member's token (Pending requests), check membership, check Write access. It explains what an empty "Pending requests" list means and offers a note to send back to the member. It also recommends turning token approval off.
- The start page no longer shows the inline sign-in diagnosis. The notices for an expired session and for GitHub being unreachable stay.
- **BREAKING** (behaviour only): the "Copy message for the owner" text is replaced by a short message containing the owner-page link.

## Capabilities

### New Capabilities
- `sign-in-recovery`: the sign-in fix page for members (`#/fix`), the owner action page (`#/approve`), what each sign-in error shows there, and how the entered credentials are kept for "Try again".

### Modified Capabilities
- `auth-and-workspace`: the "Token login" requirement changes. A failed sign-in no longer shows the diagnosis inline; it redirects to the fix page, and the owner gets a link to the owner page instead of a long plain-text message.

## Impact

- `src/features/auth/SignInForm.tsx`: on failure, store the attempt and navigate to `#/fix` instead of rendering `LoginDiagnosis`.
- `src/features/auth/LoginPage.tsx`: the inline diagnosis is removed; the session and offline notices stay.
- `src/features/onboarding/LoginDiagnosis.tsx`: split into a member fix page and an owner page (new files under `src/features/auth/` or `src/features/onboarding/`).
- `src/features/onboarding/messages.ts`: the owner message becomes short and carries the owner-page link. There is a new "note for the member" text.
- `src/features/onboarding/githubLinks.ts`: a new `ownerPageLink(org, repo, member)` builder next to `inviteLink`.
- `src/app/App.tsx`: `fix` route in the logged-out branch; `approve` route in both branches.
- `src/i18n/en.ts`, `src/i18n/de.ts`: new `fix.*` and `approve.*` strings; `onboarding.diagnosis.*` strings move or are removed.
- Tests: `LoginPage.test.tsx`, `onboardingPages.test.tsx`, `onboarding.test.ts`, plus new page tests.
- No new dependencies, no storage or API changes.
