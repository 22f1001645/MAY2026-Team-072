import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth, homeFor } from '../lib/auth'
import { cx } from '../lib/format'

/* Student/Organiser view switcher — 02-UI-SPEC S1, decisions D-15 to D-18.
 *
 * The view is a rendering concern and nothing else. It changes which nav the
 * sidebar shows and which home route a click lands on; it changes zero
 * authorization outcomes, and its value never reaches the API (D-18). */

export type View = 'student' | 'organiser'

/** Routes that explicitly belong to the Organiser view. */
const ORGANISER_ROUTES = [
  /^\/organiser(\/|$)/,
  /^\/proposals(\/|$)/,
  /^\/events\/[^/]+\/(manage|expenses)(\/|$)/, // Action routes are definitely organiser
  /^\/checkin(\/|$)/,
  /^\/orgs(\/|$)/,
]

/** Routes that explicitly belong to the Student view. */
const STUDENT_ROUTES = [
  /^\/discover(\/|$)/,
  /^\/me(\/|$)/,
  /^\/leaderboard(\/|$)/,
]

/** 
 * The switcher derives its value from the URL on every render.
 * If a route is neutral (like `/events/:id`), it preserves the current stored view.
 */
export function viewFromPathname(pathname: string): View {
  if (ORGANISER_ROUTES.some((re) => re.test(pathname))) return 'organiser'
  if (STUDENT_ROUTES.some((re) => re.test(pathname))) return 'student'
  
  // Neutral routes (e.g. /events/:id or profile pages) keep whatever is currently stored.
  return (localStorage.getItem('ekatva_view') as View) || 'student'
}


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

  // Sync explicitly matched routes to localStorage so that subsequent navigation
  // to neutral routes (like /events/:id) preserves the intended view.
  useEffect(() => {
    if (ORGANISER_ROUTES.some((re) => re.test(pathname))) localStorage.setItem('ekatva_view', 'organiser')
    else if (STUDENT_ROUTES.some((re) => re.test(pathname))) localStorage.setItem('ekatva_view', 'student')
  }, [pathname])

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

  // A switch only needs standard button keyboard semantics (Space/Enter),
  // which a <button> provides natively.
  const toggle = () => {
    activate(current === 'student' ? 'organiser' : 'student')
  }

  return (
    <div className="flex items-center gap-3 mr-2">
      <span
        className={cx(
          "text-[13px] font-semibold transition-colors duration-300 cursor-pointer select-none",
          current === 'student' ? 'text-offwhite' : 'text-graytext-mid hover:text-offwhite'
        )}
        onClick={() => activate('student')}
      >
        Student
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={current === 'organiser'}
        onClick={toggle}
        className={cx(
          "relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50",
          current === 'organiser' ? 'bg-teal shadow-[0_0_12px_rgba(63,212,182,0.3)]' : 'bg-white/10'
        )}
      >
        <span className="sr-only">Use Organiser view</span>
        <span
          aria-hidden="true"
          className={cx(
            "pointer-events-none inline-block h-[20px] w-[20px] transform rounded-full shadow-sm ring-0 transition duration-300 ease-in-out",
            current === 'organiser' ? 'translate-x-[22px] bg-onyx' : 'translate-x-[2px] bg-graytext-light'
          )}
        />
      </button>

      <span
        className={cx(
          "text-[13px] font-semibold transition-colors duration-300 cursor-pointer select-none",
          current === 'organiser' ? 'text-teal' : 'text-graytext-mid hover:text-offwhite'
        )}
        onClick={() => activate('organiser')}
      >
        Organiser
      </span>
    </div>
  )
}
