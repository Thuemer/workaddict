import { useState } from 'react'
import { CopyText } from '../../components/CopyText'
import { useI18n } from '../../i18n'
import { parseRepo } from '../../storage'
import { useSessionData } from '../auth/AuthContext'
import { useAccess } from '../data/hooks'
import { ghCommands, githubLinks, inviteLink } from './githubLinks'
import { inviteMessage } from './messages'
import { parseUsernames } from './names'
import { GhCommandsField, GitHubLink } from './parts'

/**
 * Settings section for owners of the data repository: the invite link and message, and how to add
 * members. For an organization also the GitHub CLI commands and the pending token requests; for a
 * repository in a personal account the collaborator settings instead.
 */
export function TeamHelper() {
  const { t } = useI18n()
  const { session } = useSessionData()
  const access = useAccess()
  const [users, setUsers] = useState('')
  const parsed = session.mode === 'github' ? parseRepo(session.repo) : null
  if (session.mode !== 'github' || !session.ownerType || !access.owner || !parsed) return null
  const { owner: org, repo } = parsed
  const parsedUsers = parseUsernames(users)

  if (session.ownerType === 'User') {
    const link = inviteLink(org, repo, { kind: 'user' })
    return (
      <section className="section">
        <h2>{t('onboarding.team.title')}</h2>
        <div className="card settings-list">
          <div className="settings-row stack ob-team">
            <p>{t('onboarding.team.personalText', { repo: `${org}/${repo}` })}</p>
            <CopyText text={link} label={t('onboarding.setup.copyLink')} visible />
            <CopyText
              text={inviteMessage(t, { link, org, repo, approvalRequired: false, kind: 'user' })}
              label={t('onboarding.setup.copyMessage')}
              visible
              multiline
            />
          </div>
          <div className="settings-row stack ob-team">
            <h3>{t('onboarding.team.addTitle')}</h3>
            <p>{t('onboarding.team.personalAddText')}</p>
            <GitHubLink
              href={githubLinks.repoAccess(org, repo)}
              menu={t('onboarding.menu.repoAccess')}
            >
              {t('onboarding.setup.collaboratorsLink')}
            </GitHubLink>
          </div>
        </div>
      </section>
    )
  }

  const link = inviteLink(org, repo)

  return (
    <section className="section">
      <h2>{t('onboarding.team.title')}</h2>
      <div className="card settings-list">
        <div className="settings-row stack ob-team">
          <p>{t('onboarding.team.text', { org })}</p>
          <CopyText text={link} label={t('onboarding.setup.copyLink')} visible />
          <CopyText
            text={inviteMessage(t, { link, org, repo, approvalRequired: false })}
            label={t('onboarding.setup.copyMessage')}
            visible
            multiline
          />
        </div>
        <div className="settings-row stack ob-team">
          <h3>{t('onboarding.team.addTitle')}</h3>
          <p>{t('onboarding.team.addText')}</p>
          <GitHubLink href={githubLinks.people(org)} menu={t('onboarding.menu.people')}>
            {t('onboarding.setup.inviteLink')}
          </GitHubLink>
          <details className="ob-cli">
            <summary>{t('onboarding.setup.cliTitle')}</summary>
            <GhCommandsField
              users={users}
              onUsers={setUsers}
              invalid={parsedUsers.invalid}
              commands={ghCommands(org, parsedUsers.valid)}
            />
          </details>
        </div>
        <div className="settings-row stack ob-team">
          <p>{t('onboarding.team.pendingText')}</p>
          <GitHubLink
            href={githubLinks.pendingTokens(org)}
            menu={t('onboarding.menu.pendingTokens')}
          >
            {t('onboarding.setup.pendingLink')}
          </GitHubLink>
        </div>
      </div>
    </section>
  )
}
