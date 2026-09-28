## MODIFIED Requirements

### Requirement: Token login
The system SHALL let a user log in by entering a GitHub Personal Access Token and a data repository identifier in the form `owner/name`, and SHALL validate both before granting access. When the repository cannot be accessed, the system SHALL look up the repository owner with the same token to tell apart a nonexistent owner, an organization-owned repository, the user's own repository, and another user's personal repository. Every sign-in error, on the start page, in the setup wizard and in the join flow, SHALL redirect to the sign-in fix page (`#/fix`) defined in the `sign-in-recovery` capability instead of showing the diagnosis inside the sign-in form.

#### Scenario: Valid token and repository
- **WHEN** the user submits a token that authenticates against the GitHub API and a repository on which that token has push permission
- **THEN** the system logs the user in and shows the time tracker page

#### Scenario: Sign-in fails on the start page
- **WHEN** the user submits the start-page sign-in form and the check fails with any error
- **THEN** the app navigates to `#/fix` for that error and repository, and the start page shows no inline sign-in diagnosis

#### Scenario: Sign-in fails in the setup wizard or join flow
- **WHEN** the sign-in step of the setup wizard or the join flow fails
- **THEN** the app navigates to `#/fix`, and "Change token or repository" there leads back to that wizard or join step with the repository prefilled

#### Scenario: Owner lookup distinguishes the cause
- **WHEN** the token is valid and the repository is not accessible
- **THEN** the error passed to the fix page is one of `ownerNotFound`, `orgRepoNotAccessible`, `ownRepoNotAccessible`, `personalRepoNotAccessible`, or `repoNotFound` when the owner lookup itself fails

#### Scenario: Read-only access
- **WHEN** the token can read the repository but lacks push permission
- **THEN** the system refuses login and redirects to the fix page with the error `noPushAccess`

#### Scenario: Session notices stay on the start page
- **WHEN** the start page opens after the session expired or while GitHub cannot be reached
- **THEN** the corresponding notice is shown in the sign-in card as before, without a redirect
