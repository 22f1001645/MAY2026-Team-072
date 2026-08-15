import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ScheduleRow } from '../ScheduleRow'
import { ToastProvider } from '../ui'
import { api } from '../../lib/api'
import type { ApiScheduleItem } from '../../lib/types'

/* ScheduleRow — DESIGN-01 / UI-SPEC §2.2 (E2).
 *
 * The row has no Save button, so every claim below is invisible in a screenshot
 * and one edit away from being wrong:
 *
 *  1. A blur saves ONE field, not the whole row. A whole-row replace from a
 *     stale draft would overwrite a concurrent reorder (T-05-30).
 *  2. An empty title is not a save. Without this the first keystroke-then-clear
 *     silently blanks a row on the server.
 *  3. A rejected save reverts the field AND says so. Either half alone leaves
 *     the organiser believing a lie.
 *  4. isFirst / isLast / disabled REMOVE controls rather than disable them —
 *     a disabled-looking arrow on row one is a control that never applies.
 */

const item: ApiScheduleItem = {
  id: 'item-1',
  activityId: 'act-1',
  position: 0,
  timeBlock: '10:00 - 10:15',
  title: 'Opening remarks',
  ownerId: null,
  ownerLabel: null,
  notes: null,
}

function renderRow(props: Partial<React.ComponentProps<typeof ScheduleRow>> = {}) {
  const onUpdate = props.onUpdate ?? vi.fn().mockResolvedValue({})
  const utils = render(
    <ToastProvider>
      <ScheduleRow
        item={item}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        isFirst={false}
        isLast={false}
        {...props}
      />
    </ToastProvider>,
  )
  return { ...utils, onUpdate }
}

const titleInput = () => screen.getByPlaceholderText('e.g. Opening remarks')

describe('ScheduleRow', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the item title in the title field', () => {
    renderRow()
    expect(titleInput()).toHaveValue('Opening remarks')
  })

  it('saves on blur with a patch carrying only the changed field', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderRow()

    await user.clear(titleInput())
    await user.type(titleInput(), 'Welcome')
    await user.tab()

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate).toHaveBeenCalledWith('item-1', { title: 'Welcome' })
  })

  it('does not save an emptied title', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderRow()

    await user.clear(titleInput())
    await user.tab()

    expect(onUpdate).not.toHaveBeenCalled()
    expect(titleInput()).toHaveValue('Opening remarks')
  })

  it('shows Saving… while the update is in flight and removes it once resolved', async () => {
    const user = userEvent.setup()
    let resolve!: (v: unknown) => void
    const onUpdate = vi.fn().mockReturnValue(new Promise(r => { resolve = r }))
    renderRow({ onUpdate })

    await user.type(titleInput(), '!')
    await user.tab()

    await waitFor(() => expect(screen.getByText('Saving…')).toBeInTheDocument())
    resolve({})
    await waitFor(() => expect(screen.queryByText('Saving…')).not.toBeInTheDocument(), {
      timeout: 3000,
    })
  })

  it('reverts the field and raises a toast when the update rejects', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockRejectedValue(new Error('nope'))
    renderRow({ onUpdate })

    await user.type(titleInput(), ' revised')
    await user.tab()

    await waitFor(() => expect(screen.getByText('Failed to save')).toBeInTheDocument())
    expect(titleInput()).toHaveValue('Opening remarks')
  })

  it('hides Move up on the first row and Move down on the last', () => {
    const { unmount } = renderRow({ isFirst: true })
    expect(screen.queryByLabelText('Move up')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Move down')).toBeInTheDocument()
    unmount()

    renderRow({ isLast: true })
    expect(screen.getByLabelText('Move up')).toBeInTheDocument()
    expect(screen.queryByLabelText('Move down')).not.toBeInTheDocument()
  })

  it('hides both arrows and the delete control once the campaign is live', () => {
    renderRow({ disabled: true })
    expect(screen.queryByLabelText('Move up')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Move down')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete schedule item')).not.toBeInTheDocument()
    expect(titleInput()).toHaveAttribute('readonly')
  })

  it('names the reorder controls Move up and Move down', async () => {
    const user = userEvent.setup()
    const onMoveUp = vi.fn()
    const onMoveDown = vi.fn()
    renderRow({ onMoveUp, onMoveDown })

    await user.click(screen.getByLabelText('Move up'))
    await user.click(screen.getByLabelText('Move down'))

    expect(onMoveUp).toHaveBeenCalledWith('item-1')
    expect(onMoveDown).toHaveBeenCalledWith('item-1')
  })

  /* The reorder wire. CampaignBuilder sends { position } alone; this pins that
   * api.ts does not pad the body back out to a full-row replace (T-05-30). */
  it('sends position and nothing else for a reorder PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'item-1', activity_id: 'act-1', position: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await api.updateScheduleItem('act-1', 'item-1', { position: 1 })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(Object.keys(body)).toEqual(['position'])
    vi.unstubAllGlobals()
  })
})
