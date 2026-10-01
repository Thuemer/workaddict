import { afterEach, describe, expect, it, vi } from 'vitest'
import { forgetLookups, lookupAccount, lookupRepo } from './publicGitHub'

function answer(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  forgetLookups()
})

describe('lookupAccount', () => {
  it('tells users from organizations', async () => {
    vi.stubGlobal('fetch', answer(200, { type: 'Organization' }))
    expect(await lookupAccount('my-team')).toBe('org')
    vi.stubGlobal('fetch', answer(200, { type: 'User' }))
    expect(await lookupAccount('ben')).toBe('user')
  })

  it('reports a missing account', async () => {
    vi.stubGlobal('fetch', answer(404))
    expect(await lookupAccount('nobody-here')).toBe('missing')
  })

  it('gives no answer on rate limits and network errors', async () => {
    vi.stubGlobal('fetch', answer(403))
    expect(await lookupAccount('a')).toBe('unknown')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    expect(await lookupAccount('b')).toBe('unknown')
  })

  it('asks GitHub once per name and sends no credentials', async () => {
    const fetch = answer(200, { type: 'User' })
    vi.stubGlobal('fetch', fetch)
    await lookupAccount('Ben')
    await lookupAccount('ben')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/users/Ben', {
      headers: { Accept: 'application/vnd.github+json' },
      credentials: 'omit',
    })
  })
})

describe('lookupRepo', () => {
  it('finds only public repositories', async () => {
    vi.stubGlobal('fetch', answer(200, { private: false }))
    expect(await lookupRepo('ben', 'time-data')).toBe('public')
    vi.stubGlobal('fetch', answer(404))
    expect(await lookupRepo('ben', 'secret')).toBe('unknown')
  })
})
