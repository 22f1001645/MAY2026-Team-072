/**
 * ScrollToTop - Navigation Scroll Reset Component
 * 
 * PURPOSE:
 * Ensures all primary navigation clicks land at the top of the page (Y=0)
 * instead of mid-page, regardless of previous scroll position.
 * 
 * ARCHITECTURE:
 * - Listens to pathname changes via usePathname()
 * - Instantly scrolls to top on every route change
 * - Runs only on client side (no SSR)
 * - Zero UI footprint (returns null)
 * 
 * RATIONALE:
 * - Next.js App Router doesn't auto-scroll to top on navigation
 * - Browser may attempt scroll restoration from history
 * - Global scroll-smooth was causing animated mid-page landings
 * 
 * BEHAVIOR:
 * ✅ Direct nav clicks → Scroll to top
 * ✅ Browser back/forward → Scroll to top
 * ✅ Programmatic navigation → Scroll to top
 * ✅ Instant scroll (no smooth animation on route change)
 */

import { useEffect } from 'react'
import { usePathname } from '../../next-compat'

export default function ScrollToTop() {
    const pathname = usePathname()

    useEffect(() => {
        // Instant scroll to top on pathname change
        // Without smooth behavior to ensure crisp navigation
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'instant' as ScrollBehavior
        })
    }, [pathname])

    // No UI - this component only manages scroll behavior
    return null
}
