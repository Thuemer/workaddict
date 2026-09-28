import { describe, expect, it } from 'vitest'
import i18n from '../../i18n'
import type { LoginError } from '../../storage'
import { fixSteps, needsOwner, parseLoginError } from './fixSteps'
import { fixPath } from './useSignIn'

const t = i18n.getFixedT('en')
const org = { owner: 'my-team', repo: 'time-data', token: 'fineGrained' } as const

const ALL: LoginError[] = [
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

describe('parseLoginError', () => {
  it('accepts every known error and turns anything else into unknown', () => {
    for (const e of ALL) expect(parseLoginError(e)).toBe(e)
    expect(parseLoginError(null)).toBe('unknown')
    expect(parseLoginError('<script>')).toBe('unknown')
  })
})

describe('fixSteps', () => {
  it('gives every error at least one step with text', () => {
    for (const e of ALL) {
      const steps = fixSteps(t, e, org)
      expect(steps.length).toBeGreaterThan(0)
      for (const s of steps) expect(s.text).not.toBe('')
    }
  })

  it('lists invitation, repository and token for an organization repo, without approval', () => {
    const steps = fixSteps(t, 'orgRepoNotAccessible', org)
    expect(steps.map((s) => s.link?.href)).toEqual([
      'https://github.com/orgs/my-team/invitation',
      'https://github.com/my-team/time-data',
      'https://github.com/settings/personal-access-tokens',
    ])
    expect(steps[2]!.text).toContain('resource owner must be my-team')
    expect(steps.map((s) => s.text).join(' ')).not.toMatch(/approv/i)
  })

  it('asks for the repo scope instead of the resource owner for classic tokens', () => {
    const steps = fixSteps(t, 'orgRepoNotAccessible', { ...org, token: 'classic' })
    expect(steps[2]!.text).toContain('“repo” scope')
    expect(steps[2]!.link?.href).toContain('/settings/tokens/new?scopes=repo')
  })

  it('keeps only the steps that need no repository when the names are invalid', () => {
    const steps = fixSteps(t, 'repoNotFound', { token: null })
    expect(steps).toHaveLength(1)
    expect(steps[0]!.link?.href).toBe('https://github.com/settings/personal-access-tokens')
  })

  it('offers the token checklist for a rejected token', () => {
    expect(fixSteps(t, 'invalidToken', org)[0]!.tokenChecklist).toBe(true)
  })

  it('names the alternatives for another person’s repo with a fine-grained token', () => {
    const [step] = fixSteps(t, 'personalRepoNotAccessible', { ...org, owner: 'ben' })
    expect(step!.text).toMatch(/move the repository into a free GitHub organization/)
  })

  it('points a classic token to the repository invitation of another person’s repo', () => {
    const [step] = fixSteps(t, 'personalRepoNotAccessible', {
      owner: 'ben',
      repo: 'time-data',
      token: 'classic',
    })
    expect(step!.link?.href).toBe('https://github.com/ben/time-data/invitations')
  })

  it('shows the rate-limit reset time', () => {
    expect(fixSteps(t, 'rateLimit', { ...org, time: '14:05' })[0]!.text).toContain('14:05')
  })
})

describe('needsOwner', () => {
  it('asks an owner only where one can help', () => {
    const owner = ALL.filter((e) => needsOwner(e, 'fineGrained'))
    expect(owner).toEqual(['orgRepoNotAccessible', 'repoNotFound', 'noPushAccess'])
    expect(needsOwner('personalRepoNotAccessible', 'classic')).toBe(true)
  })
})

describe('fixPath', () => {
  it('puts only non-secret facts into the URL', () => {
    expect(
      fixPath(
        { repo: ' my-team/time-data ', from: 'start' },
        { ok: false, error: 'orgRepoNotAccessible' },
      ),
    ).toBe('/fix?e=orgRepoNotAccessible&repo=my-team/time-data&from=start')
    expect(
      fixPath(
        { repo: 'ben/x', from: 'join' },
        { ok: false, error: 'rateLimit', ownerType: 'User', resetAt: new Date(1000) },
      ),
    ).toBe('/fix?e=rateLimit&repo=ben/x&from=join&kind=user&at=1000')
  })

  it('encodes a malformed repository', () => {
    expect(fixPath({ repo: 'a b&c', from: 'start' }, { ok: false, error: 'badRepoFormat' })).toBe(
      '/fix?e=badRepoFormat&repo=a%20b%26c&from=start',
    )
  })
})
