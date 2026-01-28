'use client'

import { motion } from 'framer-motion'
import { Shield, Users, Globe } from 'lucide-react'
import AnimatedShineButton from '@/components/ui/AnimatedShineButton'
import './joinCTA.css'

/**
 * JoinCTASection - Minimal CTA Teaser for Home Page
 * 
 * Purpose: Invite users to explore pathways without the "pricing tier" overwhelm
 * Links to: /join-us (full BuildWithUsSection)
 */

export default function JoinCTASection() {
    return (
        <section
            id="join-the-movement"
            className="join-cta-section relative overflow-hidden"
            aria-labelledby="join-cta-title"
        >
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-radial-teal opacity-30" />

            {/* Grid pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />

            {/* Content */}
            <div className="relative z-10 container-custom py-20 md:py-28 lg:py-32">
                <div className="max-w-3xl mx-auto text-center">

                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ekatva-teal/30 bg-ekatva-teal/10 mb-8"
                    >
                        <div className="w-2 h-2 rounded-full bg-ekatva-teal animate-pulse" />
                        <span className="text-ekatva-teal text-xs tracking-widest uppercase font-medium">
                            Join The Movement
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h2
                        id="join-cta-title"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
                    >
                        This Movement{' '}
                        <span className="text-unity-gold italic">Needs You.</span>
                    </motion.h2>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-mid-gray mb-10 leading-relaxed"
                    >
                        Three ways to contribute. One mission:<br className="hidden sm:block" />
                        unite IITM BS students across India.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.35 }}
                        className="mb-12"
                    >
                        <AnimatedShineButton href="/join-us">
                            Explore Your Path
                        </AnimatedShineButton>
                    </motion.div>

                    {/* Trust Signals */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.5 }}
                        transition={{ duration: 0.7, delay: 0.5 }}
                        className="flex justify-center"
                    >
                        <div className="trust-signals-bar">
                            <TrustStat
                                icon={<Shield size={18} />}
                                value="IIT Madras"
                                label="Backed By"
                            />
                            <div className="trust-divider" aria-hidden="true" />
                            <TrustStat
                                icon={<Users size={18} />}
                                value="600+"
                                label="Students"
                            />
                            <div className="trust-divider" aria-hidden="true" />
                            <TrustStat
                                icon={<Globe size={18} />}
                                value="10"
                                label="Cities"
                            />
                        </div>
                    </motion.div>

                </div>
            </div>
        </section>
    )
}

function TrustStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className="text-ekatva-teal">{icon}</div>
            <div className="text-left">
                <div className="text-sm md:text-base font-bold text-white leading-none">{value}</div>
                <div className="text-[10px] text-white/50 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
        </div>
    )
}
