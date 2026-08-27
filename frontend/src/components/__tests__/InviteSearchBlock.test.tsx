import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import InviteSearchBlock from '../InviteSearchBlock'
import { ToastProvider } from '../ui'
import { api } from '../../lib/api'

vi.mock('../../lib/api', () => ({
  api: {
    searchUsers: vi.fn(),
    inviteFriend: vi.fn(),
  }
}))

function renderBlock(props: { eventId?: string; onInvite?: () => void } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <InviteSearchBlock eventId={props.eventId || 'ev-1'} onInvite={props.onInvite} />
      </ToastProvider>
    </QueryClientProvider>
  )
  return { ...utils, queryClient }
}

describe('InviteSearchBlock', () => {
  beforeEach(() => {
    vi.mocked(api.searchUsers).mockReset()
    vi.mocked(api.inviteFriend).mockReset()
  })

  it('renders the search block with instructions', () => {
    renderBlock()
    expect(screen.getByText('Invite a Friend')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument()
  })

  it('does not search when the query is 2 characters or less', async () => {
    const user = userEvent.setup()
    renderBlock()
    
    await user.type(screen.getByPlaceholderText('Search by name...'), 'ab')
    expect(api.searchUsers).not.toHaveBeenCalled()
    expect(screen.queryByText('Searching...')).not.toBeInTheDocument()
  })

  it('searches when the query is 3 or more characters and displays results', async () => {
    vi.mocked(api.searchUsers).mockResolvedValue([
      { id: 'u-1', name: 'Alice', email: 'alice@example.com' },
      { id: 'u-2', name: 'Alina', email: 'alina@example.com' }
    ])
    
    const user = userEvent.setup()
    renderBlock()
    
    await user.type(screen.getByPlaceholderText('Search by name...'), 'Ali')
    
    await waitFor(() => {
      expect(api.searchUsers).toHaveBeenCalledWith('Ali')
    })
    
    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('Alina')).toBeInTheDocument()
  })

  it('shows "No users found." when the search returns empty', async () => {
    vi.mocked(api.searchUsers).mockResolvedValue([])
    
    const user = userEvent.setup()
    renderBlock()
    
    await user.type(screen.getByPlaceholderText('Search by name...'), 'XYZ')
    
    expect(await screen.findByText('No users found.')).toBeInTheDocument()
  })

  it('calls inviteFriend when an invite button is clicked and shows a toast', async () => {
    vi.mocked(api.searchUsers).mockResolvedValue([
      { id: 'u-1', name: 'Alice', email: 'alice@example.com' }
    ])
    vi.mocked(api.inviteFriend).mockResolvedValue({ status: 'ok' })
    const onInvite = vi.fn()
    
    const user = userEvent.setup()
    renderBlock({ eventId: 'ev-99', onInvite })
    
    await user.type(screen.getByPlaceholderText('Search by name...'), 'Ali')
    
    const inviteBtn = await screen.findByText('Invite')
    await user.click(inviteBtn)
    
    expect(api.inviteFriend).toHaveBeenCalledWith('ev-99', 'u-1')
    expect(await screen.findByText('Invite sent to Alice!')).toBeInTheDocument()
    expect(onInvite).toHaveBeenCalled()
    expect(screen.getByPlaceholderText('Search by name...')).toHaveValue('')
  })
})
