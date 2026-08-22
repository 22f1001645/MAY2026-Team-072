/**
 * DASH-01 / D-18, verification map row 17: the Student/Organiser view never
 * leaves the client.
 *
 * The claim is a negative one, so it only holds if it is tested. It is proved
 * twice, from two directions:
 *
 *   behavioural — drive a representative call set through a stubbed `fetch`
 *                 under both stored view values and inspect every recorded
 *                 request's URL, headers and body;
 *   structural  — read `lib/api.ts` off disk and assert it contains no
 *                 reference to the storage key at all.
 *
 * The behavioural half proves the view is not sent today. The structural half
 * proves the wrapper has no way to send it, which is what stops a future
 * endpoint from quietly gaining a view parameter (T-02-08).
 *
 * Source is read via `import.meta.glob('?raw')` rather than `node:fs`: the repo
 * has no `@types/node`, and vite's raw glob is already typed by
 * `src/vite-env.d.ts`, so the structural half costs zero extra packages.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'

/** Anything that would betray the active view. Matched case-insensitively so a
 *  `X-View: Organiser` header is caught as readily as a lowercase one.
 *  Note: 'organiser' and 'student' were removed from this list because the
 *  notifications endpoint now explicitly accepts a role parameter to filter
 *  messages, which is a valid product requirement (PR 25). */
const FORBIDDEN = ['ekatva_view']

const originalFetch = globalThis.fetch
let fetchMock: ReturnType<typeof vi.fn>

/** Responses shaped exactly as far as `_rawRequest` reads them. Bodies are the
 *  minimum each adapter accepts — this file is about requests, not responses. */
const BODY_BY_PATH: [RegExp, unknown][] = [
  [/\/auth\/me$/, {}],
  [/\/me\/points$/, { total: 0, entries: [] }],
  [/\/dashboard$/, {}],
  [/\/notifications\/read$/, { ok: true }],
]

const respond = (url: string): Response => {
  const match = BODY_BY_PATH.find(([re]) => re.test(url.split('?')[0]))
  const body = match ? match[1] : []
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

/** A representative slice of the client: reads and a mutation, authenticated
 *  surfaces the organiser actually uses. Deliberately excludes login and
 *  register — their bodies carry the seeded password `student123`, which would
 *  trip the scan on a string that has nothing to do with the view. */
async function driveRepresentativeCalls() {
  await api.me()
  await api.events()
  await api.notifications()
  await api.leaderboard()
  await api.dashboard()
  await api.myPoints()
  await api.markNotificationsRead()
}

/** Every place a request could carry the view: the URL (path and query), the
 *  header names, the header values, and the body. */
function requestSurfaces(call: unknown[]): string[] {
  const url = String(call[0])
  const init = (call[1] ?? {}) as RequestInit
  const headers = (init.headers ?? {}) as Record<string, string>
  return [
    url,
    ...Object.keys(headers),
    ...Object.values(headers).map(String),
    typeof init.body === 'string' ? init.body : '',
  ]
}

beforeEach(() => {
  localStorage.clear()
  // The wrapper reads this cookie for the CSRF header on mutations, so the
  // mutation's header set is genuinely populated when it is scanned.
  document.cookie = 'csrf_refresh_token=csrf-test-value'
  fetchMock = vi.fn((input: unknown) => Promise.resolve(respond(String(input))))
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  localStorage.clear()
})

describe('D-18 behavioural: the view value never reaches the wire', () => {
  it.each(['organiser', 'student'])(
    'sends nothing that names the view with ekatva_view=%s',
    async (storedView) => {
      localStorage.setItem('ekatva_view', storedView)

      await driveRepresentativeCalls()

      // A scan over zero requests would pass vacuously.
      expect(fetchMock.mock.calls.length).toBeGreaterThan(0)

      const offenders: string[] = []
      for (const call of fetchMock.mock.calls) {
        for (const surface of requestSurfaces(call)) {
          for (const needle of FORBIDDEN) {
            if (surface.toLowerCase().includes(needle)) {
              offenders.push(`${String(call[0])} → "${surface}" contains "${needle}"`)
            }
          }
        }
      }

      expect(
        offenders,
        'The active view is a rendering concern only (D-18). A request that ' +
          'carries it is an authorization input the server may one day honour:\n' +
          offenders.join('\n'),
      ).toEqual([])
    },
  )
})

describe('D-18 structural: the API wrapper has no way to send the view', () => {
  const SOURCE = Object.values(
    import.meta.glob('../api.ts', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >,
  )[0]

  it('reads lib/api.ts off disk', () => {
    // Guards the two assertions below against a glob that silently matched
    // nothing and made them trivially true.
    expect(SOURCE).toBeTypeOf('string')
    expect(SOURCE.length).toBeGreaterThan(0)
  })

  it('never references the view storage key', () => {
    expect(
      SOURCE.includes('ekatva_view'),
      'lib/api.ts must not know the view exists. Reading it here is how a ' +
        'view parameter starts travelling to the server (T-02-08).',
    ).toBe(false)
  })
})
