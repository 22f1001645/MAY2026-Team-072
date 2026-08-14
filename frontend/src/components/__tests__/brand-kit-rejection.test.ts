import { describe, expect, it } from 'vitest'
import { resolveKitRejection } from '../BrandKitEditor'

/* The one piece of logic in the brand kit editor that can silently do the wrong
 * thing: blank rows are dropped from the payload, so a 422 keyed by *payload*
 * index lands on the wrong row unless it is mapped back to the display index. */

describe('resolveKitRejection', () => {
  it('maps a palette error back to the row the user typed into', () => {
    // Display rows 0 and 2 were sent; row 1 was blank and dropped. The server's
    // complaint about payload index 1 belongs to display row 2.
    const placed = resolveKitRejection(
      {
        code: 'validation_error',
        message: 'Validation failed.',
        details: { palette: { '1': ['Use a six-digit hex colour like #5ce6c9.'] } },
      },
      { palette: [0, 2], phrases: [] },
    )
    expect(placed).toEqual({
      field: 'palette',
      index: 2,
      heading: 'Colours must be six-digit hex, like #5ce6c9',
      body: 'Use a six-digit hex colour like #5ce6c9.',
    })
  })

  it('places a phrase error on its display row', () => {
    const placed = resolveKitRejection(
      {
        code: 'validation_error',
        message: 'Validation failed.',
        details: { sample_phrases: { '0': ['Longer than maximum length 200.'] } },
      },
      { palette: [], phrases: [3] },
    )
    expect(placed?.field).toBe('phrases')
    expect(placed?.index).toBe(3)
    expect(placed?.body).toBe('Longer than maximum length 200.')
  })

  it('falls back to field level when the list itself was rejected', () => {
    const placed = resolveKitRejection(
      {
        code: 'validation_error',
        message: 'Validation failed.',
        details: { palette: ['Longer than maximum length 6.'] },
      },
      { palette: [0], phrases: [] },
    )
    expect(placed?.field).toBe('palette')
    expect(placed?.index).toBeNull()
  })

  it('falls back to section level for anything it cannot place', () => {
    const placed = resolveKitRejection(
      { code: 'error', message: 'Something went wrong.' },
      { palette: [], phrases: [] },
    )
    expect(placed).toEqual({
      field: null,
      index: null,
      heading: 'Could not save your changes',
      body: 'Something went wrong.',
    })
  })

  it('is null when there is no error', () => {
    expect(resolveKitRejection(null, { palette: [], phrases: [] })).toBeNull()
  })
})
