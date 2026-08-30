import { motion } from 'framer-motion'
import MobilePillarCarousel from './MobilePillarCarousel'
import AtomicTruthsSection from './AtomicTruthsSection'
import { SectionDivider } from '../../../../components/ui/SectionDivider'

/**
 * Mobile Identity Reveal
 * Main mobile wrapper for the Identity Reveal section
 * 
 * Architecture:
 * 1. Section Header — "What is EKATVA?" intro
 * 2. MobilePillarCarousel — Horizontal swipe carousel of pillars
 * 3. AtomicTruthsSection — Core philosophies cards
 * 4. SectionDivider — Visual transition to next section
 */
export default function MobileIdentityReveal() {
    return (
        <div className="pt-12 pb-4">
            {/* Section Header */}
            <motion.header
                className="text-center mb-10 px-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
            >
                {/* Badge */}
                <div className="inline-block px-4 py-1.5 rounded-full bg-ekatva-teal/10 border border-ekatva-teal/20 mb-4">
                    <span className="text-xs uppercase tracking-wider text-ekatva-teal/80">
                        What is EKATVA?
                    </span>
                </div>

                {/* Main Heading */}
                <h2 className="font-serif text-fluid-h2 tracking-tight text-white mb-4">
                    From Online to <span className="italic text-unity-gold">Oneness</span>
                </h2>

                {/* Subtitle */}
                <p className="text-fluid-body text-white/70 max-w-sm mx-auto">
                    Explore our three pillars that unite techno-cultural innovation,
                    social impact, and athletic spirit.
                </p>
            </motion.header>

            {/* Three Pillars Carousel */}
            <div className="mb-16">
                <MobilePillarCarousel />
            </div>

            {/* Atomic Truths Section */}
            <div className="px-6">
                <AtomicTruthsSection />
            </div>

            {/* Section Divider - Right after accordion, before Ripple */}
            <div className="mt-8">
                <SectionDivider />
            </div>
        </div>
    )
}
