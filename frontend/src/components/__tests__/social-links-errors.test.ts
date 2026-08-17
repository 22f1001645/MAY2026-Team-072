import { describe, expect, it } from 'vitest'
import { resolveRejection } from '../SocialLinksEditor'

/* Where a rejection lands is the whole contract of the links editor: a
 * rejection that misses its row makes the user hunt through seven fields, and
 * one that is placed by string-matching the server's sentence breaks the first
 * time that sentence is reworded. Both failures are invisible in review, so
 * they are pinned here.
 *
 * The 422 cases are the reason `sentOrder` exists: blank rows are omitted from
 * the replace-all payload, so marshmallow's row index is an index into what was
 * sent, never into the six displayed rows. */

describe('resolveRejection', () => {
  it('places a 400 on the platform named in details', () => {
    const placed = resolveRejection(
      {
        code: 'social_url_scheme',
        message: 'Links must start with http:// or https://.',
        details: { platform: 'instagram' },
      },
      [],
    )
    expect(placed?.target).toBe('instagram')
    expect(placed?.heading).toBe('That link needs to start with http:// or https://')
    expect(placed?.body).toBe('Links must start with http:// or https://.')
  })

  it('names the platform in the host heading, using the locked display label', () => {
    expect(
      resolveRejection({ code: 'social_url_host', details: { platform: 'github' } }, [])?.heading,
    ).toBe("That doesn't look like a GitHub address")
    expect(
      resolveRejection({ code: 'social_url_host', details: { platform: 'x' } }, [])?.heading,
    ).toBe("That doesn't look like a X address")
  })

  it('places a 400 on the website field when details names the field', () => {
    const placed = resolveRejection(
      { code: 'social_url_host', message: 'That address is not allowed.', details: { field: 'website' } },
      [],
    )
    expect(placed?.target).toBe('website')
  })

  it('maps a 422 row index through the payload order, not the display order', () => {
    // Only YouTube was filled in, so it is index 0 of the payload even though
    // it is the fourth displayed row.
    const placed = resolveRejection(
      {
        code: 'validation_error',
        message: 'Validation failed',
        details: { links: { 0: { url: ['Longer than maximum length 300.'] } } },
      },
      ['youtube'],
    )
    expect(placed?.target).toBe('youtube')
    expect(placed?.heading).toBe('Check this link')
    expect(placed?.body).toBe('Longer than maximum length 300.')
  })

  it('walks a 422 on the website field down to the sentence', () => {
    const placed = resolveRejection(
      {
        code: 'validation_error',
        details: { website: ['Longer than maximum length 300.'] },
      },
      [],
    )
    expect(placed?.target).toBe('website')
    expect(placed?.body).toBe('Longer than maximum length 300.')
  })

  it('falls back to section level rather than to a raw object when no row resolves', () => {
    const placed = resolveRejection(
      { code: 'validation_error', message: 'Validation failed', details: { _schema: ['Invalid input type.'] } },
      [],
    )
    expect(placed?.target).toBeNull()
    expect(placed?.body).toBe('Validation failed')
  })

  it('places a duplicate on its row and keeps the server sentence verbatim', () => {
    const placed = resolveRejection(
      {
        code: 'duplicate_platform',
        message: 'Only one link per platform.',
        details: { platform: 'linkedin' },
      },
      [],
    )
    expect(placed).toEqual({
      target: 'linkedin',
      heading: 'One link per platform',
      body: 'Only one link per platform.',
    })
  })

  it('renders an unknown code at section level with the generic heading', () => {
    const placed = resolveRejection({ code: 'internal_error', message: 'Internal server error' }, [])
    expect(placed?.target).toBeNull()
    expect(placed?.heading).toBe('Check this link')
  })

  it('is null when there is no error', () => {
    expect(resolveRejection(null, [])).toBeNull()
  })
})
