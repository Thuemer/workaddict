import { useState, type ReactNode } from 'react'
import { CopyText } from '../../components/CopyText'
import { Icon } from '../../components/Icon'
import { useI18n } from '../../i18n'
import { githubLinks } from './githubLinks'

/** A link to a GitHub page, with the menu path that leads to the same page if GitHub moves it. */
export function GitHubLink({
  href,
  menu,
  children,
  primary = false,
}: {
  href: string
  /** Translated menu path, e.g. from `onboarding.menu.*`. */
  menu: string
  children: ReactNode
  primary?: boolean
}) {
  const { t } = useI18n()
  return (
    <span className="gh-link">
      <a
        className={primary ? 'btn btn-sm btn-primary' : undefined}
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {primary && <Icon name="github" size={14} />}
        {children} ↗
      </a>
      <span className="muted small">
        {t('onboarding.onGitHub')} {menu}
      </span>
    </span>
  )
}

/** One numbered step of the setup wizard or the join flow. */
export function Step({
  n,
  title,
  done,
  onDone,
  locked,
  lockedText,
  children,
}: {
  n: number
  title: string
  done?: boolean
  onDone?: (done: boolean) => void
  locked?: boolean
  lockedText?: string
  children?: ReactNode
}) {
  const { t } = useI18n()
  return (
    <li className={`card ob-step${done ? ' is-done' : ''}${locked ? ' is-locked' : ''}`}>
      <div className="ob-step-head">
        <span className="step-num" aria-hidden="true">
          {done ? <Icon name="check" size={16} /> : n}
        </span>
        <h2>{title}</h2>
        {onDone && !locked && (
          <label className="checkbox ob-done">
            <input type="checkbox" checked={!!done} onChange={(e) => onDone(e.target.checked)} />
            <span>{t('onboarding.done')}</span>
          </label>
        )}
      </div>
      {locked ? (
        lockedText && <p className="muted">{lockedText}</p>
      ) : (
        <div className="ob-step-body">{children}</div>
      )}
    </li>
  )
}

/**
 * What to fill in on GitHub's token form. The form is prefilled, but GitHub has had bugs with the
 * preselected owner and drops other fields when the owner changes, so the list asks to select the
 * owner again and to check Contents afterwards.
 */
export function TokenChecklist({ owner, repo }: { owner?: string; repo?: string }) {
  const { t } = useI18n()
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p className="muted small">{t('onboarding.token.intro')}</p>
      <ol className="ob-list">
        <li>{t('onboarding.token.sudo')}</li>
        <li>
          {owner ? t('onboarding.token.owner', { owner }) : t('onboarding.token.ownerGeneric')}
        </li>
        <li>{t('onboarding.token.expiry')}</li>
        <li>{repo ? t('onboarding.token.repo', { repo }) : t('onboarding.token.repoGeneric')}</li>
        <li>{t('onboarding.token.contents')}</li>
        <li>{t('onboarding.token.generate')}</li>
      </ol>
      <GitHubLink href={githubLinks.newToken()} menu={t('onboarding.menu.newToken')} primary>
        {t('onboarding.token.open')}
      </GitHubLink>
    </div>
  )
}

/** Username input and the generated GitHub CLI commands. */
export function GhCommandsField({
  users,
  onUsers,
  invalid,
  commands,
}: {
  users: string
  onUsers: (value: string) => void
  invalid: string[]
  commands: string[]
}) {
  const { t } = useI18n()
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="field">
        <span>{t('onboarding.setup.cliUsers')}</span>
        <input
          className="input"
          autoComplete="off"
          spellCheck={false}
          placeholder="anna, ben"
          value={users}
          aria-invalid={invalid.length > 0}
          onChange={(e) => onUsers(e.target.value)}
        />
      </label>
      {invalid.length > 0 && (
        <span className="small ob-invalid" role="alert">
          {t('onboarding.setup.cliInvalid', { names: invalid.join(', ') })}
        </span>
      )}
      <CopyText
        text={commands.join('\n')}
        label={t('onboarding.setup.cliCopy')}
        visible
        multiline
      />
    </div>
  )
}

export type WizardStepState = 'current' | 'done' | 'later' | 'locked'

/**
 * One step of the setup wizard, shown one at a time: the current step is open, done steps fold to
 * their title, later steps show only their title (both can be opened by clicking it).
 */
export function WizardStep({
  id,
  n,
  title,
  state,
  open,
  onToggle,
  lockedText,
  doneWhen,
  help,
  returned,
  onDone,
  onUndo,
  onLinkOpen,
  onHelp,
  children,
}: {
  id: string
  n: number
  title: string
  state: WizardStepState
  /** Whether the body is shown; the current step is always open. */
  open: boolean
  onToggle: () => void
  lockedText?: string
  /** What the user sees on GitHub when the step is done. */
  doneWhen?: string
  /** Common mistakes, one per line. */
  help?: string
  /** The user came back from a GitHub page opened in this step. */
  returned?: boolean
  onDone?: () => void
  onUndo?: () => void
  /** Called when a link to GitHub inside the step is opened. */
  onLinkOpen?: () => void
  /** Called when the user asks for help after coming back from GitHub. */
  onHelp?: () => void
  children?: ReactNode
}) {
  const { t } = useI18n()
  const [showHelp, setShowHelp] = useState(false)
  const done = state === 'done'
  const headingId = `ob-step-${id}`
  const toggleable = state === 'done' || state === 'later'
  const helpLines = help ? help.split('\n') : []

  const linkOpened = (e: { target: EventTarget }) => {
    if (e.target instanceof Element && e.target.closest('a[target="_blank"]')) onLinkOpen?.()
  }

  return (
    <li className={`card ob-step is-${state}${open ? ' is-open' : ''}`} aria-labelledby={headingId}>
      <div className="ob-step-head">
        <span className="step-num" aria-hidden="true">
          {done ? <Icon name="check" size={16} /> : n}
        </span>
        <h2 id={headingId} tabIndex={-1}>
          {toggleable ? (
            <button
              type="button"
              className="ob-step-toggle"
              aria-expanded={open}
              onClick={onToggle}
            >
              {title}
            </button>
          ) : (
            title
          )}
        </h2>
        {done && <span className="small ob-done-mark">{t('onboarding.setup.doneMark')}</span>}
      </div>
      {state === 'locked'
        ? lockedText && <p className="muted">{lockedText}</p>
        : open && (
            <div className="ob-step-body" onClick={linkOpened} onAuxClick={linkOpened}>
              {children}
              {returned && !done && doneWhen && (
                <div className="banner banner-info stack ob-return" role="status">
                  <strong>{t('onboarding.setup.returnTitle')}</strong>
                  <span>{doneWhen}</span>
                  <div className="row ob-answers">
                    <button type="button" className="btn btn-sm btn-primary" onClick={onDone}>
                      {t('onboarding.setup.returnYes')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setShowHelp(true)
                        onHelp?.()
                      }}
                    >
                      {t('onboarding.setup.returnNo')}
                    </button>
                  </div>
                </div>
              )}
              {showHelp && helpLines.length > 0 && (
                <div className="banner banner-warning stack ob-help" role="note">
                  <strong>{t('onboarding.setup.helpTitle')}</strong>
                  <ul className="ob-list">
                    {helpLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {doneWhen && !returned && !done && (
                <p className="small ob-done-when">
                  <strong>{t('onboarding.setup.doneWhen')}</strong> {doneWhen}
                </p>
              )}
              {onDone && !done && !returned && (
                <div className="row">
                  <button type="button" className="btn btn-primary btn-sm" onClick={onDone}>
                    {t('onboarding.setup.doneNext')}
                  </button>
                </div>
              )}
              {done && onUndo && (
                <div className="row">
                  <button type="button" className="link-btn small" onClick={onUndo}>
                    {t('onboarding.setup.notDone')}
                  </button>
                </div>
              )}
            </div>
          )}
    </li>
  )
}

/**
 * A classic token's checklist, for members of a repository in a personal account: fine-grained
 * tokens can't reach a repository where the user is only a collaborator.
 */
export function ClassicTokenChecklist({ owner }: { owner: string }) {
  const { t } = useI18n()
  return (
    <div className="stack" style={{ gap: 8 }}>
      <p>{t('onboarding.join.classicIntro', { owner })}</p>
      <div className="banner banner-warning" role="note">
        {t('onboarding.join.classicWarning')}
      </div>
      <ol className="ob-list">
        <li>{t('onboarding.token.sudo')}</li>
        <li>{t('onboarding.join.classicNote')}</li>
        <li>{t('onboarding.join.classicExpiry')}</li>
        <li>{t('onboarding.join.classicScope')}</li>
        <li>{t('onboarding.join.classicGenerate')}</li>
      </ol>
      <GitHubLink
        href={githubLinks.classicToken()}
        menu={t('onboarding.menu.classicToken')}
        primary
      >
        {t('onboarding.join.classicOpen')}
      </GitHubLink>
    </div>
  )
}
