import type { LoginCheck } from '../../storage'

/** Where a sign-in form sits: start page, last step of the setup wizard, or the join flow. */
export type SignInFrom = 'start' | 'setup' | 'join'

export type LoginFailure = Extract<LoginCheck, { ok: false }>

export interface SignInAttempt {
  token: string
  repo: string
  remember: boolean
  from: SignInFrom
  failure: LoginFailure
}

/**
 * The last failed sign-in, so the fix page can try again and the form can be refilled without
 * retyping the token. Kept in memory only: never in the URL or browser storage, gone on reload.
 */
let current: SignInAttempt | null = null

export const signInAttempt = {
  get: (): SignInAttempt | null => current,
  set(attempt: SignInAttempt) {
    current = attempt
  },
  clear() {
    current = null
  },
}
