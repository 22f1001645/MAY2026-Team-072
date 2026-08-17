/**
 * ORG-02 layer 3: `safeExternalHref` refuses every scheme that is not http(s).
 *
 * Layer 1 is the server's write gate (`backend/app/url_safety.py`, called from
 * the PUT path) and layer 2 is the same predicate on the read path. This is the
 * third, and it exists for one reason worth stating plainly: **React 18.3.1
 * only *warns* on a `javascript:` href — it renders the attribute anyway.**
 * React is therefore not the security boundary; this function is. Returning
 * `undefined` makes React omit `href` entirely and the chip renders as inert
 * text (04-UI-SPEC.md S5, "Three-layer safety, layer 3").
 *
 * A refusal is a negative claim, so it only holds if it is tested — the same
 * reasoning `view-not-sent.test.ts` opens with. Every scheme the helper must
 * refuse is a named row below, not a comment.
 *
 * No fetch mock, no fixture, no DOM: this file is a pure vector table and runs
 * in well under a second, which is what makes it the cheapest gate in the phase.
 */
import { describe, expect, it } from 'vitest'
import { safeExternalHref } from '../format'

/** [label, input, expected] — expected `undefined` means "React must omit href". */
const ACCEPTED: [string, string][] = [
  ['https', 'https://instagram.com/x'],
  ['http', 'http://example.org'],
  ['https with a path, query and fragment', 'https://example.org/a/b?c=1#d'],
]

const REFUSED: [string, string | null | undefined][] = [
  ['javascript:', 'javascript:alert(1)'],
  ['JavaScript: — scheme comparison is case-insensitive', 'JavaScript:alert(1)'],
  ['data:', 'data:text/html;base64,PHN2Zz4='],
  ['vbscript:', 'vbscript:msgbox(1)'],
  ['scheme-relative //host/path', '//evil.com/x'],
  ['a site-relative path', '/relative/path'],
  ['the empty string', ''],
  ['undefined', undefined],
  ['null', null],
  ['ftp:', 'ftp://example.org/x'],
  ['mailto:', 'mailto:someone@example.org'],
  ['a malformed authority', 'ht!tp://['],
]

describe('safeExternalHref accepts http and https, and returns the input unchanged', () => {
  it.each(ACCEPTED)('accepts %s', (_label, input) => {
    expect(safeExternalHref(input)).toBe(input)
  })

  it('returns the original string, not the re-serialised URL', () => {
    // `new URL('http://example.org').href` is 'http://example.org/' — the added
    // slash. The server already normalised what it stored, so re-serialising
    // client-side would display something other than what was saved.
    expect(safeExternalHref('http://example.org')).toBe('http://example.org')
  })
})

describe('safeExternalHref refuses everything else', () => {
  it.each(REFUSED)('refuses %s', (_label, input) => {
    expect(safeExternalHref(input)).toBeUndefined()
  })
})

describe('safeExternalHref never throws', () => {
  it('swallows a URL parse failure rather than propagating it', () => {
    // An href sink is rendered inside a component's render pass; an exception
    // here would blank the surrounding surface, which is a worse outcome than
    // an inert link.
    expect(() => safeExternalHref('ht!tp://[')).not.toThrow()
  })

  it.each(REFUSED)('does not throw on %s', (_label, input) => {
    expect(() => safeExternalHref(input)).not.toThrow()
  })
})

describe('the signature accepts every shape a nullable API field can arrive as', () => {
  it('compiles and runs for string, null and undefined', () => {
    // The type check is the real assertion here — this body exists so the call
    // sites are exercised rather than merely type-checked.
    const fromApi: string | null = null
    const missing: string | undefined = undefined
    expect(safeExternalHref('https://example.org')).toBe('https://example.org')
    expect(safeExternalHref(fromApi)).toBeUndefined()
    expect(safeExternalHref(missing)).toBeUndefined()
  })
})
