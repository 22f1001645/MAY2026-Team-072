import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FormFieldRow } from '../FormFieldRow'
import { ToastProvider } from '../ui'
import { ApiError } from '../../lib/api'
import type { ApiFormField } from '../../lib/types'

/* FormFieldRow — CAMPAIGN-05 / UI-SPEC §3 (Registration section).
 *
 * Like ScheduleRow this row has no Save button, so nothing here is visible in a
 * screenshot:
 *
 *  1. The options editor appears for a dropdown field and not for a text one.
 *     Showing it always would invite options nobody will ever see.
 *  2. A blur saves ONE key. A full-row replace would let a stale draft undo a
 *     concurrent change (the T-05-30 shape).
 *  3. A duplicate label is the one rejection an organiser can act on, so it is
 *     shown inline against the offending input rather than as a generic toast
 *     that does not say which field collided.
 *  4. The remove control names the field it removes — "Remove field" five times
 *     over is an unusable screen-reader list.
 */

const field: ApiFormField = {
  id: 'ff-1',
  activityId: 'act-1',
  label: 'T-shirt size',
  fieldType: 'text',
  options: [],
  required: false,
  position: 0,
}

function renderRow(props: Partial<React.ComponentProps<typeof FormFieldRow>> = {}) {
  const onUpdate = props.onUpdate ?? vi.fn().mockResolvedValue({})
  const utils = render(
    <ToastProvider>
      <FormFieldRow
        field={field}
        fieldTypes={['text', 'dropdown']}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        {...props}
      />
    </ToastProvider>,
  )
  return { ...utils, onUpdate }
}

const labelInput = () => screen.getByPlaceholderText('Field label')
const optionsInput = () => screen.queryByPlaceholderText('Small, Medium, Large')

describe('FormFieldRow', () => {
  afterEach(() => vi.restoreAllMocks())

  it('renders the label and type controls, and no options editor, for a text field', () => {
    renderRow()
    expect(labelInput()).toHaveValue('T-shirt size')
    expect(screen.getByLabelText('Field type')).toHaveValue('text')
    expect(optionsInput()).not.toBeInTheDocument()
  })

  it('offers exactly the types the server named', () => {
    renderRow({ fieldTypes: ['text', 'dropdown'] })
    const values = Array.from(
      screen.getByLabelText('Field type').querySelectorAll('option'),
    ).map(o => (o as HTMLOptionElement).value)
    expect(values).toEqual(['text', 'dropdown'])
  })

  it('reveals the options editor once the type is dropdown', () => {
    renderRow({ field: { ...field, fieldType: 'dropdown', options: ['S', 'M'] } })
    expect(optionsInput()).toBeInTheDocument()
    expect(optionsInput()).toHaveValue('S, M')
  })

  it('saves on blur with a patch carrying only the changed label', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderRow()

    await user.clear(labelInput())
    await user.type(labelInput(), 'Dietary needs')
    await user.tab()

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate).toHaveBeenCalledWith('ff-1', { label: 'Dietary needs' })
  })

  it('does not save an emptied label', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderRow()

    await user.clear(labelInput())
    await user.tab()

    expect(onUpdate).not.toHaveBeenCalled()
    expect(labelInput()).toHaveValue('T-shirt size')
  })

  it('parses the options input into an array on blur', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue({})
    renderRow({ field: { ...field, fieldType: 'dropdown', options: [] }, onUpdate })

    await user.type(optionsInput()!, 'Small, Medium ,Large')
    await user.tab()

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate).toHaveBeenCalledWith('ff-1', { options: ['Small', 'Medium', 'Large'] })
  })

  it('shows the server message inline when the label is a duplicate', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockRejectedValue(
      new ApiError('A field with this label already exists on this event.', 'duplicate_label', 409),
    )
    renderRow({ onUpdate })

    await user.type(labelInput(), '!')
    await user.tab()

    await waitFor(() =>
      expect(
        screen.getByText('A field with this label already exists on this event.'),
      ).toBeInTheDocument(),
    )
    // The rejected value stays on screen — the organiser has to edit it to fix it
    expect(labelInput()).toHaveValue('T-shirt size!')
    expect(screen.queryByText('Failed to save')).not.toBeInTheDocument()
  })

  it('falls back to the generic toast and reverts for any other rejection', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockRejectedValue(new Error('nope'))
    renderRow({ onUpdate })

    await user.type(labelInput(), '!')
    await user.tab()

    await waitFor(() => expect(screen.getByText('Failed to save')).toBeInTheDocument())
    expect(labelInput()).toHaveValue('T-shirt size')
  })

  it('names the remove control after the field it removes', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderRow({ onDelete })

    await user.click(screen.getByLabelText('Remove field T-shirt size'))
    expect(onDelete).toHaveBeenCalledWith('ff-1')
  })

  it('removes the type control and the remove control once the campaign is live', () => {
    renderRow({ disabled: true })
    expect(screen.queryByLabelText('Remove field T-shirt size')).not.toBeInTheDocument()
    expect(labelInput()).toHaveAttribute('readonly')
  })
})
