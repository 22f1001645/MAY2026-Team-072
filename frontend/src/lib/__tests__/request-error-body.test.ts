/**
 * 04-UI-SPEC.md S3, contract addition 4: the request helper must not throw on a
 * non-JSON error body.
 *
 * The concrete case is this phase's single most predictable rejection. Flask
 * raises 413 from `MAX_CONTENT_LENGTH` *before* the request body is buffered
 * and answers with an HTML error page, not the `{ error, code }` envelope.
 * Parsing that unguarded throws a raw `SyntaxError`, which is not an `ApiError`
 * — so the helper's own 401-refresh branch never sees it, `err.status` is
 * `undefined` at every call site, and the logo card renders its generic
 * fallback with a parser error underneath instead of "the limit is 2 MB".
 *
 * The second case here is the multipart header: an explicit `undefined` in an
 * object literal does not remove a key, so a hardcoded
 * `'Content-Type': 'application/json'` would ride along on a FormData upload
 * and the browser would never get to set its own boundary. Both are properties
 * of the shared helper, which is why they are asserted against `fetch` rather
 * than against any one endpoint.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api } from '../api'

const originalFetch = globalThis.fetch
let fetchMock: ReturnType<typeof vi.fn>

/** Exactly as much of a Response as `_rawRequest` reads. */
const respondWith = (init: { ok: boolean; status: number; text: string }) =>
  ({
    ok: init.ok,
    status: init.status,
    text: async () => init.text,
  }) as unknown as Response

beforeEach(() => {
  document.cookie = 'csrf_refresh_token=csrf-test-value'
  fetchMock = vi.fn()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('a non-JSON error body becomes a readable ApiError, never a SyntaxError', () => {
  it('turns a 413 with an HTML body into an ApiError carrying the status', async () => {
    fetchMock.mockResolvedValue(
      respondWith({
        ok: false,
        status: 413,
        // Werkzeug's actual 413 page shape, trimmed.
        text: '<!doctype html>\n<html lang=en>\n<title>413 Request Entity Too Large</title>\n',
      }),
    )

    const err = await api.orgProfile('org-1').then(
      () => null,
      (e: unknown) => e,
    )

    expect(err, 'a SyntaxError here means the parse is still unguarded').toBeInstanceOf(ApiError)
    expect((err as ApiError).name).not.toBe('SyntaxError')
    expect((err as ApiError).status).toBe(413)
    // No envelope to read a message from, so the status line is the message —
    // legible, and enough for the caller to branch on `status`.
    expect((err as ApiError).message).toContain('413')
  })

  it('still reads the envelope when the error body is JSON', async () => {
    fetchMock.mockResolvedValue(
      respondWith({
        ok: false,
        status: 400,
        text: JSON.stringify({
          error: 'That link needs an http:// or https:// address.',
          code: 'social_url_scheme',
          details: { platform: 'instagram' },
        }),
      }),
    )

    const err = (await api
      .replaceSocialLinks('org-1', { links: [{ platform: 'instagram', url: 'javascript:1' }] })
      .catch((e: unknown) => e)) as ApiError

    expect(err).toBeInstanceOf(ApiError)
    expect(err.code).toBe('social_url_scheme')
    expect(err.details).toEqual({ platform: 'instagram' })
  })

  it('still resolves an empty body to null rather than throwing', async () => {
    // The pre-existing behaviour, asserted so the new try/catch is not mistaken
    // for a change to it. An endpoint with no adapter, because the claim is
    // about the shared helper — the adapters take the payload their endpoint
    // contractually always sends.
    fetchMock.mockResolvedValue(respondWith({ ok: true, status: 204, text: '' }))
    await expect(api.markNotificationsRead()).resolves.toBeNull()
  })
})

describe('a FormData body is sent without a JSON content type', () => {
  it('omits Content-Type so the browser sets the multipart boundary', async () => {
    fetchMock.mockResolvedValue(
      respondWith({ ok: true, status: 200, text: JSON.stringify({ id: 'org-1' }) }),
    )

    await api.uploadOrgLogo('org-1', new File(['x'], 'logo.png', { type: 'image/png' }))

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(
      'Content-Type' in headers,
      'A hardcoded application/json here means the server parses the multipart ' +
        'body with the wrong boundary and the upload fails for a reason nothing reports.',
    ).toBe(false)
    expect((fetchMock.mock.calls[0][1] as RequestInit).body).toBeInstanceOf(FormData)
  })

  it('keeps the JSON content type on an ordinary mutation', async () => {
    fetchMock.mockResolvedValue(
      respondWith({ ok: true, status: 200, text: JSON.stringify({ id: 'org-1' }) }),
    )

    await api.updateOrgProfile('org-1', { bio: 'hello' })

    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })
})
