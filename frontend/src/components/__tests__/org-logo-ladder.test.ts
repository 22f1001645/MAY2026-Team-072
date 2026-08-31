import { describe, expect, it } from 'vitest'
import { initialsOf, resolveRung } from '../OrgLogo'

/* The fallback ladder's order is the contract (04-UI-SPEC.md S3), and the
 * monogram is the rung every organisation is guaranteed to reach. Both are
 * pure, so they are worth pinning: a reordering here is invisible in a diff
 * review and shows up as the wrong logo on twelve seeded Houses. */

const house = (over: Partial<Parameters<typeof resolveRung>[0]> = {}) => ({
  name: 'Nilgiri House',
  type: 'house',
  logoUrl: null,
  ...over,
})

describe('the logo fallback ladder', () => {
  it('puts an uploaded logo above the seeded house mark', () => {
    expect(resolveRung(house({ logoUrl: 'https://api.test/uploads/a.png' }))).toBe(1)
  })

  it('falls to the seeded house image when nothing is uploaded', () => {
    expect(resolveRung(house())).toBe(2)
  })

  it('reaches the emoji glyph only once the image rung is exhausted', () => {
    expect(resolveRung(house(), 3)).toBe(3)
  })

  it('gives a non-house organisation the monogram, whatever its name', () => {
    // HOUSE_META is keyed by house name; type gates eligibility so a society
    // that happened to share a name could never borrow a House's mark.
    expect(resolveRung({ name: 'Nilgiri House', type: 'society', logoUrl: null })).toBe(4)
    expect(resolveRung({ name: 'Rhythm Dance Society', type: 'society', logoUrl: null })).toBe(4)
  })

  it('gives a known society the emoji-glyph rung (rung 3) once the image rung is exhausted', () => {
    // SOCIETY_META covers seeded societies; type gates eligibility as above.
    expect(resolveRung({ name: 'AKORD Music Society', type: 'society', logoUrl: null }, 3)).toBe(3)
    expect(resolveRung({ name: 'CodeCrafters Coding Society', type: 'society', logoUrl: null }, 3)).toBe(3)
  })

  it('gives a society with an imageLogo the image rung (rung 2)', () => {
    // AVASYA Society and AWS Cloud Club have real PNG logos — they reach rung 2.
    expect(resolveRung({ name: 'AVASYA Society', type: 'society', logoUrl: null })).toBe(2)
    expect(resolveRung({ name: 'AWS Cloud Club', type: 'society', logoUrl: null })).toBe(2)
  })

  it('puts an uploaded logo above the society imageLogo and emoji glyph', () => {
    expect(resolveRung({ name: 'AVASYA Society', type: 'society', logoUrl: 'https://api.test/logo.png' })).toBe(1)
    expect(resolveRung({ name: 'AKORD Music Society', type: 'society', logoUrl: 'https://api.test/logo.png' })).toBe(1)
  })

  it('reaches a rung for every organisation — there is no fifth state', () => {
    expect(resolveRung({ name: '', type: 'council', logoUrl: null })).toBe(4)
  })
})

describe('the monogram', () => {
  it('takes at most two characters', () => {
    expect(initialsOf('Student Executive Council')).toBe('SE')
  })

  it('yields one character for a single-word name', () => {
    expect(initialsOf('Rhythm')).toBe('R')
  })

  it('skips punctuation rather than rendering it as an initial', () => {
    // The regression: splitting on whitespace made this "H(".
    expect(initialsOf('Hyderabad (AP & Telangana)')).toBe('HA')
  })

  it('is empty rather than broken when there is nothing to initialise', () => {
    expect(initialsOf('   ')).toBe('')
  })
})
