import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { PushLiveGate } from '../PushLiveGate'
import { ToastProvider } from '../ui'
import { ApiError } from '../../lib/api'

/* PushLiveGate — CAMPAIGN-06 / UI-SPEC §2.7 (E7), D-06 and D-07.
 *
 * Publishing is the one irreversible action in the campaign builder: once
 * students can see the event, nothing here takes it back. So this spec pins
 * three separate things.
 *
 *  1. The gate is visible to everyone and operable by one person. D-07 chose a
 *     visible-but-blocked button over a hidden one so the rule is legible, and
 *     that only works if the block is `aria-disabled` — a `disabled` button
 *     leaves the tab order and takes its tooltip with it, which puts a keyboard
 *     user back exactly where the hidden button left them (T-05-42).
 *  2. The client-side refusal is asserted here, and the server's is asserted in
 *     backend/tests (AC-25). Two layers, two tests: this component is not the
 *     enforcement and a test that treated it as such would be testing a lie
 *     (T-05-38).
 *  3. Confirm is required before the mutation fires (T-05-40), and the 403 path
 *     leaves the control usable rather than stranded.
 */

const PUSHED_AT = '2026-08-16T09:30:00+00:00'
const TOOLTIP = 'Only the Meetup Head can publish'

function renderGate(props: Partial<React.ComponentProps<typeof PushLiveGate>> = {}) {
  const onPushLive = props.onPushLive ?? vi.fn().mockResolvedValue({})
  const utils = render(
    <ToastProvider>
      <PushLiveGate
        status="draft"
        isMeetupHead
        pushedLiveAt={null}
        publishing={false}
        {...props}
        onPushLive={onPushLive}
      />
    </ToastProvider>,
  )
  return { ...utils, onPushLive }
}

describe('PushLiveGate', () => {
  it('shows a visible but inert button with a tooltip for anyone but the Meetup Head', async () => {
    const user = userEvent.setup()
    const { onPushLive } = renderGate({ isMeetupHead: false })

    const button = screen.getByRole('button', { name: 'Push Live' })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button.closest('[title]')).toHaveAttribute('title', TOOLTIP)
    expect(screen.getByText('This action requires the assigned Meetup Head.')).toBeInTheDocument()

    await user.click(button)

    expect(onPushLive).not.toHaveBeenCalled()
    expect(screen.queryByText('Publish Campaign?')).not.toBeInTheDocument()
  })

  it('asks the Meetup Head to confirm before anything is published', async () => {
    const user = userEvent.setup()
    const { onPushLive } = renderGate()

    await user.click(screen.getByRole('button', { name: 'Push Live' }))

    expect(screen.getByText('Publish Campaign?')).toBeInTheDocument()
    expect(
      screen.getByText('This will make the event visible to students. The Kanban workspace will activate.'),
    ).toBeInTheDocument()
    expect(onPushLive).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(onPushLive).toHaveBeenCalledTimes(1)
  })

  it('publishes nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const { onPushLive } = renderGate()

    await user.click(screen.getByRole('button', { name: 'Push Live' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText('Publish Campaign?')).not.toBeInTheDocument()
    expect(onPushLive).not.toHaveBeenCalled()
  })

  it('disables the confirm control and says Publishing… while the request is in flight', async () => {
    const user = userEvent.setup()
    const { rerender, onPushLive } = renderGate()

    await user.click(screen.getByRole('button', { name: 'Push Live' }))
    rerender(
      <ToastProvider>
        <PushLiveGate
          status="draft"
          isMeetupHead
          pushedLiveAt={null}
          publishing
          onPushLive={onPushLive}
        />
      </ToastProvider>,
    )

    const confirm = screen.getByRole('button', { name: /Publishing/ })
    expect(confirm).toBeDisabled()
    expect(screen.getByText('Publishing…')).toBeInTheDocument()
  })

  it('reports a 403 and leaves the button operable', async () => {
    const user = userEvent.setup()
    const onPushLive = vi
      .fn()
      .mockRejectedValue(new ApiError('Forbidden', 'not_meetup_head', 403))
    renderGate({ onPushLive })

    await user.click(screen.getByRole('button', { name: 'Push Live' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(screen.getByText(TOOLTIP)).toBeInTheDocument())
    const button = screen.getByRole('button', { name: 'Push Live' })
    expect(button).not.toHaveAttribute('aria-disabled', 'true')
    expect(button).toBeEnabled()
  })

  it('replaces the gate with a success badge once the campaign is live', () => {
    renderGate({ status: 'live', pushedLiveAt: PUSHED_AT })

    expect(screen.getByText('Campaign Live ✓')).toBeInTheDocument()
    expect(screen.getByText(/Pushed live on/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Push Live' })).not.toBeInTheDocument()
  })

  /* Source-level: the enabled state may only come from the server flag.
   * `manageableActivityIds` answers "may this person manage the activity",
   * which is true for every crew member — deriving the gate from it would show
   * an enabled button to exactly the people the server is about to refuse
   * (T-05-16). */
  it('reads its permission from the server flag alone', async () => {
    const sources = import.meta.glob('../PushLiveGate.tsx', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const source = Object.values(sources)[0]

    expect(source).toBeTruthy()
    expect(source).not.toContain('manageableActivityIds')
    expect(source).toContain('isMeetupHead')
  })
})
