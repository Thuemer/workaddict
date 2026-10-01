## Why

The setup page still showed every step as one long list (folded, but all there). The owner wants a real wizard: one page at a time, moving on with "Next", so new customers are not hit with everything at once.

## What Changes

- The setup wizard becomes a sequence of pages: who it is for, the account name, one page per setup step, then "check setup and sign in".
- A progress bar with "Step X of N" at the top; "Back" and "Next" (or "Done, next step") at the bottom; pages slide in from the right when moving on and from the left when going back (no animation with reduced motion).
- The page is kept in the address (`#/setup?step=<id>`), so the browser's back button, reloads and the fix page's links work. Without one, the wizard continues where the user left off.
- Step pages open only after the names are valid; until then the wizard stays on the name page.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `team-onboarding`: "One step at a time" now means one page at a time; the locking of steps before valid names becomes "steps can't be reached before valid names".

## Impact

`src/features/onboarding/SetupPage.tsx` (rewritten as pages), `parts.tsx` (`WizardStep` replaced by `StepCheck`), styles, en/de strings, setup wizard tests.
