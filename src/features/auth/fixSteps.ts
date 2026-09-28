import type { TFunction } from 'i18next'
import type { LoginError } from '../../storage'
import { githubLinks } from '../onboarding/githubLinks'
import type { TokenKind } from './session'

const LOGIN_ERRORS: readonly LoginError[] = [
  'badRepoFormat',
  'invalidToken',
  'ownerNotFound',
  'orgRepoNotAccessible',
  'ownRepoNotAccessible',
  'personalRepoNotAccessible',
  'repoNotFound',
  'noPushAccess',
  'offline',
  'rateLimit',
  'unknown',
]

/** Reads the `e` parameter of the fix page; anything unknown becomes `unknown`. */
export function parseLoginError(value: string | null): LoginError {
  return LOGIN_ERRORS.find((e) => e === value) ?? 'unknown'
}

export interface FixLink {
  href: string
  label: string
  /** Translated menu path to the same GitHub page. */
  menu: string
}

/** One thing the member can check or do, with at most one button. */
export interface FixStep {
  text: string
  link?: FixLink
  /** Show the fine-grained token checklist (which brings its own button). */
  tokenChecklist?: boolean
}

export interface FixContext {
  /** Owner and repository name, only when they passed validation. */
  owner?: string
  repo?: string
  /** The kind of the entered token, or null when the attempt is no longer in memory. */
  token: TokenKind | null
  /** The formatted rate-limit reset time. */
  time?: string
}

/**
 * The steps the member can take themselves for a sign-in error. Anything only an owner can do
 * (approving the token, membership, Write access) is left to the owner page.
 */
export function fixSteps(t: TFunction, error: LoginError, ctx: FixContext): FixStep[] {
  const { owner, repo, token } = ctx
  const full = owner && repo ? `${owner}/${repo}` : undefined
  const classic = token === 'classic'
  const tokens: FixLink = {
    href: githubLinks.tokens(),
    label: t('fix.steps.tokensLink'),
    menu: t('onboarding.menu.tokens'),
  }
  const newToken: FixLink = {
    href: githubLinks.newToken(),
    label: t('fix.steps.newTokenLink'),
    menu: t('onboarding.menu.newToken'),
  }
  const classicToken: FixLink = {
    href: githubLinks.classicToken(),
    label: t('fix.steps.classicLink'),
    menu: t('onboarding.menu.tokens'),
  }

  switch (error) {
    case 'badRepoFormat':
    case 'ownerNotFound':
      return [{ text: t('fix.steps.repoFormat') }]
    case 'invalidToken':
      return [{ text: t('fix.steps.invalidToken'), tokenChecklist: true }]
    case 'orgRepoNotAccessible':
    case 'repoNotFound': {
      const steps: FixStep[] = []
      if (owner) {
        steps.push({
          text: t('fix.steps.invitation', { org: owner }),
          link: {
            href: githubLinks.orgInvitation(owner),
            label: t('fix.steps.invitationLink'),
            menu: t('onboarding.menu.orgInvitation'),
          },
        })
      }
      if (owner && repo) {
        steps.push({
          text: t('fix.steps.repoOpen'),
          link: {
            href: githubLinks.repo(owner, repo),
            label: t('fix.steps.repoOpenLink', { repo: full }),
            menu: t('onboarding.menu.repo', { repo: full }),
          },
        })
      }
      steps.push(
        classic
          ? { text: t('fix.steps.classicScope'), link: classicToken }
          : {
              text:
                owner && repo
                  ? t('fix.steps.resourceOwner', { org: owner, repo: full })
                  : t('fix.steps.resourceOwnerGeneric'),
              link: tokens,
            },
      )
      return steps
    }
    case 'ownRepoNotAccessible':
      return [{ text: t('fix.steps.ownRepo', { repo: full ?? '…' }), link: tokens }]
    case 'personalRepoNotAccessible':
      if (classic && owner && repo) {
        return [
          {
            text: t('fix.steps.personalInvite', { owner }),
            link: {
              href: githubLinks.repoInvitations(owner, repo),
              label: t('fix.steps.invitationLink'),
              menu: t('onboarding.menu.repoInvitations'),
            },
          },
        ]
      }
      return [
        { text: t('fix.steps.personalFineGrained', { owner: owner ?? '…' }), link: classicToken },
      ]
    case 'noPushAccess':
      return [{ text: t('fix.steps.readOnlyToken'), link: newToken }]
    case 'offline':
      return [{ text: t('fix.steps.offline') }]
    case 'rateLimit':
      return [{ text: t('fix.steps.rateLimit', { time: ctx.time ?? '…' }) }]
    case 'unknown':
      return [{ text: t('fix.steps.unknown') }]
  }
}

/** Whether an owner may have to act, so the fix page offers the message for the owner. */
export function needsOwner(error: LoginError, token: TokenKind | null): boolean {
  switch (error) {
    case 'orgRepoNotAccessible':
    case 'repoNotFound':
    case 'noPushAccess':
      return true
    case 'personalRepoNotAccessible':
      return token === 'classic'
    default:
      return false
  }
}
