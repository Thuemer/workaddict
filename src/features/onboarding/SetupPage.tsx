import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CopyText } from '../../components/CopyText'
import { Icon } from '../../components/Icon'
import { SiteFooter } from '../../components/SiteFooter'
import { useI18n } from '../../i18n'
import { PublicHeader } from '../auth/PublicHeader'
import { SignInForm } from '../auth/SignInForm'
import { DEFAULT_REPO_NAME, ghCommands, githubLinks, inviteLink } from './githubLinks'
import { inviteMessage } from './messages'
import { isLogin, isRepoName, parseUsernames } from './names'
import {
  GhCommandsField,
  GitHubLink,
  TokenChecklist,
  WizardStep,
  type WizardStepState,
} from './parts'
import {
  forgetLookups,
  lookupAccount,
  lookupRepo,
  type AccountKind,
  type RepoKind,
} from './publicGitHub'
import {
  emptySetup,
  isPersonal,
  SETUP_MODES,
  SETUP_STEPS,
  stepsFor,
  useSetupState,
  type SetupMode,
  type SetupStep,
} from './setupState'

/** A wizard step, or the final "check setup and sign in" step. */
type StepId = SetupStep | 'signIn'

const MODE_LABEL = {
  solo: ['onboarding.setup.modeSolo', 'onboarding.setup.modeSoloHint'],
  team: ['onboarding.setup.modeTeam', 'onboarding.setup.modeTeamHint'],
  'personal-team': ['onboarding.setup.modePersonalTeam', 'onboarding.setup.modePersonalTeamHint'],
} as const

function isStepId(value: string | null): value is StepId {
  return value === 'signIn' || (SETUP_STEPS as readonly string[]).includes(value ?? '')
}

/** Moves focus and scroll to a step's heading. */
function focusStep(id: StepId) {
  const heading = document.getElementById(`ob-step-${id}`)
  heading?.focus({ preventScroll: true })
  heading?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
}

/** Waits a moment after typing before asking GitHub, so each keystroke is not a request. */
const LOOKUP_DELAY_MS = 500

/**
 * The owner's guided setup, one step at a time. A team gets either an organization (safest tokens)
 * or a repository in the owner's personal account (classic tokens for members); one person setting
 * this up for themselves only needs a private repository and a token.
 */
export function SetupPage() {
  const { t } = useI18n()
  const [state, setState] = useSetupState()
  const [params] = useSearchParams()
  const [users, setUsers] = useState('')
  // Steps opened besides the current one: by clicking their title, or from the fix page.
  const [opened, setOpened] = useState<ReadonlySet<StepId>>(() => {
    const step = params.get('step')
    return new Set(isStepId(step) ? [step] : [])
  })
  // The step whose GitHub link was opened, and the step the user came back to.
  const [awaiting, setAwaiting] = useState<SetupStep | null>(null)
  const [returned, setReturned] = useState<SetupStep | null>(null)
  const [editRepo, setEditRepo] = useState(() => state.repo !== DEFAULT_REPO_NAME)
  const [account, setAccount] = useState<{ name: string; kind: AccountKind } | null>(null)
  const [publicRepo, setPublicRepo] = useState<{ name: string; kind: RepoKind } | null>(null)
  const [recheck, setRecheck] = useState(0)
  // The step named in the address (from the fix page), focused once on arrival.
  const [arrivalStep] = useState(() => [...opened][0] ?? null)
  const autoDoneFor = useRef<string | null>(null)

  const mode = state.mode
  const personal = isPersonal(mode)
  const solo = mode === 'solo'
  const team = mode === 'team'
  const org = state.org.trim()
  const repo = state.repo.trim()
  const orgValid = isLogin(org)
  const repoValid = isRepoName(repo)
  const ready = orgValid && repoValid
  // Every step builds GitHub links from these names, so none opens before both are usable.
  const locked = !ready
  const lockedText = t(
    !orgValid
      ? personal
        ? 'onboarding.setup.lockedUser'
        : 'onboarding.setup.lockedOrg'
      : 'onboarding.setup.lockedRepo',
  )
  const names = { org, repo }
  const fullRepo = `${org}/${repo}`

  const steps = stepsFor(mode ?? 'team')
  const isDone = (s: SetupStep) => state.done.includes(s)
  const current: StepId = steps.find((s) => !state.done.includes(s)) ?? 'signIn'
  const doneCount = state.done.filter((s) => steps.includes(s)).length
  const accountKind: AccountKind = account?.name === org ? account.kind : 'unknown'
  const repoKind: RepoKind = publicRepo?.name === fullRepo ? publicRepo.kind : 'unknown'

  useEffect(() => {
    if (arrivalStep) focusStep(arrivalStep)
    else document.documentElement.scrollTop = 0
  }, [arrivalStep])

  // Advice from GitHub's public API: does the account exist, and is it a user or an organization?
  useEffect(() => {
    if (!orgValid) return
    let live = true
    const timer = setTimeout(() => {
      void lookupAccount(org).then((kind) => live && setAccount({ name: org, kind }))
    }, LOOKUP_DELAY_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [org, orgValid, recheck])

  useEffect(() => {
    if (!ready) return
    let live = true
    const name = `${org}/${repo}`
    const timer = setTimeout(() => {
      void lookupRepo(org, repo).then((kind) => live && setPublicRepo({ name, kind }))
    }, LOOKUP_DELAY_MS)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [org, repo, ready])

  // An organization that already exists on GitHub needs no "create" step; ticked once per name,
  // so "Not done yet" sticks.
  useEffect(() => {
    if (!team || accountKind !== 'org' || autoDoneFor.current === org) return
    autoDoneFor.current = org
    setState((prev) =>
      prev.done.includes('org')
        ? prev
        : { ...prev, done: SETUP_STEPS.filter((x) => x === 'org' || prev.done.includes(x)) },
    )
  }, [team, accountKind, org, setState])

  // Back from a GitHub page opened in a step: ask whether it worked.
  useEffect(() => {
    if (!awaiting) return
    let left = false
    const leave = () => {
      left = true
    }
    const back = () => {
      if (!left) return
      setReturned(awaiting)
      setAwaiting(null)
      if (awaiting === 'org') {
        forgetLookups(`account:${org.toLowerCase()}`)
        setRecheck((n) => n + 1)
      }
    }
    const visibility = () => (document.visibilityState === 'hidden' ? leave() : back())
    window.addEventListener('blur', leave)
    window.addEventListener('focus', back)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', leave)
      window.removeEventListener('focus', back)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [awaiting, org])

  const markDone = (s: SetupStep) => {
    const next = steps.find((x) => x !== s && !state.done.includes(x)) ?? 'signIn'
    // After the re-render that opens the next step.
    setTimeout(() => focusStep(next))
    setState((prev) => ({
      ...prev,
      done: SETUP_STEPS.filter((x) => x === s || prev.done.includes(x)),
    }))
    setReturned(null)
    setOpened(new Set())
  }
  const undo = (s: SetupStep) => {
    setState((prev) => ({ ...prev, done: prev.done.filter((x) => x !== s) }))
    setOpened(new Set())
  }
  const chooseMode = (next: SetupMode) => setState((prev) => ({ ...prev, mode: next }))
  const startOver = () => {
    setState(emptySetup())
    setOpened(new Set())
    setReturned(null)
    setAwaiting(null)
    setEditRepo(false)
  }

  const stepState = (s: StepId): WizardStepState =>
    locked ? 'locked' : s !== 'signIn' && isDone(s) ? 'done' : s === current ? 'current' : 'later'
  const stepNo = (s: SetupStep) => steps.indexOf(s) + 1
  const common = (s: StepId) => ({
    id: s,
    state: stepState(s),
    open: !locked && (s === current || opened.has(s)),
    onToggle: () =>
      setOpened((prev) => {
        const next = new Set(prev)
        if (!next.delete(s)) next.add(s)
        return next
      }),
    // One note on the first step says what to enter; repeating it on every step is noise.
    lockedText: s === steps[0] ? lockedText : undefined,
  })
  const wizardStep = (s: SetupStep) => ({
    ...common(s),
    n: stepNo(s),
    doneWhen: t(`onboarding.setup.${s}DoneWhen`, names),
    help: t(`onboarding.setup.${s}Help`, names),
    returned: returned === s,
    onDone: () => markDone(s),
    onUndo: () => undo(s),
    onLinkOpen: () => setAwaiting(s),
  })

  const parsedUsers = parseUsernames(users)
  const link = ready && !solo ? inviteLink(org, repo, personal ? { kind: 'user' } : {}) : ''

  return (
    <div className="landing">
      <PublicHeader />
      <main className="ob-main">
        <Link to="/" className="ob-back">
          ← {t('onboarding.back')}
        </Link>
        <div className="stack" style={{ gap: 6 }}>
          <h1>{t(solo ? 'onboarding.setup.soloTitle' : 'onboarding.setup.title')}</h1>
          <p className="muted">
            {t(solo ? 'onboarding.setup.soloIntro' : 'onboarding.setup.intro')}
          </p>
          <p className="ob-code-note">
            <Icon name="check" size={14} /> {t('onboarding.setup.codeNote')}
          </p>
        </div>

        <section className="card ob-mode-card">
          <h2 className="h3" id="ob-mode-title">
            {t('onboarding.setup.modeTitle')}
          </h2>
          <div className="ob-modes" role="radiogroup" aria-labelledby="ob-mode-title">
            {SETUP_MODES.map((m) => (
              <label key={m} className={`ob-mode${mode === m ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  className="visually-hidden"
                  name="setup-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => chooseMode(m)}
                />
                <span className="ob-mode-mark" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                <span className="ob-mode-text">
                  <strong>{t(MODE_LABEL[m][0])}</strong>
                  <span className="muted small">{t(MODE_LABEL[m][1])}</span>
                </span>
              </label>
            ))}
          </div>
          {mode === null || solo ? (
            <p className="muted small">{t('onboarding.setup.modeLater')}</p>
          ) : (
            <TeamPathComparison />
          )}
        </section>

        {mode !== null && (
          <>
            <section className="card ob-names">
              <h2 className="h3">{t('onboarding.setup.namesTitle')}</h2>
              <div className="ob-names-fields">
                <div className="field">
                  <label className="field">
                    <span>{t(personal ? 'onboarding.setup.user' : 'onboarding.setup.org')}</span>
                    <input
                      className="input"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={personal ? 'my-name' : 'my-team'}
                      value={state.org}
                      aria-invalid={org !== '' && !orgValid}
                      onChange={(e) => setState((prev) => ({ ...prev, org: e.target.value }))}
                    />
                  </label>
                  {org !== '' && !orgValid ? (
                    <p className="small ob-invalid">
                      {t(personal ? 'onboarding.setup.userInvalid' : 'onboarding.setup.orgInvalid')}
                    </p>
                  ) : personal && accountKind === 'missing' ? (
                    <p className="small ob-invalid">{t('onboarding.setup.accountMissing')}</p>
                  ) : (
                    <p className="small muted">
                      {team && accountKind === 'org'
                        ? t('onboarding.setup.orgFound', { org })
                        : team && accountKind === 'missing'
                          ? t('onboarding.setup.orgMissing')
                          : t(personal ? 'onboarding.setup.userHint' : 'onboarding.setup.orgHint')}
                    </p>
                  )}
                </div>
                {team && accountKind === 'user' && (
                  <div className="banner banner-info stack ob-account-notice" role="status">
                    <span>{t('onboarding.setup.accountIsUser', { name: org })}</span>
                    <div className="row wrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => chooseMode('personal-team')}
                      >
                        {t('onboarding.setup.switchToPersonal')}
                      </button>
                    </div>
                    <span className="small">{t('onboarding.setup.accountIsUserOr')}</span>
                  </div>
                )}
                {personal && accountKind === 'org' && (
                  <div className="banner banner-info stack ob-account-notice" role="status">
                    <span>{t('onboarding.setup.accountIsOrg', { name: org })}</span>
                    <div className="row wrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => chooseMode('team')}
                      >
                        {t('onboarding.setup.switchToTeam')}
                      </button>
                    </div>
                  </div>
                )}
                {editRepo || !repoValid ? (
                  <div className="field">
                    <label className="field">
                      <span>{t('onboarding.setup.repo')}</span>
                      <input
                        className="input"
                        autoComplete="off"
                        spellCheck={false}
                        value={state.repo}
                        aria-invalid={!repoValid}
                        onChange={(e) => setState((prev) => ({ ...prev, repo: e.target.value }))}
                      />
                    </label>
                    <p className={`small${repoValid ? ' muted' : ' ob-invalid'}`}>
                      {t(repoValid ? 'onboarding.setup.repoHint' : 'onboarding.setup.repoInvalid')}
                    </p>
                  </div>
                ) : (
                  <p className="ob-repo-line">
                    <span>{t('onboarding.setup.repoLine', { repo: `${org || '…'}/${repo}` })}</span>{' '}
                    <button
                      type="button"
                      className="link-btn small"
                      onClick={() => setEditRepo(true)}
                    >
                      {t('onboarding.setup.repoChange')}
                    </button>
                  </p>
                )}
                {repoKind === 'public' && (
                  <div className="banner banner-warning" role="alert">
                    {t('onboarding.setup.repoPublic', { repo: fullRepo })}
                  </div>
                )}
              </div>
              <div className="ob-names-foot">
                <progress
                  className="ob-progress"
                  value={doneCount}
                  max={steps.length}
                  aria-labelledby="ob-progress-label"
                />
                <span id="ob-progress-label" className="muted small" role="status">
                  {t('onboarding.setup.progress', { done: doneCount, total: steps.length })}
                </span>
                <span className="spacer" />
                <button type="button" className="link-btn small" onClick={startOver}>
                  {t('onboarding.setup.reset')}
                </button>
              </div>
            </section>

            <ol className="ob-steps">
              {team && (
                <WizardStep {...wizardStep('org')} title={t('onboarding.setup.orgTitle')}>
                  <p>{t('onboarding.setup.orgText', names)}</p>
                  {accountKind === 'org' && (
                    <p className="small ob-found">
                      <Icon name="check" size={14} /> {t('onboarding.setup.orgFound', { org })}
                    </p>
                  )}
                  <p className="muted small">
                    {t('onboarding.setup.orgWhy')} {t('onboarding.setup.orgNote')}
                  </p>
                  <GitHubLink
                    href={githubLinks.createOrg()}
                    menu={t('onboarding.menu.createOrg')}
                    primary
                  >
                    {t('onboarding.setup.orgLink')}
                  </GitHubLink>
                </WizardStep>
              )}

              <WizardStep {...wizardStep('repo')} title={t('onboarding.setup.repoTitle')}>
                <p>
                  {t(
                    personal ? 'onboarding.setup.soloRepoText' : 'onboarding.setup.repoText',
                    names,
                  )}
                </p>
                <GitHubLink
                  href={githubLinks.newRepo(org, repo)}
                  menu={t(personal ? 'onboarding.menu.newRepoOwn' : 'onboarding.menu.newRepo')}
                  primary
                >
                  {t('onboarding.setup.repoLink', names)}
                </GitHubLink>
              </WizardStep>

              {team && (
                <WizardStep {...wizardStep('base')} title={t('onboarding.setup.baseTitle')}>
                  <p>{t('onboarding.setup.baseText')}</p>
                  <div className="banner banner-warning" role="note">
                    {t('onboarding.setup.baseCaveat', names)}
                  </div>
                  <GitHubLink
                    href={githubLinks.memberPrivileges(org)}
                    menu={t('onboarding.menu.memberPrivileges')}
                    primary
                  >
                    {t('onboarding.setup.baseLink')}
                  </GitHubLink>
                </WizardStep>
              )}

              {team && (
                <WizardStep {...wizardStep('approval')} title={t('onboarding.setup.approvalTitle')}>
                  <p>{t('onboarding.setup.approvalText')}</p>
                  <div
                    className="stack"
                    style={{ gap: 8 }}
                    role="radiogroup"
                    aria-label={t('onboarding.setup.approvalTitle')}
                  >
                    <label className="checkbox ob-choice">
                      <input
                        type="radio"
                        name="approval"
                        checked={state.approval === 'off'}
                        onChange={() => setState((prev) => ({ ...prev, approval: 'off' }))}
                      />
                      <span>
                        <strong>{t('onboarding.setup.approvalOff')}</strong>
                        <br />
                        <span className="muted small">{t('onboarding.setup.approvalOffHint')}</span>
                      </span>
                    </label>
                    <label className="checkbox ob-choice">
                      <input
                        type="radio"
                        name="approval"
                        checked={state.approval === 'on'}
                        onChange={() => setState((prev) => ({ ...prev, approval: 'on' }))}
                      />
                      <span>
                        <strong>{t('onboarding.setup.approvalOn')}</strong>
                        <br />
                        <span className="muted small">{t('onboarding.setup.approvalOnHint')}</span>
                      </span>
                    </label>
                  </div>
                  <GitHubLink
                    href={githubLinks.tokenPolicy(org)}
                    menu={t('onboarding.menu.tokenPolicy')}
                    primary
                  >
                    {t('onboarding.setup.approvalLink')}
                  </GitHubLink>
                </WizardStep>
              )}

              {team && (
                <WizardStep {...wizardStep('invite')} title={t('onboarding.setup.inviteTitle')}>
                  <p>{t('onboarding.setup.inviteText')}</p>
                  <GitHubLink
                    href={githubLinks.people(org)}
                    menu={t('onboarding.menu.people')}
                    primary
                  >
                    {t('onboarding.setup.inviteLink')}
                  </GitHubLink>
                  <details className="ob-cli">
                    <summary>{t('onboarding.setup.cliTitle')}</summary>
                    <p>{t('onboarding.setup.cliText')}</p>
                    <GhCommandsField
                      users={users}
                      onUsers={setUsers}
                      invalid={parsedUsers.invalid}
                      commands={ghCommands(org, parsedUsers.valid, { repo })}
                    />
                  </details>
                </WizardStep>
              )}

              {mode === 'personal-team' && (
                <WizardStep
                  {...wizardStep('collaborators')}
                  title={t('onboarding.setup.collaboratorsTitle')}
                >
                  <p>{t('onboarding.setup.collaboratorsText')}</p>
                  <GitHubLink
                    href={githubLinks.repoAccess(org, repo)}
                    menu={t('onboarding.menu.repoAccess')}
                    primary
                  >
                    {t('onboarding.setup.collaboratorsLink')}
                  </GitHubLink>
                </WizardStep>
              )}

              <WizardStep {...wizardStep('token')} title={t('onboarding.setup.tokenTitle')}>
                <p>
                  {t(
                    solo
                      ? 'onboarding.setup.soloTokenText'
                      : personal
                        ? 'onboarding.setup.personalTokenText'
                        : 'onboarding.setup.tokenText',
                  )}
                </p>
                <TokenChecklist owner={org} repo={fullRepo} />
              </WizardStep>

              {!solo && (
                <WizardStep {...wizardStep('share')} title={t('onboarding.setup.shareTitle')}>
                  <p>
                    {t(
                      personal
                        ? 'onboarding.setup.personalShareText'
                        : 'onboarding.setup.shareText',
                    )}
                  </p>
                  <CopyText text={link} label={t('onboarding.setup.copyLink')} visible />
                  <CopyText
                    text={inviteMessage(t, {
                      link,
                      org,
                      repo,
                      approvalRequired: team && state.approval === 'on',
                      kind: personal ? 'user' : undefined,
                    })}
                    label={t('onboarding.setup.copyMessage')}
                    visible
                    multiline
                  />
                  {team && state.approval === 'on' && (
                    <div className="banner banner-info stack" style={{ gap: 6 }}>
                      <span>{t('onboarding.setup.shareApproval')}</span>
                      <GitHubLink
                        href={githubLinks.pendingTokens(org)}
                        menu={t('onboarding.menu.pendingTokens')}
                      >
                        {t('onboarding.setup.pendingLink')}
                      </GitHubLink>
                    </div>
                  )}
                </WizardStep>
              )}

              <WizardStep
                {...common('signIn')}
                n={steps.length + 1}
                title={t('onboarding.setup.signInTitle')}
              >
                <p>{t('onboarding.setup.signInText')}</p>
                <SignInForm key={fullRepo} from="setup" initialRepo={fullRepo} />
                {solo && <p className="muted small">{t('onboarding.setup.soloLater')}</p>}
              </WizardStep>
            </ol>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

/** Honest pros and cons of the two team paths, shown when either is selected. */
function TeamPathComparison() {
  const { t } = useI18n()
  const column = (title: string, pros: string[], cons: string[], recommended = false) => (
    <div className={`ob-compare-col${recommended ? ' is-recommended' : ''}`}>
      <h3 className="ob-compare-title">
        {title}
        {recommended && <span className="badge">{t('onboarding.setup.compareRecommended')}</span>}
      </h3>
      <p className="visually-hidden">{t('onboarding.setup.pros')}</p>
      <ul className="ob-compare-list">
        {pros.map((p) => (
          <li key={p} className="is-pro">
            <span aria-hidden="true">+</span> {p}
          </li>
        ))}
      </ul>
      <p className="visually-hidden">{t('onboarding.setup.cons')}</p>
      <ul className="ob-compare-list">
        {cons.map((c) => (
          <li key={c} className="is-con">
            <span aria-hidden="true">−</span> {c}
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <div className="ob-compare" role="group" aria-labelledby="ob-compare-title">
      <h3 className="small ob-compare-head" id="ob-compare-title">
        {t('onboarding.setup.compareTitle')}
      </h3>
      <div className="ob-compare-cols">
        {column(
          t('onboarding.setup.compareOrg'),
          [t('onboarding.setup.compareOrgPro1'), t('onboarding.setup.compareOrgPro2')],
          [t('onboarding.setup.compareOrgCon1'), t('onboarding.setup.compareOrgCon2')],
          true,
        )}
        {column(
          t('onboarding.setup.comparePersonal'),
          [t('onboarding.setup.comparePersonalPro1'), t('onboarding.setup.comparePersonalPro2')],
          [t('onboarding.setup.comparePersonalCon1'), t('onboarding.setup.comparePersonalCon2')],
        )}
      </div>
      <p className="muted small">{t('onboarding.setup.compareBoth')}</p>
    </div>
  )
}
