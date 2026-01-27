'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useOrbitalStore } from '@/store/orbitalStore'
import CorePhilosophies from './CorePhilosophies'

/**
 * DynamicContentPanel - Unified content panel for core and planets
 *
 * Displays different content based on activePlanetId:
 * - 'core' → Atomic Truths + Philosophies accordion
 * - planet id → Three Pillars of Experience + Planet content
 *
 * Animation: Apple ease curve for premium transitions
 */

const APPLE_EASE = [0.16, 1, 0.3, 1] as const

export default function DynamicContentPanel() {
    const { activePlanetId, planets } = useOrbitalStore()

    const isCoreActive = activePlanetId === 'core'
    const activePlanet = planets.find(p => p.id === activePlanetId)

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                {isCoreActive ? (
                    <CoreContentView key="core" />
                ) : activePlanet ? (
                    <PlanetContentView key={activePlanet.id} planet={activePlanet} />
                ) : null}
            </AnimatePresence>
        </div>
    )
}

/**
 * CoreContentView - "Atomic Truths" view when core is clicked
 */
function CoreContentView() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: APPLE_EASE }}
        >
            {/* Section Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ekatva-teal/30 bg-ekatva-teal/10 mb-[2vh]">
                <div className="w-2 h-2 rounded-full bg-ekatva-teal animate-pulse" />
                <span className="text-ekatva-teal text-xs tracking-widest uppercase">
                    The Core
                </span>
            </div>

            {/* Main Heading */}
            <h2 className="font-serif text-[clamp(2.5rem,4vw,4.5rem)] leading-none text-white mb-[1.5vh]">
                Atomic{' '}
                <span className="text-unity-gold italic">Truths.</span>
            </h2>

            {/* Description */}
            <p className="text-fluid-body short:text-fluid-body-compact text-mid-gray mb-[3vh] max-w-md">
                Ekatva is not defined by its events, but by the fundamental forces that bind our community together.
            </p>

            {/* Core Philosophies Accordion */}
            <CorePhilosophies />
        </motion.div>
    )
}

/**
 * PlanetContentView - Visible Content Design
 *
 * DESIGN RATIONALE:
 * - Headline (visible): Emotional hook, helps users understand fest identity
 * - Description (visible): Essential context explaining activities and purpose
 * - Activities (visible): Concrete examples, key differentiator between fests
 *
 * CONTENT TYPE DIFFERENCE:
 * - Core Panel: Abstract philosophies (Unity, Imagination, Glory)
 *   → Accordion makes sense for progressive disclosure of abstract concepts
 * - Planet Panels: Concrete events (Hackathon, Coding Battle, etc.)
 *   → All content visible for immediate understanding and comparison
 *
 * VISUAL HIERARCHY:
 * 1. Planet Name (colored, large) - Identity
 * 2. Headline (gold italic) - Emotional hook
 * 3. Description (mid-gray) - Essential context
 * 4. Activities (colored pills) - Concrete examples
 *
 * UX PRINCIPLES APPLIED:
 * - Information Discoverability: All critical info visible without interaction
 * - No Interaction Barrier: Users understand without clicking
 * - Comparison Support: All info visible simultaneously for fest comparison
 * - Content Type Respect: Different content types get different treatments
 * - Design System Consistency: Visual cohesion through typography, spacing, color, animation
 */
interface PlanetContentViewProps {
    planet: {
        id: string
        name: string
        appearance: {
            baseColor: string
            glowColor: string
        }
        content: {
            headline: string
            description: string
            activities: string[]
        }
    }
}

function PlanetContentView({ planet }: PlanetContentViewProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: APPLE_EASE }}
        >
            {/* Section Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ekatva-teal/30 bg-ekatva-teal/10 mb-[2vh]">
                <div className="w-2 h-2 rounded-full bg-ekatva-teal animate-pulse" />
                <span className="text-ekatva-teal text-xs tracking-widest uppercase">
                    What We Do
                </span>
            </div>

            {/* Main Heading - NOT dimmed */}
            <h2 className="font-serif text-[clamp(2.5rem,4vw,4.5rem)] leading-none text-white mb-[1.5vh]">
                Three{' '}
                <span className="text-unity-gold italic">Orbits.</span>
            </h2>

            {/* Instruction */}
            <p className="text-fluid-body short:text-fluid-body-compact text-mid-gray mb-[2vh] max-w-md">
                Three realms of experience. Click any orbit to discover.
            </p>

            {/* Divider */}
            <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: APPLE_EASE }}
                className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-[3vh]"
            />

            {/* Planet Name */}
            <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15, ease: APPLE_EASE }}
                className="text-[clamp(1.75rem,3vw,2.5rem)] font-serif tracking-tight leading-[1.1] mb-2"
                style={{ color: planet.appearance.baseColor }}
            >
                {planet.name}
            </motion.h3>

            {/* Headline - Silver italic for supporting hierarchy */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2, ease: APPLE_EASE }}
                className="text-[clamp(1.25rem,2vw,1.75rem)] font-serif italic text-white/60 leading-tight mb-[2vh]"
            >
                {planet.content.headline}
            </motion.p>

            {/* Description - Always visible for immediate understanding */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25, ease: APPLE_EASE }}
                className="text-sm md:text-base text-mid-gray leading-relaxed mb-[3vh]"
            >
                {planet.content.description}
            </motion.p>

            {/* Activities */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3, ease: APPLE_EASE }}
            >
                <h4 className="text-xs uppercase tracking-widest text-light-gray mb-3 font-semibold">
                    Featured Activities
                </h4>
                <div className="flex flex-wrap gap-2">
                    {planet.content.activities.map((activity, i) => (
                        <motion.span
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.35 + i * 0.03, ease: APPLE_EASE }}
                            className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm border transition-all hover:scale-105"
                            style={{
                                borderColor: `${planet.appearance.baseColor}40`,
                                color: planet.appearance.baseColor,
                                backgroundColor: `${planet.appearance.baseColor}10`,
                            }}
                        >
                            {activity}
                        </motion.span>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}
