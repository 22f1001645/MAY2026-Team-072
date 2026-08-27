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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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

function renderAt(path: string, isOrganiser = true) {
  session.account = account(isOrganiser)
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
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

/** The control is a two-state switch, not a radiogroup: `aria-checked` on it
 *  means "Organiser view", and the Student/Organiser labels flanking it are
 *  clickable shortcuts to each side. These helpers keep every assertion below
 *  phrased in those terms, so a future restyle has one place to update. */
const toggle = () => screen.getByRole('switch')
const label = (name: string) => screen.getByText(name)
const activeView = () =>
  toggle().getAttribute('aria-checked') === 'true' ? 'organiser' : 'student'

beforeEach(() => {
  localStorage.clear()
})

describe('ViewSwitcher (S1, D-15 to D-18)', () => {
  it('renders both views and one switch for an organiser', async () => {
    renderAt('/discover')
    await settled()

    expect(await screen.findByRole('switch')).toBeInTheDocument()
    expect(label('Student')).toBeInTheDocument()
    expect(label('Organiser')).toBeInTheDocument()
  })

  it('renders nothing at all for a single-role student, and drops the stored view', async () => {
    localStorage.setItem('ekatva_view', 'organiser')
    renderAt('/discover', false)
    await settled()

    // No disabled state, no ghost, no reserved space (D-17, S1 empty case).
    expect(screen.queryByRole('switch')).toBeNull()
    expect(screen.queryByText('Organiser')).toBeNull()
    // Lapsed PORs take the stored view with them — the same branch, one rule.
    expect(localStorage.getItem('ekatva_view')).toBeNull()
  })

  it('keeps the stored view across a cold load (D-15 persistence)', async () => {
    // Capabilities are null until /auth/refresh → /auth/me resolves, so a lapse
    // cleanup that does not wait for that reads "not an organiser" on the first
    // render of every page load and wipes the stored view. That failure is
    // invisible in the UI — the switcher still renders correctly from the URL —
    // and only shows up as "my view never survives a reload". Hence its own test.
    //
    // The route has to be a NEUTRAL one. A route that belongs to a view syncs
    // itself into storage, so landing on /discover writes 'student' quite
    // correctly (D-16, the URL wins) and would mask the thing under test here.
    localStorage.setItem('ekatva_view', 'organiser')
    renderAt('/events/ev-ekatva-hyd')
    await settled()

    expect(localStorage.getItem('ekatva_view')).toBe('organiser')
  })

  it('shows the view matching the current pathname', async () => {
    renderAt('/discover')
    await settled()

    await screen.findByRole('switch')
    expect(activeView()).toBe('student')
  })

  it('navigates to that view and stores the choice on activation', async () => {
    const user = userEvent.setup()
    renderAt('/organiser')
    await settled()

    await screen.findByRole('switch')
    await user.click(label('Student'))

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

    await screen.findByRole('switch')
    expect(activeView()).toBe('organiser')
  })
})
