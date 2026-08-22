/**
 * DASH-01 / 02-UI-SPEC S1: the five behaviours ROADMAP criterion 4 rests on.
 *
 * Capabilities arrive through the real `AuthProvider` with a stubbed `api.me`,
 * rather than by mocking `useAuth`. Mocking the hook would test the test's idea
 * of a capability; going through the provider exercises the path the app
 * actually takes, including the `/auth/refresh` → `/auth/me` cold-load sequence
 * (D-08) that produces `isOrganiser` in the first place.
 *
 * Segments are queried by `role="radio"` and asserted on `aria-checked`, never
 * on class strings: a class assertion would fail on any cosmetic change and
 * would prove nothing about behaviour. The visual contract is verified at the
 * phase's human checkpoint, which is where geometry belongs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '../../lib/auth'
import ViewSwitcher from '../ViewSwitcher'

/** `vi.mock` is hoisted above every top-level binding, so the per-test account
 *  travels through a ref the hoisted factory can close over. */
const { session } = vi.hoisted(() => ({ session: { account: null as unknown } }))

vi.mock('../../lib/api', () => ({
  api: {
    refresh: async () => ({ access_token: 'test-access-token' }),
    me: async () => session.account,
    logout: async () => ({ message: 'ok' }),
  },
  setOnSessionExpired: () => {},
}))

const account = (isOrganiser: boolean) => ({
  id: 'u-1',
  name: 'Sai Teja',
  email: 'rc@ekatva.os',
  role: 'student',
  city: 'Hyderabad',
  pors: [],
  academicStatusStale: false,
  capabilities: {
    isOrganiser,
    manageableOrgIds: isOrganiser ? ['org-1'] : [],
    manageableActivityIds: [],
  },
})

/** Surfaces the current URL so navigation is asserted on the router's own
 *  state rather than on a spy over `useNavigate`. */
function LocationProbe() {
  const { pathname } = useLocation()
  return <div data-testid="pathname">{pathname}</div>
}

/** Marks the point at which the cold-load sequence has resolved. Without it,
 *  "renders nothing" would pass against a provider that had not finished
 *  loading — a vacuous assertion. */
function ReadyProbe() {
  const { loading } = useAuth()
  return <div data-testid="auth">{loading ? 'loading' : 'ready'}</div>
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function renderAt(path: string, isOrganiser = true) {
  session.account = account(isOrganiser)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <ReadyProbe />
          <LocationProbe />
          <ViewSwitcher />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const settled = () => screen.findByText('ready')
const getSwitch = () => screen.getByRole('switch', { name: 'Use Organiser view' })

beforeEach(() => {
  localStorage.clear()
})

describe('ViewSwitcher (S1, D-15 to D-18)', () => {
  it('renders a switch for an organiser', async () => {
    renderAt('/discover')
    await settled()
    expect(await screen.findByRole('switch', { name: 'Use Organiser view' })).toBeInTheDocument()
  })

  it('renders nothing at all for a single-role student, and drops the stored view', async () => {
    localStorage.setItem('ekatva_view', 'organiser')
    renderAt('/discover', false)
    await settled()

    expect(screen.queryByRole('switch')).toBeNull()
    expect(localStorage.getItem('ekatva_view')).toBeNull()
  })

  it('keeps the stored view across a cold load (D-15 persistence)', async () => {
    localStorage.setItem('ekatva_view', 'organiser')
    renderAt('/events/ev-ekatva-hyd/manage')
    await settled()

    expect(getSwitch()).toBeChecked()
    expect(localStorage.getItem('ekatva_view')).toBe('organiser')
  })

  it('checks the switch matching the current pathname', async () => {
    renderAt('/discover')
    await settled()

    expect(await screen.findByRole('switch', { name: 'Use Organiser view' })).not.toBeChecked()
  })

  it('navigates to that view and stores the choice on activation', async () => {
    const user = userEvent.setup()
    renderAt('/organiser')
    await settled()

    await user.click(screen.getByText('Student'))

    expect(screen.getByTestId('pathname')).toHaveTextContent('/discover')
    expect(localStorage.getItem('ekatva_view')).toBe('student')
  })

  it('lets the URL win over the stored view on crossover (D-16)', async () => {
    // The stored view says Student; the URL says Organiser. The URL is the
    // source of truth, so a deep link from a teammate flips the switcher
    // rather than the switcher overriding the link.
    localStorage.setItem('ekatva_view', 'student')
    renderAt('/events/ev-ekatva-hyd/manage')
    await settled()

    expect(await screen.findByRole('switch', { name: 'Use Organiser view' })).toBeChecked()
  })
})
