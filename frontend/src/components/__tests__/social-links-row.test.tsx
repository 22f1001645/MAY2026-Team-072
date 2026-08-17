import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SocialLinksRow } from '../SocialLinksRow'

/* The read view of an organisation's links — ORG-02, 04-UI-SPEC.md S5.
 *
 * Three claims are pinned here because each fails silently in review:
 *
 *  1. The absence rule. The component renders exactly what it is handed and has
 *     no prop through which a withheld link could arrive, so "a refused link is
 *     simply not there" is a property of the component's shape rather than of a
 *     branch someone could later add an `else` to.
 *  2. Layer 3. React 18.3.1 only *warns* on a `javascript:` href and renders the
 *     attribute anyway, so `safeExternalHref` returning `undefined` — and React
 *     therefore omitting the attribute — is the actual control. A regression
 *     here reopens a stored-XSS sink and changes nothing visible.
 *  3. `rel="noopener noreferrer"` and the locked display labels. Both are
 *     one-word edits away from being wrong and neither shows up in a screenshot.
 */

const chips = () => screen.getAllByRole('link')

describe('SocialLinksRow', () => {
  it('renders one chip per vouched link plus the website, and nothing else', () => {
    render(
      <SocialLinksRow
        links={[
          { platform: 'instagram', url: 'https://instagram.com/ekatva' },
          { platform: 'github', url: 'https://github.com/ekatva' },
        ]}
        website="https://ekatva.example.org/about"
      />,
    )
    expect(chips()).toHaveLength(3)
  })

  it('labels a platform from the locked map, never by capitalising the key', () => {
    render(<SocialLinksRow links={[{ platform: 'github', url: 'https://github.com/e' }]} website={null} />)
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  it('labels the website chip with its hostname, not the raw URL', () => {
    render(<SocialLinksRow links={[]} website="https://ekatva.example.org/about/us" />)
    expect(screen.getByText('ekatva.example.org')).toBeInTheDocument()
    expect(screen.queryByText('https://ekatva.example.org/about/us')).not.toBeInTheDocument()
  })

  it('carries target and both rel tokens on every chip', () => {
    render(
      <SocialLinksRow
        links={[{ platform: 'x', url: 'https://x.com/ekatva' }]}
        website="https://ekatva.example.org"
      />,
    )
    for (const chip of chips()) {
      expect(chip).toHaveAttribute('target', '_blank')
      expect(chip).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('omits the href entirely for a value that is not http or https (layer 3)', () => {
    render(
      // Only reachable if the server's write gate and read filter both failed.
      // The chip still renders — as inert text, with no navigable href.
      <SocialLinksRow
        links={[{ platform: 'instagram', url: 'javascript:alert(1)' }]}
        website={null}
      />,
    )
    const [chip] = screen.getAllByText('Instagram')
    expect(chip.closest('a')).not.toHaveAttribute('href')
  })

  it('renders nothing at all when there is nothing the server vouches for', () => {
    render(<SocialLinksRow links={[]} website={null} />)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
