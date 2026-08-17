/**
 * The client half of ROADMAP Phase 2 success criterion 2: many simultaneous
 * expiries produce exactly one refresh, one expiry signal and zero spurious
 * logouts (D-06, D-07), and the legacy token key is never written again (D-09).
 *
 * `lib/api.ts` is driven through its public exports only. `_refreshPromise` is
 * deliberately not exported — a shared promise that tests can read is a shared
 * promise anything else can read too, and the properties under test are all
 * observable from the outside: how many times `fetch` was asked for
 * `/auth/refresh`, how many times the registered expiry callback fired, and
 * whether a later call still works after a failed one.
 *
 * These four are additions beyond the twenty rows mapped in 02-VALIDATION.md,
 * so they are named descriptively rather than by a `-k` selector.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, setOnSessionExpired } from '../api'

type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>

const originalFetch = globalThis.fetch
let fetchMock: ReturnType<typeof vi.fn>

/** A response shaped exactly as far as `_rawRequest` reads it: `ok`, `status`, `text()`. */
const respond = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  }) as unknown as Response

const ok = (body: unknown) => respond(200, body)
const unauthorized = () => respond(401, { error: 'Token has expired', code: 'token_expired' })

/** One macrotask. A refresh that resolves instantly would let the first caller
 *  finish before the others even see their 401, which is not the race the
 *  single-flight guard exists for. */
const latency = () => new Promise((resolve) => setTimeout(resolve, 5))

const mockFetch = (handler: FetchHandler) => {
  fetchMock = vi.fn((input: unknown, init?: RequestInit) => handler(String(input), init))
  globalThis.fetch = fetchMock as unknown as typeof fetch
}

const isRefresh = (url: string) => url.includes('/auth/refresh')

const refreshCalls = () =>
  fetchMock.mock.calls.filter((call: unknown[]) => isRefresh(String(call[0]))).length

beforeEach(() => {
  localStorage.clear()
  // The wrapper reads this cookie for the CSRF header on every mutation, and
  // /auth/refresh is a POST.
  document.cookie = 'csrf_refresh_token=csrf-test-value'
  setOnSessionExpired(() => {})
})

afterEach(() => {
  globalThis.fetch = originalFetch
  setOnSessionExpired(() => {})
})

describe('session contract: single-flight refresh (D-06)', () => {
  it('many concurrent 401s produce exactly one refresh call', async () => {
    let refreshed = false
    mockFetch(async (url) => {
      if (isRefresh(url)) {
        await latency()
        refreshed = true
        return ok({ access_token: 'refreshed-token' })
      }
      return refreshed ? ok([]) : unauthorized()
    })

    // Started before anything is awaited — awaiting the first one would
    // serialise them, and the test would then pass against no guard at all.
    const inFlight = [
      api.notifications(),
      api.notifications(),
      api.notifications(),
      api.notifications(),
      api.notifications(),
    ]
    const results = await Promise.all(inFlight)

    expect(results).toHaveLength(5)
    expect(refreshCalls()).toBe(1)
  })

  it('a failed refresh rejects every queued caller and fires the expiry callback once', async () => {
    const onExpired = vi.fn()
    setOnSessionExpired(onExpired)

    mockFetch(async (url) => {
      if (isRefresh(url)) await latency()
      return unauthorized()
    })

    const results = await Promise.allSettled([
      api.notifications(),
      api.notifications(),
      api.notifications(),
      api.notifications(),
      api.notifications(),
    ])

    expect(results.map((r) => r.status)).toEqual(Array(5).fill('rejected'))
    expect(onExpired).toHaveBeenCalledTimes(1)
  })

  it('a failed refresh does not leave a poisoned promise', async () => {
    mockFetch(async (url) => {
      if (isRefresh(url)) await latency()
      return unauthorized()
    })
    await expect(api.notifications()).rejects.toBeInstanceOf(ApiError)

    // A second expiry cycle, this time with a refresh that works. If the shared
    // promise were cached in its rejected state rather than cleared in a
    // `finally`, this caller would inherit the old failure and never retry.
    let refreshed = false
    mockFetch(async (url) => {
      if (isRefresh(url)) {
        await latency()
        refreshed = true
        return ok({ access_token: 'refreshed-token' })
      }
      return refreshed ? ok([]) : unauthorized()
    })

    await expect(api.notifications()).resolves.toEqual([])
    expect(refreshCalls()).toBe(1)
  })
})

describe('session contract: token storage (D-09)', () => {
  it('the legacy ekatva_token key is never written', async () => {
    mockFetch(async (url) => {
      if (url.includes('/auth/login')) return ok({ access_token: 'login-token', user: {} })
      if (isRefresh(url)) return ok({ access_token: 'refreshed-token' })
      return ok(null)
    })

    await api.login('arav@ds.study.iitm.ac.in', 'student123')
    await api.refresh()

    expect(localStorage.getItem('ekatva_token')).toBeNull()
    // Nothing at all reached localStorage — access tokens live in memory only.
    expect(localStorage.length).toBe(0)
  })
})
