import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { RegistrationLinkCard } from '../RegistrationLinkCard'
import { ToastProvider } from '../ui'

/* RegistrationLinkCard — CAMPAIGN-04 / UI-SPEC §2.6 (E6).
 *
 * The whole value of this card is a link an organiser pastes into a WhatsApp
 * group, and the two ways that goes wrong are both invisible on screen:
 *
 *  1. The URL is truncated by CSS. Copying what is rendered, or rebuilding it
 *     from window.location.origin, produces a link that looks right in the card
 *     and resolves to nothing once pasted. So the clipboard assertion below uses
 *     a URL far longer than the truncation width and compares against the prop.
 *  2. The no-slug state has to offer a way out. A card that renders an empty
 *     URL and a Copy button copies an empty string, silently.
 *
 * `navigator.clipboard` does not exist in jsdom, so the spy here proves the
 * argument and nothing more — that the copied text reaches a real system
 * clipboard is checked by hand (05-VALIDATION.md, Manual-Only Verifications).
 */

const LONG_URL =
  'http://localhost:5173/events/machine-learning-study-group-hyderabad-winter-edition-a3f9b2'

function renderCard(props: Partial<React.ComponentProps<typeof RegistrationLinkCard>> = {}) {
  const onGenerate = props.onGenerate ?? vi.fn().mockResolvedValue({})
  const utils = render(
    <ToastProvider>
      <RegistrationLinkCard
        registrationUrl={LONG_URL}
        onGenerate={onGenerate}
        generating={false}
        {...props}
      />
    </ToastProvider>,
  )
  return { ...utils, onGenerate }
}

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
    writable: true,
  })
  return writeText
}

describe('RegistrationLinkCard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('offers Generate Link and an em dash when there is no slug yet', () => {
    renderCard({ registrationUrl: null })
    expect(screen.getByRole('button', { name: 'Generate Link' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Copy registration link')).not.toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('disables the button and says Generating… while the slug is being minted', () => {
    renderCard({ registrationUrl: null, generating: true })
    const button = screen.getByRole('button', { name: /Generating/ })
    expect(button).toBeDisabled()
    expect(screen.getByText('Generating…')).toBeInTheDocument()
  })

  it('raises an error toast when generation rejects', async () => {
    const user = userEvent.setup()
    const onGenerate = vi.fn().mockRejectedValue(new Error('nope'))
    renderCard({ registrationUrl: null, onGenerate })

    await user.click(screen.getByRole('button', { name: 'Generate Link' }))

    await waitFor(() =>
      expect(screen.getByText('Failed to generate link. Try again.')).toBeInTheDocument(),
    )
  })

  it('shows the URL and an active Copy button once a slug exists', () => {
    renderCard()
    expect(screen.getByText(LONG_URL)).toBeInTheDocument()
    expect(screen.getByLabelText('Copy registration link')).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Generate Link' })).not.toBeInTheDocument()
  })

  it('copies the complete prop URL, not the truncated rendered text', async () => {
    const user = userEvent.setup()
    const writeText = stubClipboard()
    renderCard()

    await user.click(screen.getByLabelText('Copy registration link'))

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
    expect(writeText).toHaveBeenCalledWith(LONG_URL)
    // The rendered node is clipped by CSS, so its text can never be the source
    expect(screen.getByText(LONG_URL)).toHaveClass('truncate')
    expect(await screen.findByText('Link copied!')).toBeInTheDocument()
  })

  /* Source-level: the component may not rebuild the URL it was handed. A
   * client-assembled link is right on localhost and wrong everywhere else, and
   * the failure only shows up after the link has already been shared (D-12). */
  it('never assembles the URL from the browser origin', async () => {
    const sources = import.meta.glob('../RegistrationLinkCard.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const source = Object.values(sources)[0]
    expect(source).toBeTruthy()
    expect(source).not.toContain('window.location.origin')
    expect(source).toContain('navigator.clipboard.writeText')
  })
})
