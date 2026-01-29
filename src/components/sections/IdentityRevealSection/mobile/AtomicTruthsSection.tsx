'use client'

import { motion } from 'framer-motion'
import AtomicTruthCard from './AtomicTruthCard'
import { Users, Sparkles, Trophy } from 'lucide-react'

/**
 * Atomic Truths Section
 * Container for the three core EKATVA philosophies
 * Provides visual bridge between Interactive Book and philosophy cards
 */
export default function AtomicTruthsSection() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
        >
            {/* Section Divider */}
            <div className="text-center mb-12">
                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-ekatva-teal to-transparent mx-auto mb-6" />

                <div className="inline-block px-4 py-1.5 rounded-full bg-ekatva-teal/10 border border-ekatva-teal/20 mb-4">
                    <span className="text-xs uppercase tracking-wider text-ekatva-teal/80">
                        The Core
                    </span>
                </div>

                <h3 className="font-serif text-3xl tracking-tight text-white mb-3">
                    Atomic <span className="italic">Truths</span>.
                </h3>

                <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed">
                    EKATVA is not defined by its events, but by the fundamental forces
                    that bind our community together.
                </p>
            </div>

            {/* Truth Cards */}
            <div className="space-y-4">
                <AtomicTruthCard
                    principle="unity"
                    title="Unity"
                    subtitle="The Spirit of Oneness"
                    description="From scattered individuals across India to a unified community of 34,000+ IITM BS students, bound by shared ambition and purpose."
                    color="teal"
                    icon={Users}
                />

                <AtomicTruthCard
                    principle="imagination"
                    title="Imagination"
                    subtitle="Where Logic Meets Magic"
                    description="Innovation thrives when creativity meets technical excellence. We push boundaries, dream audaciously, and turn visions into reality."
                    color="gold"
                    icon={Sparkles}
                />

                <AtomicTruthCard
                    principle="glory"
                    title="Glory"
                    subtitle="The Pursuit of Excellence"
                    description="We don't just participate. We dominate. From hackathons to cultural nights, we chase victory with intensity and celebrate it together."
                    color="coral"
                    icon={Trophy}
                />
            </div>
        </motion.div>
    )
}
