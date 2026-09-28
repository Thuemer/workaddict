/**
 * Every GitHub page the onboarding links to, built from the organization (or account) and the
 * repository name. Keep all paths here so a moved GitHub page needs one fix; each link is shown
 * together with a menu path (i18n `onboarding.menu.*`) in case GitHub moves a page anyway.
 */

const GH = 'https://github.com'
const seg = encodeURIComponent

export const DEFAULT_REPO_NAME = 'time-data'

export const githubLinks = {
  createOrg: () => `${GH}/organizations/plan`,
  newRepo: (owner: string, repo: string) =>
    `${GH}/new?${new URLSearchParams({
      owner,
      name: repo,
      visibility: 'private',
      description: 'Workaddict time tracking data',
    })}`,
  memberPrivileges: (org: string) => `${GH}/organizations/${seg(org)}/settings/member_privileges`,
  tokenPolicy: (org: string) => `${GH}/organizations/${seg(org)}/settings/personal-access-tokens`,
  pendingTokens: (org: string) =>
    `${GH}/organizations/${seg(org)}/settings/personal-access-token-requests`,
  people: (org: string) => `${GH}/orgs/${seg(org)}/people`,
  orgInvitation: (org: string) => `${GH}/orgs/${seg(org)}/invitation`,
  repoInvitations: (owner: string, repo: string) => `${GH}/${seg(owner)}/${seg(repo)}/invitations`,
  repo: (owner: string, repo: string) => `${GH}/${seg(owner)}/${seg(repo)}`,
  repoAccess: (owner: string, repo: string) => `${GH}/${seg(owner)}/${seg(repo)}/settings/access`,
  tokens: () => `${GH}/settings/personal-access-tokens`,
  /**
   * The fine-grained token form. Verified against GitHub on 2026-09-23 (see design D2): only
   * `name` and `description` are applied. `target_name`, `expires_in` and `contents` are ignored,
   * so the form always opens on the personal account with a 30-day expiry and no permissions. The link therefore takes no owner; the checklist names the owner and walks the user through
   * setting the other four fields by hand.
   */
  newToken: () =>
    `${GH}/settings/personal-access-tokens/new?${new URLSearchParams({
      name: 'Workaddict',
      description: 'Time tracking with Workaddict',
    })}`,
  classicToken: () => `${GH}/settings/tokens/new?scopes=repo&description=Workaddict`,
}

/** A link to a page of this app (hash route), based on the current page URL. */
export function appLink(path: string, href = window.location.href): string {
  return `${href.split('#')[0]!}#${path}`
}

/** The app's invite link for a data repository, based on the current page URL. */
export function inviteLink(owner: string, repo: string, href = window.location.href): string {
  return appLink(`/join?repo=${seg(owner)}/${seg(repo)}`, href)
}

/**
 * The owner page a member sends to the repository owner when they can't sign in. `kind: 'user'`
 * marks a repository in a personal account, which has collaborators instead of org members.
 */
export function ownerPageLink(
  owner: string,
  repo: string,
  opts: { member?: string; kind?: 'user' } = {},
  href = window.location.href,
): string {
  const params = [`org=${seg(owner)}`, `repo=${seg(repo)}`]
  if (opts.member) params.push(`member=${seg(opts.member)}`)
  if (opts.kind) params.push(`kind=${opts.kind}`)
  return appLink(`/approve?${params.join('&')}`, href)
}

/**
 * Commands for the GitHub CLI. Names must be validated with `isLogin` / `isRepoName` first; they
 * then contain only letters, digits, `.`, `_` and `-`, so the same lines work in Bash and PowerShell.
 * With `repo`, the commands also create the private data repository and set the organization's
 * base permission to Write (first-time setup); without it they only invite members.
 */
export function ghCommands(
  org: string,
  usernames: string[],
  opts: { repo?: string } = {},
): string[] {
  return [
    'gh auth refresh -h github.com -s admin:org',
    ...(opts.repo
      ? [
          `gh repo create ${org}/${opts.repo} --private`,
          `gh api -X PATCH orgs/${org} -f default_repository_permission=write`,
        ]
      : []),
    ...usernames.map((u) => `gh api -X PUT orgs/${org}/memberships/${u} -f role=member`),
  ]
}
