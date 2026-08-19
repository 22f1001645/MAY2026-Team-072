import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { KanbanBoard } from '../KanbanBoard'
import { ToastProvider } from '../ui'
import type { ApiTask } from '../../lib/types'

/* KanbanBoard — TEAM-02 / UI-SPEC §2.4 (E4).
 *
 * The board replaces a mock array that was never persisted, so the claims that
 * matter here are the ones a screenshot cannot show:
 *
 *  1. A card sits under its own status column, and the columns come from the
 *     server's list — the board never writes the three status strings down.
 *  2. Changing the status control sends the status ALONE. A patch carrying the
 *     whole card would let a stale render overwrite a concurrent title edit
 *     (T-05-47 bounds last-write-wins to one field).
 *  3. Cancelling the add-task form creates nothing. A Cancel that still fires
 *     the handler is invisible until a phantom card appears on someone's board.
 *  4. An empty column is a correct column, not a missing one — columns render
 *     independently, so a mixed board needs no special case.
 */

const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

const TEAM = [
  { userId: 'u-1', name: 'Sai Teja', role: 'Meetup Head' },
  { userId: 'u-2', name: 'Arav Menon', role: 'Logistics' },
]

const task = (over: Partial<ApiTask> & { id: string }): ApiTask => ({
  activityId: 'act-1',
  title: 'Book the venue',
  description: null,
  assigneeId: 'u-1',
  deadline: null,
  status: 'todo',
  position: 0,
  ...over,
})

function renderBoard(props: Partial<React.ComponentProps<typeof KanbanBoard>> = {}) {
  const onCreate = vi.fn()
  const onUpdate = vi.fn()
  const utils = render(
    <ToastProvider>
      <KanbanBoard
        tasks={[]}
        teamMembers={TEAM}
        statuses={STATUSES}
        isLoading={false}
        isError={false}
        onRetry={vi.fn()}
        onDelete={vi.fn()}
        {...props}
        onCreate={onCreate}
        onUpdate={onUpdate}
      />
    </ToastProvider>,
  )
  return { ...utils, onCreate, onUpdate }
}

const column = (label: string) => screen.getByRole('region', { name: label })

describe('KanbanBoard', () => {
  it('renders one column per server status and puts each card under its own', () => {
    renderBoard({
      tasks: [
        task({ id: 't-1', title: 'Book the venue', status: 'todo' }),
        task({ id: 't-2', title: 'Design the poster', status: 'in_progress' }),
        task({ id: 't-3', title: 'Confirm the caterer', status: 'done' }),
      ],
    })

    expect(within(column('To Do')).getByText('Book the venue')).toBeInTheDocument()
    expect(within(column('In Progress')).getByText('Design the poster')).toBeInTheDocument()
    expect(within(column('Done')).getByText('Confirm the caterer')).toBeInTheDocument()
  })

  it('shows the compact caption in a column with no tasks', () => {
    renderBoard({ tasks: [task({ id: 't-1', status: 'todo' })] })

    expect(within(column('Done')).getByText('No tasks here yet')).toBeInTheDocument()
    expect(within(column('To Do')).queryByText('No tasks here yet')).toBeNull()
  })

  it('counts one task in the singular and several in the plural', () => {
    renderBoard({
      tasks: [
        task({ id: 't-1', status: 'todo' }),
        task({ id: 't-2', title: 'B', status: 'in_progress' }),
        task({ id: 't-3', title: 'C', status: 'in_progress' }),
        task({ id: 't-4', title: 'D', status: 'in_progress' }),
      ],
    })

    expect(within(column('To Do')).getByText('1 task')).toBeInTheDocument()
    expect(within(column('In Progress')).getByText('3 tasks')).toBeInTheDocument()
    expect(within(column('Done')).getByText('0 tasks')).toBeInTheDocument()
  })

  it('exposes a long title in full through a native tooltip', () => {
    const long =
      'Confirm the caterer, the projector, the backup projector and the parking passes'
    renderBoard({ tasks: [task({ id: 't-1', title: long })] })

    expect(screen.getByText(long)).toHaveAttribute('title', long)
  })

  it('sends the status alone when the status control changes', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderBoard({ tasks: [task({ id: 't-1', status: 'todo' })] })

    await user.selectOptions(screen.getByLabelText('Task status'), 'in_progress')

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [id, patch] = onUpdate.mock.calls[0]
    expect(id).toBe('t-1')
    expect(Object.keys(patch)).toEqual(['status'])
    expect(patch.status).toBe('in_progress')
  })

  it('creates a task from the inline add row with title, assignee and deadline', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderBoard()

    await user.click(screen.getByRole('button', { name: '+ Add task' }))
    await user.type(screen.getByPlaceholderText('Task title'), 'Print the banners')
    await user.selectOptions(screen.getByLabelText('Assignee'), 'u-2')
    await user.type(screen.getByLabelText('Deadline'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      title: 'Print the banners',
      assigneeId: 'u-2',
      deadline: '2026-09-01',
    })
  })

  it('creates nothing when the add-task form is cancelled', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderBoard()

    await user.click(screen.getByRole('button', { name: '+ Add task' }))
    await user.type(screen.getByPlaceholderText('Task title'), 'Print the banners')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText('Task title')).toBeNull()
  })

  it('shows two skeleton placeholders per column and no card while loading', () => {
    renderBoard({ isLoading: true, tasks: [task({ id: 't-1' })] })

    for (const label of ['To Do', 'In Progress', 'Done']) {
      expect(column(label).querySelectorAll('.animate-pulse')).toHaveLength(2)
    }
    expect(screen.queryByText('Book the venue')).toBeNull()
  })
})
