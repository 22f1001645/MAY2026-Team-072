'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

import OrbitalSystem from './OrbitalSystem'
import DynamicContentPanel from './DynamicContentPanel'
import MobileIdentityReveal from './mobile/MobileIdentityReveal'

/**
 * IdentityRevealSection - Responsive Identity Reveal
 *
 * DESKTOP (> 768px):
 * - Premium 7:5 split-screen design
 * - Left (7 cols): Interactive 3D Orbital System (WebGL)
 * - Right (5 cols): Dynamic Content Panel
 * - Drag to rotate, click planets/core to switch content
 *
 * MOBILE (≤ 768px):
 * - 6-page Interactive Book for Three Pillars
 * - Separate Atomic Truths cards below book
 * - Tap-to-flip pages, expand cards for philosophy
 */
export default function IdentityRevealSection() {
    // Scroll detection to prevent accidental taps during scroll (desktop only)
    const [isScrolling, setIsScrolling] = useState(false)
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolling(true)

            // Clear previous timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }

            // Re-enable interactions 150ms after scroll stops
            scrollTimeoutRef.current = setTimeout(() => {
                setIsScrolling(false)
            }, 150)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => {
            window.removeEventListener('scroll', handleScroll)
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current)
            }
        }
    }, [])

    return (
        <section
            id="identity-reveal"
            className="relative bg-oneness-black py-20"
            aria-labelledby="identity-title"
        >
            {/* MOBILE: Interactive Book + Atomic Truths Cards */}
            <div className="block md:hidden">
                <MobileIdentityReveal />
            </div>

            {/* DESKTOP: 3D Orbital System + Content Panel */}
            <div className="hidden md:block">
                <>
                    {/* Background Ambient Glow */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div
                            className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-30 blur-[120px]"
                            style={{
                                background: 'radial-gradient(circle, rgba(92, 230, 201, 0.15) 0%, transparent 70%)'
                            }}
                        />
                    </div>

                    {/* Main Container */}
                    <div className="container-custom relative z-10">
                        {/* Same layout for all screen sizes - 7:5 split grid */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-fluid-col-gap items-start">

                            {/* LEFT: Orbital Visual (7 cols) - shows second on mobile (stacked) */}
                            <motion.div
                                initial={{ opacity: 0, x: -30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="md:col-span-7 order-2 md:order-1"
                            >
                                {/* Orbital Visual Container with Frame - Physics-tuned */}
                                <div
                                    className="relative min-h-[clamp(380px,55vh,650px)] aspect-square md:aspect-auto rounded-2xl overflow-hidden"
                                    style={{
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, transparent 50%)',
                                        // Disable pointer events during scroll to prevent accidental taps
                                        pointerEvents: isScrolling ? 'none' : 'auto',
                                    }}
                                >
                                    {/* Grid Pattern Overlay */}
                                    <svg
                                        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.15]"
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <pattern
                                                id="orbital-grid"
                                                width="40"
                                                height="40"
                                                patternUnits="userSpaceOnUse"
                                            >
                                                <path
                                                    d="M 40 0 L 0 0 0 40"
                                                    fill="none"
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth="0.5"
                                                />
                                            </pattern>
                                        </defs>
                                        <rect width="100%" height="100%" fill="url(#orbital-grid)" />
                                    </svg>

                                    {/* Ambient Glow behind Core */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] rounded-full blur-[80px]"
                                            style={{
                                                background: 'radial-gradient(circle, rgba(0, 240, 255, 0.25) 0%, transparent 70%)'
                                            }}
                                        />
                                    </div>

                                    {/* Orbital System */}
                                    <OrbitalSystem />

                                    {/* Mobile Instruction Hint (fades out after 4s) - Only on touch devices */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 0.8, 0.8, 0] }}
                                        transition={{
                                            duration: 5,
                                            times: [0, 0.2, 0.7, 1],
                                            delay: 1.5
                                        }}
                                        className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full border border-white/20 bg-black/50 backdrop-blur-sm text-xs text-white/90 text-center pointer-events-none md:hidden"
                                    >
                                        Tap any planet to explore
                                    </motion.div>
                                </div>
                            </motion.div>

                            {/* RIGHT: Dynamic Content Panel (5 cols) */}
                            <motion.div
                                initial={{ opacity: 0, x: 30 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="md:col-span-5 order-1 md:order-2 overflow-x-hidden"
                            >
                                <DynamicContentPanel />
                            </motion.div>
                        </div>
                    </div>
                </>
            </div>
        </section>
    )
}
