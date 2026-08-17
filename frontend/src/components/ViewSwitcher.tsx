import { useEffect, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, homeFor } from '../lib/auth'
import { cx } from '../lib/format'

/* Student/Organiser view switcher — 02-UI-SPEC S1, decisions D-15 to D-18.
 *
 * The view is a rendering concern and nothing else. It changes which nav the
 * sidebar shows and which home route a click lands on; it changes zero
 * authorization outcomes, and its value never reaches the API (D-18). */

export type View = 'student' | 'organiser'

/** Routes that belong to the Organiser view. Everything else is Student. */
const ORGANISER_ROUTES = [
  /^\/organiser(\/|$)/,
  /^\/proposals(\/|$)/,
  /^\/events\/[^/]+\/(manage|expenses|checkin)(\/|$)/,
]

/** The switcher derives its value from the URL on every render — never from
 *  React state, never from storage. That is what makes D-16 (a deep link into
 *  the other view flips the switcher) free rather than a synchronisation
 *  problem. Exported so `lib/session.tsx` and the tests share one definition of
 *  the route set; three copies would drift. */
export function viewFromPathname(pathname: string): View {
  return ORGANISER_ROUTES.some((re) => re.test(pathname)) ? 'organiser' : 'student'
}

const SEGMENTS: { view: View; label: string }[] = [
  { view: 'student', label: 'Student' },
  { view: 'organiser', label: 'Organiser' },
]

export default function ViewSwitcher() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { capabilities, loading } = useAuth()
  const isOrganiser = capabilities?.isOrganiser ?? false

  // D-17: PORs lapsing mid-session takes the stored view with the switcher.
  // This is the same branch a single-role student takes — one rule, not two.
  //
  // The `loading` guard is load-bearing, not defensive. Capabilities are null
  // until the cold-load /auth/refresh → /auth/me sequence resolves (D-08), so
  // without it this effect reads "not an organiser" on the very first render of
  // every page load and deletes the stored view before anything can read it —
  // which would silently undo D-15 persistence altogether.
  useEffect(() => {
    if (!loading && !isOrganiser) localStorage.removeItem('ekatva_view')
  }, [loading, isOrganiser])

  // No disabled state, no ghost, no lock, no reserved space: a single-role
  // student never learns the switcher exists, the nav simply starts higher.
  if (!isOrganiser) return null

  const current = viewFromPathname(pathname)

  const activate = (view: View) => {
    // Written on activation, read only at cold load to pick a landing route
    // (`homeFor` in lib/auth.tsx). It is NEVER read to decide what renders
    // here — that is the obvious-looking change that would break D-16.
    localStorage.setItem('ekatva_view', view)
    navigate(homeFor(view))
  }

  // Standard radiogroup keys: one Tab stop for the group, arrows move and
  // activate, Home/End jump to the ends.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = SEGMENTS.findIndex((s) => s.view === current)
    let next = -1
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % SEGMENTS.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i + SEGMENTS.length - 1) % SEGMENTS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = SEGMENTS.length - 1
    if (next < 0 || SEGMENTS[next].view === current) return
    e.preventDefault()
    activate(SEGMENTS[next].view)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Dashboard view"
      onKeyDown={onKeyDown}
      className="grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/20 p-1"
    >
      {SEGMENTS.map(({ view, label }) => {
        const active = view === current
        return (
          <button
            key={view}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => activate(view)}
            className={cx(
              'rounded-full px-3 py-1.5 text-[14px] font-medium transition duration-200 ease-material focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50',
              active
                ? 'bg-teal/12 text-teal font-semibold shadow-[inset_0_0_0_1px_rgba(92,230,201,0.35)]'
                : 'text-graytext-light hover:bg-white/5 hover:text-offwhite',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
