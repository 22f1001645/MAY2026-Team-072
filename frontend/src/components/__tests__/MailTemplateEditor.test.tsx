/**
 * MailTemplateEditor — CAMPAIGN-01 / UI-SPEC E5.
 *
 * Three of these are about states an organiser cannot distinguish by eye unless
 * the component says so out loud:
 *
 *  1. The degraded banner. The server assembles a usable body whether or not the
 *     model answered, so a fallback draft and a model-written draft look alike on
 *     screen. Without the banner the organiser ships the fallback believing it is
 *     the good one — which is the failure `degraded` exists to prevent.
 *  2. The partial response. Subject and body fall back INDEPENDENTLY; a response
 *     carrying only one of them must leave the other alone. A single
 *     "has content" flag would blank the populated half, and nothing on screen
 *     would explain where the text went.
 *  3. The revert on a rejected save. An edit left on screen after a failed save
 *     is an edit the organiser believes they have.
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {
  MailTemplateEditor,
  MAIL_BODY_PLACEHOLDER,
  MAIL_DEGRADED_NOTICE,
} from '../MailTemplateEditor'
import { ToastProvider } from '../ui'

function renderEditor(props: Partial<React.ComponentProps<typeof MailTemplateEditor>> = {}) {
  const onGenerate = props.onGenerate ?? vi.fn().mockResolvedValue({})
  const onSave = props.onSave ?? vi.fn().mockResolvedValue({})
  const utils = render(
    <ToastProvider>
      <MailTemplateEditor
        mailSubject={null}
        mailBody={null}
        degraded={false}
        generating={false}
        {...props}
        onGenerate={onGenerate}
        onSave={onSave}
      />
    </ToastProvider>,
  )
  return { ...utils, onGenerate, onSave }
}

const body = () => screen.getByPlaceholderText(MAIL_BODY_PLACEHOLDER) as HTMLTextAreaElement
const subject = () => screen.getByLabelText('Subject') as HTMLInputElement

describe('MailTemplateEditor', () => {
  it('offers a primary generate action and an empty-state placeholder before the first draft', () => {
    renderEditor()

    expect(body()).toHaveValue('')
    expect(body().placeholder).toBe(MAIL_BODY_PLACEHOLDER)
    const action = screen.getByRole('button', { name: /generate mail template/i })
    // Primary, not ghost — this is the one thing to do on an empty section.
    expect(action.className).toContain('bg-teal')
  })

  it('becomes a ghost Regenerate once a body exists', () => {
    renderEditor({ mailBody: 'Come along on Saturday.' })

    const action = screen.getByRole('button', { name: 'Regenerate' })
    expect(action.className).not.toContain('bg-teal')
    expect(screen.queryByRole('button', { name: /generate mail template/i })).toBeNull()
  })

  it('disables the body and announces itself while generating', () => {
    renderEditor({ generating: true })

    expect(body()).toBeDisabled()
    expect(screen.getByText('Generating…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })

  it('shows the degraded banner above a pre-populated fallback body', () => {
    renderEditor({ degraded: true, mailBody: 'A base template you can edit.' })

    expect(screen.getByText(MAIL_DEGRADED_NOTICE)).toBeInTheDocument()
    expect(body()).toHaveValue('A base template you can edit.')
  })

  it('keeps the banner off when the model answered', () => {
    renderEditor({ degraded: false, mailBody: 'A model-written invitation.' })
    expect(screen.queryByText(MAIL_DEGRADED_NOTICE)).toBeNull()
  })

  it('never blanks the populated half of a partial response', () => {
    // Subject came back, body did not. E5's `partial` row.
    renderEditor({ mailSubject: "You're invited: Chai & Compilers", mailBody: null })

    expect(subject()).toHaveValue("You're invited: Chai & Compilers")
    expect(body()).toHaveValue('')
    expect(body().placeholder).toBe(MAIL_BODY_PLACEHOLDER)
  })

  it('saves the edited body once on blur, carrying only that field', async () => {
    const { onSave } = renderEditor({ mailBody: 'Original body.' })

    await userEvent.clear(body())
    await userEvent.type(body(), 'Edited body.')
    await userEvent.tab()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(onSave).toHaveBeenCalledWith({ mailBody: 'Edited body.' })
  })

  it('reverts and reports a rejected save', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('nope'))
    renderEditor({ mailBody: 'Original body.', onSave })

    await userEvent.clear(body())
    await userEvent.type(body(), 'Edited body.')
    await userEvent.tab()

    expect(await screen.findByText('Failed to save')).toBeInTheDocument()
    await waitFor(() => expect(body()).toHaveValue('Original body.'))
  })

  it('announces a successful generation', async () => {
    const { onGenerate } = renderEditor()

    await userEvent.click(screen.getByRole('button', { name: /generate mail template/i }))

    await waitFor(() => expect(onGenerate).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Mail template generated')).toBeInTheDocument()
  })

  it('gives the body room to grow and never caps it', () => {
    renderEditor({ mailBody: 'x' })
    // Tailwind 3.4 has no content-based field sizing, so the growth affordance
    // is a minimum height plus the native resize handle, with no max-height.
    expect(body().className).toContain('min-h-[240px]')
    expect(body().className).toContain('resize-y')
    expect(body().className).not.toContain('max-h-')
  })
})
