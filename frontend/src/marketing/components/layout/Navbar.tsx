/**
 * Navbar - the landing page's single fixed navigation bar.
 *
 * Upstream this was a dual-layer system: a PrimaryNav bar (logo, page links,
 * CTA) that hid on scroll-down, with the section-level SecondaryNav pill
 * underneath, both revealed only after the visitor cleared 80% of the hero.
 *
 * In Ekatva OS the primary bar is gone and the section pill is the whole
 * navigation: it stays fixed at the top from first paint rather than waiting on
 * a scroll threshold, so the way into the product is never more than one click
 * away. The page links the primary bar carried (About, Editions, Partner,
 * Sponsor) pointed at marketing routes this app does not serve; the pill now
 * carries the two destinations that matter here - Log in and Get Started.
 *
 * That also retires the mobile drawer, whose only trigger was the primary bar's
 * hamburger. SecondaryNav scrolls horizontally on narrow screens instead.
 */

import SecondaryNav from './SecondaryNav'

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 mt-4">
      <SecondaryNav />
    </header>
  )
}
