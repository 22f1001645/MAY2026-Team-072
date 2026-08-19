import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import KanbanWorkspace from '../KanbanWorkspace'
import { ToastProvider } from '../../components/ui'
import { ApiError } from '../../lib/api'
import * as queries from '../../lib/queries'

/* KanbanWorkspace — TEAM-01.
 *
 * The 403 the server answers before publication is an EXPECTED state, not a
 * fault: the board is inert until the Meetup Head pushes the campaign live. If
 * that branch is ever lost the organiser sees a raw error for a situation they
 * are supposed to be walked out of, which is invisible in every other test
 * because both paths render "a page that is not a board".
 */

vi.mock('../../lib/queries')
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<typeof import('react-router-dom')>('react-router-dom')),
  useParams: () => ({ id: 'act-1' }),
}))

const mocked = vi.mocked(queries)

const query = (over: Record<string, unknown> = {}) =>
  ({ data: undefined, isLoading: false, isError: false, error: null, refetch: vi.fn(), ...over }) as any

beforeEach(() => {
  vi.resetAllMocks()
  mocked.useEvent.mockReturnValue(
    query({ data: { id: 'act-1', title: 'Chennai Coffee Meetup', teamMembers: [] } }),
  )
  mocked.useCampaign.mockReturnValue(query({ data: { status: 'draft', taskStatuses: [] } }))
  mocked.useTasks.mockReturnValue(query())
  for (const hook of ['useCreateTask', 'useUpdateTask', 'useDeleteTask'] as const)
    mocked[hook].mockReturnValue({ mutate: vi.fn() } as any)
})

const renderPage = () =>
  render(
    <ToastProvider>
      <MemoryRouter>
        <KanbanWorkspace />
      </MemoryRouter>
    </ToastProvider>,
  )

describe('KanbanWorkspace', () => {
  it('explains the push-live prerequisite when the board is not open yet', () => {
    mocked.useTasks.mockReturnValue(
      query({
        isError: true,
        error: new ApiError('The team workspace activates once the campaign is live.', 'campaign_not_live', 403),
      }),
    )

    renderPage()

    expect(screen.getByText('The workspace is not open yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open the campaign builder' })).toHaveAttribute(
      'href',
      '/events/act-1/campaign',
    )
    // Not a board: no column landmark was rendered.
    expect(screen.queryAllByRole('region')).toHaveLength(0)
  })

  it('fails loudly for any other task-query error', () => {
    mocked.useTasks.mockReturnValue(
      query({ isError: true, error: new ApiError('Boom', 'server_error', 500) }),
    )

    renderPage()

    expect(screen.getByText('Could not load')).toBeInTheDocument()
    expect(screen.queryByText('The workspace is not open yet')).toBeNull()
  })

  it('renders the board with the server-declared columns once the campaign is live', () => {
    mocked.useCampaign.mockReturnValue(
      query({
        data: {
          status: 'live',
          taskStatuses: [
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'done', label: 'Done' },
          ],
        },
      }),
    )
    mocked.useTasks.mockReturnValue(query({ data: [] }))

    renderPage()

    expect(screen.getByRole('region', { name: 'To Do' })).toBeInTheDocument()
    expect(screen.getByText('Live')).toBeInTheDocument()
  })
})
