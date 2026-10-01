/**
 * Advisory lookups on GitHub's public API during setup, before the user has a token. They send no
 * credentials, are limited to 60 requests per hour per IP, and every failure resolves to
 * `unknown`, which the wizard treats as "no advice".
 */

const API = 'https://api.github.com'
const seg = encodeURIComponent

export type AccountKind = 'user' | 'org' | 'missing' | 'unknown'
/** A private repository and a missing one both answer 404, so only public ones can be found. */
export type RepoKind = 'public' | 'unknown'

const cache = new Map<string, Promise<unknown>>()

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined
  if (!p) {
    p = load()
    cache.set(key, p)
  }
  return p
}

async function get(path: string): Promise<Response | null> {
  try {
    return await fetch(`${API}${path}`, {
      headers: { Accept: 'application/vnd.github+json' },
      credentials: 'omit',
    })
  } catch {
    return null
  }
}

/** Whether a GitHub login is a user, an organization, or doesn't exist. */
export function lookupAccount(name: string): Promise<AccountKind> {
  return cached(`account:${name.toLowerCase()}`, async () => {
    const res = await get(`/users/${seg(name)}`)
    if (!res) return 'unknown'
    if (res.status === 404) return 'missing'
    if (!res.ok) return 'unknown'
    try {
      const body = (await res.json()) as { type?: unknown }
      return body.type === 'Organization' ? 'org' : body.type === 'User' ? 'user' : 'unknown'
    } catch {
      return 'unknown'
    }
  })
}

/** Whether a public repository with this name already exists. */
export function lookupRepo(owner: string, repo: string): Promise<RepoKind> {
  return cached(`repo:${owner.toLowerCase()}/${repo.toLowerCase()}`, async () => {
    const res = await get(`/repos/${seg(owner)}/${seg(repo)}`)
    return res?.ok ? 'public' : 'unknown'
  })
}

/** Forgets earlier answers, e.g. after the user created the organization on GitHub. */
export function forgetLookups(prefix = '') {
  for (const key of [...cache.keys()]) if (key.startsWith(prefix)) cache.delete(key)
}
