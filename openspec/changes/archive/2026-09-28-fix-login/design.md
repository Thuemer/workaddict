## Context

`SignInForm` is shared by the start page, the last step of the setup wizard (`SetupPage`) and the join flow (`JoinPage`). On failure it renders `LoginDiagnosis` inline: a red banner with a title, up to six numbered causes with GitHub links, and a copyable plain-text message for the owner built by `ownerMessage()` in `messages.ts`. On the start page this banner sits in the sign-in card next to the landing hero and above the highlights, which makes the page long and noisy right at the moment the user is stuck.

The owner side has no page of its own. Owners get the Pending requests URL only as text inside the member's message, or on the settings page (`TeamHelper`) if they happen to look there. A fine-grained token created for the member's personal account never appears under Pending requests and returns the same 404 as a missing invitation, so the app cannot tell the two apart (see the comment in `messages.ts`).

The app is a static SPA with `HashRouter`. Logged-out and logged-in states use different route sets in `App.tsx`; the logged-in set sends every unknown path to `/`.

## Goals / Non-Goals

**Goals:**
- One page per role, each with a single purpose: the member fixes what they can, the owner fixes what only they can.
- Straight buttons to the exact GitHub pages, with no scrolling past unrelated content.
- Retry without retyping the token, without the token ever leaving memory.
- A short, trustworthy owner message: an app link instead of a list of raw GitHub URLs.

**Non-Goals:**
- Detecting a pending token approval via the GitHub API (open question, possible follow-up spike).
- OAuth or GitHub App sign-in to replace personal access tokens.
- Changing the token help page, the setup wizard steps or the team helper on the settings page (the team helper can link to the owner page later).

## Decisions

### D1: Redirect on every error to `#/fix`, error code in the URL
`SignInForm` navigates to `#/fix?e=<error>&repo=<owner/name>&from=<start|setup|join>` for every failure, including typos and network errors. The URL carries only non-secret facts, so a reload keeps the page useful and every error has a single place in the code.
*Alternatives:* a modal over the start page (still shows the noisy page behind it; bad on phones); redirecting only owner-related errors (two different failure UIs to maintain; the user chose "every error").

### D2: Hold the attempt in a module-level store, not in storage
A small module `src/features/auth/signInAttempt.ts` holds `{ token, repo, remember, from, failure }` in a variable, with `set`, `get` and `clear`. `SignInForm` sets it before navigating; the fix page reads it; a successful login and logout clear it. The store is lost on reload, which is intentional: the page then shows "Back to sign-in".
*Alternatives:* `sessionStorage` (survives reload, but writes the token to disk-backed storage, against the "token only where the user asked" rule); React context in `App` (works too, but adds a provider for one value; the module store is simpler and easy to reset in tests); URL (never for the token).
The failure object (member login, owner type, reset time) is also held there. From the URL alone the page knows only the error code and repository, which is enough for the steps. The member login and `kind=user` for the owner link come from the held failure. Without it the owner link has no `member` and the page uses neutral wording.

### D3: Retry reuses `checkLogin` and `login`
"Try again" calls the same `checkLogin` and `login` as `SignInForm`. To avoid duplication, the submit logic moves into a hook `useSignIn()` that returns `{ submit(attempt), busy }` and navigates to `#/fix` on failure. `SignInForm` and the fix page both use it. On success the auth state becomes `loggedIn`, the logged-in routes take over, and `#/fix` falls through to `/`.

### D4: `from` decides where "Change token or repository" goes
`start` goes to `/` (sign-in card focused), `setup` goes to `/setup` (wizard progress is already kept in the browser, so the user lands on the last step), and `join` goes to `/join?repo=<repo>`. The start page's `SignInForm` gets `initialRepo` from the held attempt so the repository is prefilled; the token field stays empty unless the attempt is still in memory, in which case it is prefilled too.

### D5: `#/approve` exists in both route sets
Owners are usually signed in to the app. The route is added to the logged-out `Routes` and to the logged-in `Routes`, outside `Layout` so it looks the same for both and stays free of navigation noise. Parameters are validated with `isLogin` and `isRepoName` from `names.ts`; if they fail, only a broken-link notice is shown. `member` is validated with `isLogin`; if it is invalid it is dropped and the neutral wording is used.

### D6: Owner link builder in `githubLinks.ts`
`ownerPageLink(org, repo, member?, kind?)` sits next to `inviteLink` and uses the same `href.split('#')[0]` base, so it works on any host (GitHub Pages, custom domain, localhost).

### D7: Messages
- The member's owner message is 3–4 lines: greeting, "I can't sign in to our time tracking for {{repo}}", "Everything you need is on this page: {{link}}", thanks. The long checklist moves to the owner page.
- The owner page's "note for the member": "Your token is not in my Pending requests list. Please create a new token with {{org}} as the resource owner: {{tokenHelpLink}}".
- `ownerMessage()` and its `ownerMsg.*` strings are replaced; `inviteMessage()` is unchanged.

### D8: Page layout
Both pages reuse the `landing` shell with `PublicHeader` and the `ob-main` column used by `TokenHelpPage`, with no `SiteFooter` marketing and no `Highlights`. Steps use large full-width buttons (`btn btn-lg`) with the menu path underneath in `muted small`, so each step is one row a user can tick off by eye.

### D9: Component split
`LoginDiagnosis.tsx` is replaced by `FixPage.tsx` (member) and `ApprovePage.tsx` (owner). The per-error step content becomes a pure function `fixSteps(error, ctx)` returning a list of `{ text, link?, menu? }`, so the mapping from error to steps can be unit-tested without rendering.

## Risks / Trade-offs

- [Reloading the fix page loses "Try again"] → The steps remain; "Back to sign-in" is one click, and the repository is still in the URL for prefilling.
- [The owner link can be crafted by anyone] → The link only builds GitHub URLs from validated names and shows text; it grants nothing. React escapes the member name.
- [Owner opens the link on a device where they are signed in to GitHub with another account] → The approve button still opens the right org page; GitHub shows its own permission error. The page mentions "signed in as an owner of {{org}}" in the intro.
- [Typos also leave the start page] → The page has a big "Change token or repository" button that returns with the fields prefilled, so the round trip costs one click.
- [Existing tests assert the inline diagnosis] → They are rewritten against the fix page; `fixSteps` gets unit tests for every error code.
- [The static copy in `index.html` for crawlers] → Unaffected: `#/fix` and `#/approve` are not indexed pages.

## Migration Plan

Frontend-only; ships with the next deploy. Old owner messages already sent contain raw GitHub links and keep working. Rollback: revert the commit.

## Open Questions

- Can a pending fine-grained token approval be told apart from a real 404 via GitHub's response (status, message or headers)? If so, a follow-up can add a precise `tokenPending` error with its own fix block.
- Should the settings page team helper link to `#/approve` as the owner's single place later? Not needed for this change.
