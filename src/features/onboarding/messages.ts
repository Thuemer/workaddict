import type { TFunction } from 'i18next'
import { githubLinks } from './githubLinks'

export interface OwnerMessageInput {
  /** The member's GitHub login, when known (after a token was checked). */
  memberLogin?: string
  owner: string
  repo: string
  /** The owner page for this repository and member (`ownerPageLink`). */
  link: string
}

/**
 * Short plain-text message a member sends to the repository owner, in the current language. It
 * names the member and the repository and links the owner page, which lists what to check. It never
 * contains the member's token.
 */
export function ownerMessage(t: TFunction, m: OwnerMessageInput): string {
  return [
    t('onboarding.ownerMsg.greeting'),
    '',
    t('onboarding.ownerMsg.noAccess', { repo: `${m.owner}/${m.repo}` }),
    ...(m.memberLogin ? [t('onboarding.ownerMsg.login', { login: m.memberLogin })] : []),
    '',
    t('onboarding.ownerMsg.openPage', { link: m.link }),
    '',
    t('onboarding.ownerMsg.thanks'),
  ].join('\n')
}

/**
 * The owner's note back to a member whose token does not show up under Pending requests: the token
 * was most likely created for the member's own account and has to be created again.
 */
export function memberNote(t: TFunction, m: { org: string; link: string }): string {
  return [
    t('approve.note.greeting'),
    '',
    t('approve.note.text', { org: m.org }),
    t('approve.note.link', { link: m.link }),
  ].join('\n')
}

export interface InviteMessageInput {
  link: string
  org: string
  repo: string
  approvalRequired: boolean
  /** `user`: the repository is in a personal account, so members join as collaborators. */
  kind?: 'user'
}

/** The owner's invitation for new members, in the current language. */
export function inviteMessage(t: TFunction, m: InviteMessageInput): string {
  const repo = `${m.org}/${m.repo}`
  const accept =
    m.kind === 'user'
      ? t('onboarding.inviteMsg.acceptRepo', {
          repo,
          link: githubLinks.repoInvitations(m.org, m.repo),
        })
      : t('onboarding.inviteMsg.accept', { org: m.org, link: githubLinks.orgInvitation(m.org) })
  return [
    t('onboarding.inviteMsg.intro', { repo }),
    '',
    `1. ${accept}`,
    `2. ${t('onboarding.inviteMsg.open', { link: m.link })}`,
    ...(m.kind === 'user' ? ['', t('onboarding.inviteMsg.classic')] : []),
    ...(m.approvalRequired ? ['', t('onboarding.inviteMsg.approval')] : []),
  ].join('\n')
}
