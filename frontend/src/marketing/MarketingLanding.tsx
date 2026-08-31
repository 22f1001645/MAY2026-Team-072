/* ---------------------------------------------------------------------------
 * The public front door for Ekatva OS.
 *
 * A port of the home route from the EKATVA movement site
 * (github.com/Vish2BDev/Ekatva-Website), a Next.js 16 app. The section
 * components under ./components are kept as close to their originals as
 * possible so upstream changes can be re-copied rather than re-authored; the
 * Next-specific imports they carry are satisfied by ./next-compat.
 *
 * Only this route was ported. The movement site's other pages (/about,
 * /editions, /join-us, /partner-with-us, /sponsor, and the legal pages) stay on
 * the deployed marketing site and are linked out to - see ./lib/asset.
 * ------------------------------------------------------------------------- */
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ScrollToTop from './components/layout/ScrollToTop'
import HeroSection from './components/sections/HeroSection'
import OriginStorySection from './components/sections/OriginStorySection'
import IdentityRevealSection from './components/sections/IdentityRevealSection'
import RippleSection from './components/sections/RippleSection'
import TestimonialsStackSection from './components/sections/TestimonialsStackSection'
import JoinCTASection from './components/sections/JoinCTASection'
import { SectionDivider } from './components/ui/SectionDivider'
import './marketing.css'

export default function MarketingLanding() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="flex min-h-screen flex-col overflow-x-hidden bg-oneness-black selection:bg-ekatva-teal selection:text-oneness-black">
        {/* Section 1: Hero Arrival - Visceral First */}
        <HeroSection />

        {/* Section 2: Origin Story - The Why */}
        <OriginStorySection />

        {/* Section 3: Identity Reveal - What is EKATVA (includes divider on mobile) */}
        <IdentityRevealSection />

        {/* Section 4: The Ripple - Movement Expansion */}
        <RippleSection />

        {/* No divider - Testimonials has its own "VOICES OF EKATVA" header */}

        {/* Section 5: Community Voices - Social Proof */}
        <TestimonialsStackSection />

        {/* Divider: Testimonials -> Join (both dark sections, needs separation) */}
        <SectionDivider />

        {/* Section 6: Join CTA - routes into Ekatva OS sign-up */}
        <JoinCTASection />
      </main>
      <Footer />
    </>
  )
}
