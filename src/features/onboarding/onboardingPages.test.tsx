import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import '../../i18n'
import { CopyText } from '../../components/CopyText'
import { FakeGitHub } from '../../storage/github/fakeGitHub'
import { AuthContext } from '../auth/AuthContext'
import { FixPage } from '../auth/FixPage'
import { LoginPage } from '../auth/LoginPage'
import { signInAttempt } from '../auth/signInAttempt'
import { TokenHelpPage } from '../auth/TokenHelpPage'
import { ApprovePage } from './ApprovePage'
import { JoinPage } from './JoinPage'
import { forgetLookups } from './publicGitHub'
import { SetupPage } from './SetupPage'

function renderAt(path: string) {
  const login = vi.fn(async () => {})
  const auth = { state: { status: 'loggedOut' as const }, login, logout: async () => {} }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="setup" element={<SetupPage />} />
            <Route path="join" element={<JoinPage />} />
            <Route path="token-help" element={<TokenHelpPage />} />
            <Route path="fix" element={<FixPage />} />
            <Route path="approve" element={<ApprovePage />} />
            <Route path="*" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return { login }
}

function mockClipboard() {
  const writeText = vi.fn<(text: string) => Promise<void>>(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  return writeText
}

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
  vi.unstubAllGlobals()
  localStorage.clear()
  signInAttempt.clear()
})

describe('CopyText', () => {
  it('copies the text and confirms', async () => {
    const writeText = mockClipboard()
    render(<CopyText text="hello" label="Copy it" />)
    fireEvent.click(screen.getByRole('button', { name: 'Copy it' }))
    await screen.findByRole('button', { name: 'Copied' })
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  it('shows the text selected when the clipboard is unavailable', async () => {
    render(<CopyText text={'line 1\nline 2'} label="Copy it" multiline />)
    expect(screen.queryByRole('textbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Copy it' }))
    const field = await screen.findByRole('textbox', { name: 'Copy it' })
    expect(field).toHaveValue('line 1\nline 2')
    expect(field).toHaveAttribute('readonly')
    expect(screen.getByRole('status')).toHaveTextContent(/Ctrl\+C/)
  })
})

describe('start page', () => {
  it('opens the setup wizard from the hero, the sign-in card and the steps', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: 'Set up for free' })).toHaveAttribute('href', '/setup')
    expect(screen.getByRole('link', { name: 'Start the setup' })).toHaveAttribute('href', '/setup')
    const steps = screen.getByRole('region', { name: 'How it works' })
    expect(within(steps).getByRole('link', { name: 'Open the setup guide' })).toHaveAttribute(
      'href',
      '/setup',
    )
    expect(within(steps).getByText(/Got an invite link/)).toBeInTheDocument()
  })

  it('explains order, owner and approval on the token help page', () => {
    renderAt('/token-help')
    expect(
      screen.getByRole('heading', { level: 1, name: 'How do I get a token?' }),
    ).toBeInTheDocument()
    const help = screen.getByRole('main')
    expect(
      within(help).getByText(/created before you had access will not work/),
    ).toBeInTheDocument()
    expect(within(help).getByText(/switch it from your own username/)).toBeInTheDocument()
    expect(within(help).getByText(/approve new tokens by default/)).toBeInTheDocument()
    expect(within(help).getByRole('link', { name: /Open the token form/ })).toHaveAttribute(
      'href',
      expect.stringContaining('name=Workaddict'),
    )
    expect(within(help).getByRole('link', { name: /Back to sign-in/ })).toHaveAttribute('href', '/')
    expect(within(help).getByRole('button', { name: 'Back to sign-in' })).toBeInTheDocument()
  })
})

describe('sign-in failure', () => {
  let gh: FakeGitHub
  beforeEach(() => {
    gh = new FakeGitHub('my-team', 'time-data')
    gh.users = { github_pat_anna: 'anna', ghp_anna: 'anna' }
    gh.accounts = { ben: 'User' }
    vi.stubGlobal('fetch', gh.fetch)
  })

  function signIn(repo: string, token = 'github_pat_anna') {
    fireEvent.change(screen.getByLabelText('Data repository'), { target: { value: repo } })
    fireEvent.change(screen.getByLabelText('GitHub token'), { target: { value: token } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  }

  const fixHeading = (name: string | RegExp) => screen.findByRole('heading', { level: 1, name })

  it('moves to the fix page with the member’s own steps and a message for the owner', async () => {
    renderAt('/')
    signIn('my-team/other')
    await fixHeading('Your token cannot see the repository my-team/other.')
    expect(screen.queryByText(/Free time tracking/)).toBeNull()
    expect(screen.queryByLabelText('GitHub token')).toBeNull()
    expect(screen.getByRole('link', { name: /Open the invitation/ })).toHaveAttribute(
      'href',
      'https://github.com/orgs/my-team/invitation',
    )
    expect(screen.getByRole('link', { name: /Open my-team\/other/ })).toBeInTheDocument()
    expect(screen.getByText(/resource owner must be my-team/)).toBeInTheDocument()
    expect(screen.queryByText(/waiting for approval/)).toBeNull()

    const writeText = mockClipboard()
    fireEvent.click(screen.getByRole('button', { name: 'Copy message for your owner' }))
    await waitFor(() => expect(writeText).toHaveBeenCalled())
    const message = writeText.mock.calls[0]![0]
    expect(message).toContain('My GitHub username: anna')
    expect(message).toContain('#/approve?org=my-team&repo=other&member=anna')
    expect(message).not.toContain('github_pat_anna')
  })

  it('asks for the repo scope instead of the resource owner for classic tokens', async () => {
    renderAt('/')
    signIn('my-team/other', 'ghp_anna')
    await fixHeading(/cannot see the repository/)
    expect(screen.getByText(/needs the “repo” scope/)).toBeInTheDocument()
    expect(screen.queryByText(/resource owner must be/)).toBeNull()
  })

  it('points out a misspelled owner without bothering the owner', async () => {
    renderAt('/')
    signIn('my-tema/time-data')
    await fixHeading('There is no GitHub account or organization named “my-tema”.')
    expect(screen.getByText(/copy owner\/name from the address bar/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy message for your owner' })).toBeNull()
  })

  it('explains that fine-grained tokens cannot reach another person’s repo', async () => {
    renderAt('/')
    signIn('ben/time-data')
    await fixHeading(/belongs to the personal account of ben/)
    expect(
      screen.getByText(/move the repository into a free GitHub organization/),
    ).toBeInTheDocument()
  })

  it('names the user’s own repo', async () => {
    renderAt('/')
    signIn('anna/time-data')
    await fixHeading(/in your own account/)
  })

  it('asks for a read-and-write token and offers the owner message for read-only access', async () => {
    gh.push = false
    renderAt('/')
    signIn('my-team/time-data')
    await fixHeading('You can read the repository my-team/time-data, but not write to it.')
    expect(screen.getByText(/Contents: Read-only/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy message for your owner' })).toBeInTheDocument()
  })

  it('tries again with the token kept in memory and signs in', async () => {
    gh.push = false
    const { login } = renderAt('/')
    signIn('my-team/time-data')
    await fixHeading(/but not write to it/)
    expect(JSON.stringify(localStorage)).not.toContain('github_pat_anna')
    expect(JSON.stringify(sessionStorage)).not.toContain('github_pat_anna')

    gh.push = true
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(login).toHaveBeenCalled())
    expect(login).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'github_pat_anna', repo: 'my-team/time-data' }),
      true,
    )
  })

  it('shows the new error when trying again fails differently', async () => {
    gh.push = false
    renderAt('/')
    signIn('my-team/time-data')
    await fixHeading(/but not write to it/)
    gh.users = {}
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await fixHeading(/GitHub rejected this token/)
  })

  it('goes back to the form with the entered values', async () => {
    renderAt('/')
    signIn('my-team/other')
    await fixHeading(/cannot see the repository/)
    fireEvent.click(screen.getByRole('link', { name: 'Change token or repository' }))
    expect(await screen.findByLabelText('Data repository')).toHaveValue('my-team/other')
    expect(screen.getByLabelText('GitHub token')).toHaveValue('github_pat_anna')
  })

  it('still shows the steps without the attempt, for example after a reload', () => {
    renderAt('/fix?e=orgRepoNotAccessible&repo=my-team/time-data&from=start')
    expect(screen.getByRole('link', { name: /Open the invitation/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.getAllByRole('link', { name: /Back to sign-in/ }).length).toBeGreaterThan(0)
  })

  it('sends a failed setup sign-in back to the step to redo', () => {
    localStorage.setItem(
      'workaddict.setup',
      '{"mode":"team","org":"my-team","repo":"time-data","done":["org","repo","base","approval","invite","token","share"]}',
    )
    renderAt('/fix?e=repoNotFound&repo=my-team/time-data&from=setup')
    expect(
      screen.getByText(/Most likely to redo: the setup step “Create a new, empty repository”/),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Open this step' }))
    expect(screen.getByRole('link', { name: /Create my-team\/time-data/ })).toBeInTheDocument()
  })

  it('names the token step for a token that cannot see the repository', () => {
    renderAt('/fix?e=orgRepoNotAccessible&repo=my-team/time-data&from=setup')
    expect(screen.getByText(/the setup step “Create your own token”/)).toBeInTheDocument()
  })

  it('shows the general steps for an unknown error code', () => {
    renderAt('/fix?e=nonsense')
    expect(
      screen.getByRole('heading', { level: 1, name: /Something went wrong/ }),
    ).toBeInTheDocument()
  })

  it('signs in and remembers that the repo belongs to an organization', async () => {
    const { login } = renderAt('/')
    signIn('my-team/time-data')
    await waitFor(() => expect(login).toHaveBeenCalled())
    expect(login.mock.calls[0]).toEqual([
      expect.objectContaining({
        mode: 'github',
        repo: 'my-team/time-data',
        ownerType: 'Organization',
      }),
      true,
    ])
  })

  it('moves to the fix page from the join flow and returns to its sign-in step', async () => {
    renderAt('/join?repo=my-team/time-data')
    fireEvent.click(screen.getByRole('button', { name: 'I can see it' }))
    fireEvent.change(screen.getByLabelText('GitHub token'), { target: { value: 'github_pat_x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await fixHeading(/GitHub rejected this token/)
    fireEvent.click(screen.getByRole('link', { name: 'Change token or repository' }))
    expect(await screen.findByLabelText('GitHub token')).toHaveValue('github_pat_x')
  })
})

describe('owner page', () => {
  it('shows one button per owner action for an organization', () => {
    renderAt('/approve?org=my-team&repo=time-data&member=anna')
    expect(
      screen.getByRole('heading', { level: 1, name: 'anna cannot sign in to your time tracking' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open pending requests/ })).toHaveAttribute(
      'href',
      'https://github.com/organizations/my-team/settings/personal-access-token-requests',
    )
    expect(screen.getByRole('link', { name: /Open People/ })).toHaveAttribute(
      'href',
      'https://github.com/orgs/my-team/people',
    )
    expect(screen.getByRole('link', { name: /Open the token policy/ })).toBeInTheDocument()
    expect(screen.getByText(/The list is empty/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy note for anna' })).toBeInTheDocument()
  })

  it('uses neutral wording without a valid member', () => {
    renderAt('/approve?org=my-team&repo=time-data&member=a%20b')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'A member cannot sign in to your time tracking',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy note for the member' })).toBeInTheDocument()
  })

  it('only asks to add a collaborator for a personal repository', () => {
    renderAt('/approve?org=ben&repo=time-data&member=anna&kind=user')
    expect(screen.getByRole('link', { name: /Open Collaborators and teams/ })).toHaveAttribute(
      'href',
      'https://github.com/ben/time-data/settings/access',
    )
    expect(screen.queryByRole('link', { name: /Open pending requests/ })).toBeNull()
  })

  it('shows only a notice for a broken link', () => {
    renderAt('/approve?org=%3Cscript%3E&repo=x')
    expect(screen.getByRole('alert')).toHaveTextContent(/This link is broken/)
    const links = within(screen.getByRole('main')).getAllByRole('link')
    expect(links.filter((a) => a.getAttribute('href')?.includes('github.com'))).toEqual([])
  })
})

describe('setup wizard', () => {
  /** GitHub's public API, by path; anything else answers like a rate limit (no advice). */
  function stubGitHub(answers: Record<string, unknown> = {}) {
    const fetch = vi.fn(async (url: string) => {
      const path = url.replace('https://api.github.com', '')
      return path in answers
        ? new Response(JSON.stringify(answers[path]), { status: 200 })
        : new Response('{}', { status: 403 })
    })
    vi.stubGlobal('fetch', fetch)
    return fetch
  }
  beforeEach(() => {
    stubGitHub()
  })
  afterEach(() => forgetLookups())

  const TEAM = 'A team with an organization'
  /** The wizard asks who it is for first; most of these tests cover the organization path. */
  const openTeamWizard = (org = 'my-team') => {
    renderAt('/setup')
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(TEAM) }))
    if (org)
      fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: org } })
  }
  const doneNext = () => fireEvent.click(screen.getByRole('button', { name: 'Done, next step' }))
  const openStep = (title: string) => fireEvent.click(screen.getByRole('button', { name: title }))

  it('says that the code project is not used', () => {
    renderAt('/setup')
    expect(screen.getByText(/does not use or change your code projects/)).toBeInTheDocument()
  })

  it('opens one step at a time and moves on with "Done, next step"', async () => {
    openTeamWizard()
    expect(screen.getByRole('link', { name: /Create an organization/ })).toBeInTheDocument()
    // Later steps show only their title.
    expect(screen.queryByRole('link', { name: /Create my-team\/time-data/ })).toBeNull()
    expect(
      screen.getByText(/GitHub shows the page of your organization my-team/),
    ).toBeInTheDocument()

    doneNext()
    expect(screen.queryByRole('link', { name: /Create an organization/ })).toBeNull()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Create a new, empty repository' })).toHaveFocus(),
    )
    expect(screen.getByRole('link', { name: /Create my-team\/time-data/ })).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^https:\/\/github\.com\/new\?owner=my-team&name=time-data&visibility=private/,
      ),
    )
    expect(screen.getByText('1 of 7 done')).toBeInTheDocument()
  })

  it('opens a later step by its title without marking anything done', () => {
    openTeamWizard()
    openStep('Give members write access')
    expect(screen.getByRole('link', { name: /Open member privileges/ })).toHaveAttribute(
      'href',
      'https://github.com/organizations/my-team/settings/member_privileges',
    )
    expect(screen.getByText(/Write applies to all repositories of my-team/)).toBeInTheDocument()
    openStep('Decide on token approval')
    expect(screen.getByRole('link', { name: /Open the token policy/ })).toHaveAttribute(
      'href',
      'https://github.com/organizations/my-team/settings/personal-access-tokens',
    )
    openStep('Create your own token')
    expect(screen.getByRole('link', { name: /Open the token form/ })).toHaveAttribute(
      'href',
      expect.stringContaining('name=Workaddict'),
    )
    openStep('Check setup and sign in')
    expect(screen.getByLabelText('Data repository')).toHaveValue('my-team/time-data')
    expect(screen.getByText('0 of 7 done')).toBeInTheDocument()
  })

  it('lets a done step be undone', () => {
    openTeamWizard()
    doneNext()
    openStep('Create a free organization')
    fireEvent.click(screen.getByRole('button', { name: 'Not done yet' }))
    expect(screen.getByText('0 of 7 done')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create an organization/ })).toBeInTheDocument()
  })

  it('hides the repository name until the user wants to change it', () => {
    openTeamWizard()
    expect(
      screen.getByText('Data repository: my-team/time-data, new and empty'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Repository name')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Change name' }))
    expect(screen.getByLabelText('Repository name')).toHaveValue('time-data')
  })

  it('rejects an invalid organization name', () => {
    openTeamWizard('my team')
    expect(screen.getByText(/Only letters, digits and single hyphens/)).toBeInTheDocument()
    expect(screen.getAllByText(/Enter a valid organization name above/)).toHaveLength(1)
    expect(screen.queryByRole('link', { name: /Create an organization/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Done, next step' })).toBeNull()
  })

  it('locks every step until the names are valid', () => {
    openTeamWizard('')
    // An empty name: steps show their titles but nothing to click.
    expect(screen.getByRole('heading', { name: 'Create a free organization' })).toBeInTheDocument()
    expect(screen.getAllByText(/Enter a valid organization name above/)).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Done, next step' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Create an organization/ })).toBeNull()
    expect(screen.queryByLabelText('Data repository')).toBeNull()

    fireEvent.change(screen.getByLabelText('Organization name'), { target: { value: 'my-team' } })
    doneNext()

    // A broken repository name locks everything again, but keeps what was done.
    fireEvent.click(screen.getByRole('button', { name: 'Change name' }))
    fireEvent.change(screen.getByLabelText('Repository name'), { target: { value: 'bad name' } })
    expect(screen.getAllByText(/Fix the repository name above/)).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Done, next step' })).toBeNull()
    expect(screen.getByText('1 of 7 done')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Repository name'), { target: { value: 'time-data' } })
    expect(screen.getByRole('link', { name: /Create my-team\/time-data/ })).toBeInTheDocument()
  })

  it('keeps the path choice visible and selected', () => {
    renderAt('/setup')
    for (const name of ['Just me', TEAM, 'A team on my account']) {
      expect(screen.getByRole('radio', { name: new RegExp(name) })).not.toBeChecked()
    }
    expect(screen.queryByLabelText('Organization name')).toBeNull()
    expect(screen.queryByLabelText('Your GitHub username')).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(TEAM) }))
    expect(screen.getByRole('radio', { name: new RegExp(TEAM) })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Just me/ })).not.toBeChecked()
    expect(screen.getByLabelText('Organization name')).toBeInTheDocument()
  })

  it('compares the two team paths honestly', () => {
    renderAt('/setup')
    fireEvent.click(screen.getByRole('radio', { name: /A team on my account/ }))
    const compare = screen.getByRole('group', { name: 'Which team path fits you?' })
    expect(within(compare).getByText('Recommended')).toBeInTheDocument()
    expect(compare).toHaveTextContent(/can read and change all of that member’s repositories/)
    expect(compare).toHaveTextContent(/your code repositories stay where they are/)
  })

  it('keeps progress across a reload and reopens at the current step', () => {
    openTeamWizard()
    doneNext()
    doneNext()
    doneNext()
    expect(screen.getByText('3 of 7 done')).toBeInTheDocument()

    document.body.innerHTML = ''
    renderAt('/setup')
    expect(screen.getByLabelText('Organization name')).toHaveValue('my-team')
    expect(screen.getByText('3 of 7 done')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open the token policy/ })).toBeInTheDocument()
  })

  it('opens the step named in the address', () => {
    localStorage.setItem(
      'workaddict.setup',
      '{"mode":"team","org":"my-team","repo":"time-data","done":["org","repo"]}',
    )
    renderAt('/setup?step=repo')
    expect(screen.getByRole('link', { name: /Create my-team\/time-data/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Not done yet' })).toBeInTheDocument()
  })

  it('mentions approval in the invite only when the owner keeps it on', () => {
    openTeamWizard()
    openStep('Decide on token approval')
    fireEvent.click(screen.getByRole('radio', { name: /Turn approval off/ }))
    openStep('Invite the team')
    const message = () =>
      screen.getByRole('textbox', { name: 'Copy message' }) as HTMLTextAreaElement
    expect(message().value).not.toMatch(/approve/)
    expect(screen.queryByRole('link', { name: /Open pending requests/ })).toBeNull()

    fireEvent.click(screen.getByRole('radio', { name: /Keep approval on/ }))
    expect(message().value).toMatch(/approve/)
    expect(screen.getByRole('link', { name: /Open pending requests/ })).toHaveAttribute(
      'href',
      'https://github.com/organizations/my-team/settings/personal-access-token-requests',
    )
    expect((screen.getByRole('textbox', { name: 'Copy link' }) as HTMLInputElement).value).toMatch(
      /#\/join\?repo=my-team\/time-data$/,
    )
  })

  it('generates GitHub CLI commands for valid usernames only', () => {
    openTeamWizard()
    openStep('Invite your members')
    fireEvent.change(screen.getByLabelText(/GitHub usernames/), {
      target: { value: 'anna, ben; x' },
    })
    const commands = (screen.getByRole('textbox', { name: 'Copy commands' }) as HTMLTextAreaElement)
      .value
    expect(commands).toContain('gh api -X PUT orgs/my-team/memberships/anna -f role=member')
    expect(commands).not.toContain('ben')
    expect(screen.getByRole('alert')).toHaveTextContent('Not valid GitHub usernames: ben;')
  })

  it('skips the organization steps when the setup is for one person', () => {
    renderAt('/setup')
    fireEvent.click(screen.getByRole('radio', { name: /Just me/ }))
    fireEvent.change(screen.getByLabelText('Your GitHub username'), {
      target: { value: 'my-name' },
    })

    // A private repository in your own account: nothing to share, approve or invite.
    expect(screen.getByText('0 of 2 done')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Create a free organization' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Give members write access' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Invite the team' })).toBeNull()
    expect(screen.queryByLabelText('Organization name')).toBeNull()

    expect(screen.getByRole('link', { name: /Create my-name\/time-data/ })).toHaveAttribute(
      'href',
      expect.stringMatching(
        /^https:\/\/github\.com\/new\?owner=my-name&name=time-data&visibility=private/,
      ),
    )
    doneNext()
    expect(screen.getByRole('link', { name: /Open the token form/ })).toHaveAttribute(
      'href',
      expect.stringContaining('name=Workaddict'),
    )
    doneNext()
    expect(screen.getByLabelText('Data repository')).toHaveValue('my-name/time-data')
    expect(screen.getByText(/Choose “A team on my account” above/)).toBeInTheDocument()
    // Nothing on the solo path may talk about an organization's pages.
    expect(screen.getByRole('heading', { name: 'Set up your time tracking' })).toBeInTheDocument()
    expect(screen.queryByText(/Organization page/)).toBeNull()
  })

  it('sets up a team on a personal account with collaborators and classic tokens', () => {
    renderAt('/setup')
    fireEvent.click(screen.getByRole('radio', { name: /A team on my account/ }))
    fireEvent.change(screen.getByLabelText('Your GitHub username'), { target: { value: 'ben' } })
    expect(screen.getByText('0 of 4 done')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Create a free organization' })).toBeNull()

    doneNext()
    expect(screen.getByRole('link', { name: /Open collaborators/ })).toHaveAttribute(
      'href',
      'https://github.com/ben/time-data/settings/access',
    )
    openStep('Invite the team')
    expect((screen.getByRole('textbox', { name: 'Copy link' }) as HTMLInputElement).value).toMatch(
      /#\/join\?repo=ben\/time-data&kind=user$/,
    )
    const message = (screen.getByRole('textbox', { name: 'Copy message' }) as HTMLTextAreaElement)
      .value
    expect(message).toContain('https://github.com/ben/time-data/invitations')
    expect(message).toMatch(/classic GitHub token/)
  })

  it('lets the user switch between the solo and team paths', () => {
    renderAt('/setup')
    fireEvent.click(screen.getByRole('radio', { name: /Just me/ }))
    fireEvent.change(screen.getByLabelText('Your GitHub username'), {
      target: { value: 'my-name' },
    })

    fireEvent.click(screen.getByRole('radio', { name: new RegExp(TEAM) }))
    expect(screen.getByLabelText('Organization name')).toHaveValue('my-name')
    expect(screen.getByText('0 of 7 done')).toBeInTheDocument()
  })

  describe('coming back from GitHub', () => {
    const leaveAndReturn = () => {
      fireEvent.blur(window)
      fireEvent.focus(window)
    }

    it('asks whether the step worked and helps when it did not', () => {
      openTeamWizard()
      const link = screen.getByRole('link', { name: /Create an organization/ })
      link.addEventListener('click', (e) => e.preventDefault())
      fireEvent.click(link)
      leaveAndReturn()
      expect(screen.getByText('Back from GitHub. Did you see this?')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'No, help me' }))
      expect(screen.getByText('Common mistakes')).toBeInTheDocument()
      expect(
        screen.getByText(/Choose the Free plan; you don’t need a paid plan/),
      ).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Yes, next step' }))
      expect(screen.getByText('1 of 7 done')).toBeInTheDocument()
    })

    it('does not ask after an unrelated tab switch', () => {
      openTeamWizard()
      leaveAndReturn()
      expect(screen.queryByText('Back from GitHub. Did you see this?')).toBeNull()
    })
  })

  describe('public account checks', () => {
    it('ticks off an organization that already exists', async () => {
      stubGitHub({ '/users/my-team': { type: 'Organization' } })
      openTeamWizard()
      expect(await screen.findByText('1 of 7 done')).toBeInTheDocument()
      expect(screen.getByText('Found my-team on GitHub.')).toBeInTheDocument()
    })

    it('offers the personal-account path for a user name on the organization path', async () => {
      stubGitHub({ '/users/ben': { type: 'User' } })
      openTeamWizard('ben')
      expect(
        await screen.findByText('ben is a personal account, not an organization.'),
      ).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Set up a team on my account' }))
      expect(screen.getByRole('radio', { name: /A team on my account/ })).toBeChecked()
      expect(screen.getByLabelText('Your GitHub username')).toHaveValue('ben')
    })

    it('warns about an existing public repository', async () => {
      stubGitHub({ '/users/ben': { type: 'User' }, '/repos/ben/time-data': { private: false } })
      renderAt('/setup')
      fireEvent.click(screen.getByRole('radio', { name: /Just me/ }))
      fireEvent.change(screen.getByLabelText('Your GitHub username'), { target: { value: 'ben' } })
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'ben/time-data already exists and is public.',
      )
    })

    it('says nothing when GitHub gives no answer', async () => {
      const fetch = stubGitHub()
      openTeamWizard()
      await waitFor(() => expect(fetch).toHaveBeenCalled())
      expect(screen.getByText('0 of 7 done')).toBeInTheDocument()
      expect(screen.queryByText(/is a personal account/)).toBeNull()
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })
})

describe('join flow', () => {
  it('shows the repository and the invitation link', () => {
    renderAt('/join?repo=my-team/time-data')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Join my-team/time-data' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open the invitation/ })).toHaveAttribute(
      'href',
      'https://github.com/orgs/my-team/invitation',
    )
  })

  it('guides members of a personal repository to the repository invitation and a classic token', () => {
    renderAt('/join?repo=ben/time-data&kind=user')
    expect(screen.getByRole('link', { name: /Open the invitation/ })).toHaveAttribute(
      'href',
      'https://github.com/ben/time-data/invitations',
    )
    fireEvent.click(screen.getByRole('button', { name: 'I can see it' }))
    expect(screen.getByRole('link', { name: /Open the classic token form/ })).toHaveAttribute(
      'href',
      expect.stringContaining('scopes=repo'),
    )
    expect(screen.getByText(/can read and change all of your repositories/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Open the token form/ })).toBeNull()
  })

  it('keeps the token step locked until the member can see the repository', () => {
    renderAt('/join?repo=my-team/time-data')
    expect(screen.queryByRole('link', { name: /Open the token form/ })).toBeNull()
    expect(screen.queryByLabelText('GitHub token')).toBeNull()
    expect(screen.getAllByText('Unlocks once you can see the repository.')).toHaveLength(2)

    fireEvent.click(screen.getByRole('button', { name: 'I can see it' }))
    expect(screen.getByRole('link', { name: /Open the token form/ })).toHaveAttribute(
      'href',
      expect.stringContaining('name=Workaddict'),
    )
    expect(screen.getByText(/switch it from your own username to my-team/)).toBeInTheDocument()
    expect(screen.getByLabelText('Data repository')).toHaveValue('my-team/time-data')
    expect(screen.getByLabelText('Data repository')).toHaveAttribute('readonly')
    fireEvent.click(screen.getByRole('button', { name: 'Change repository' }))
    expect(screen.getByLabelText('Data repository')).not.toHaveAttribute('readonly')
  })

  it('sends a member without access to the owner instead of the token step', async () => {
    renderAt('/join?repo=my-team/time-data')
    fireEvent.click(screen.getByRole('button', { name: 'I get a 404 page' }))
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/Don’t create a token now/)
    expect(screen.queryByRole('link', { name: /Open the token form/ })).toBeNull()

    const writeText = mockClipboard()
    fireEvent.click(within(alert).getByRole('button', { name: 'Copy message for your owner' }))
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('#/approve?org=my-team&repo=time-data'),
      ),
    )

    fireEvent.click(within(alert).getByRole('button', { name: 'Check again' }))
    expect(screen.getByRole('button', { name: 'I can see it' })).toBeInTheDocument()
  })

  it('falls back to the start page for an invalid link', () => {
    renderAt('/join?repo=not%20a%20repo')
    expect(screen.getByText(/This invite link is invalid/)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Free time tracking. Your data stays yours.' }),
    ).toBeInTheDocument()
  })
})
