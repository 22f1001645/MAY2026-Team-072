/* ---------------------------------------------------------------------------
 * The /about route for Ekatva OS.
 *
 * Unlike MarketingLanding.tsx, this page is not a byte-close port of the
 * movement site's About page — the content is a deliberate blend (see
 * ./components/sections/about/) of the movement/mission story from
 * ekatva-website's About page and the OS-product pitch from the orphaned
 * pre-port ../pages/Landing.tsx, drafted via the copywriting skill rather
 * than copied verbatim. See the plan doc for the full rationale.
 *
 * The shell (ScrollToTop + Navbar + main + Footer) mirrors MarketingLanding.tsx
 * exactly so the nav chrome behaves identically across both pages.
 * ------------------------------------------------------------------------- */
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ScrollToTop from './components/layout/ScrollToTop'
import AboutHeroSection from './components/sections/about/AboutHeroSection'
import BeliefsSection from './components/sections/about/BeliefsSection'
import WhyItExistsSection from './components/sections/about/WhyItExistsSection'
import HowItWorksSection from './components/sections/about/HowItWorksSection'
import VisionSection from './components/sections/about/VisionSection'
import './marketing.css'

export default function AboutPage() {
  return (
    <>
      <ScrollToTop />
      <Navbar />
      <main className="flex min-h-screen flex-col overflow-x-hidden bg-oneness-black selection:bg-ekatva-teal selection:text-oneness-black">
        <AboutHeroSection />
        <BeliefsSection />
        <WhyItExistsSection />
        <HowItWorksSection />
        <VisionSection />
      </main>
      <Footer />
    </>
  )
}
