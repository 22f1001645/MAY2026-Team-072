'use client'

import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import PlanetGlyph from './PlanetGlyph'

/**
 * PillarCard — Individual pillar card for Mobile Carousel
 * 
 * Award-winning features:
 * - Full glassmorphism with pillar-colored radial glow
 * - Breathing glyph animation (scale 1 → 1.03 → 1)
 * - Staggered content entrance with Apple easing
 * - Activity pills with EXACT desktop styling
 * - No stats counters, no Devanagari (per requirements)
 */

const APPLE_EASE = [0.16, 1, 0.3, 1] as const

interface PillarCardProps {
    planet: {
        id: string
        name: string
        appearance: {
            baseColor: string
            glowColor: string
            icon: LucideIcon
        }
        content: {
            headline: string
            description: string
            activities: string[]
        }
    }
    isActive?: boolean
}

const PillarCard = forwardRef<HTMLDivElement, PillarCardProps>(
    ({ planet, isActive = false }, ref) => {
        return (
            <div
                ref={ref}
                className="scroll-snap-center flex-shrink-0 w-[calc(100vw-48px)] max-w-[360px]"
            >
                <motion.div
                    className="relative rounded-3xl px-6 py-10 overflow-hidden"
                    style={{
                        background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 50%, transparent 100%)`,
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                    }}
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: isActive ? 1 : 0.7 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Radial Glow Background */}
                    <div
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] -z-10 blur-[80px] opacity-40"
                        style={{
                            background: `radial-gradient(circle, ${planet.appearance.glowColor} 0%, transparent 70%)`,
                        }}
                    />

                    {/* Planet Glyph with Breathing Animation */}
                    <motion.div
                        className="flex justify-center mb-6"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={isActive ? {
                            opacity: 1,
                            scale: 1
                        } : {
                            opacity: 0.5,
                            scale: 0.9
                        }}
                        transition={{ duration: 0.5, ease: APPLE_EASE }}
                    >
                        <motion.div
                            animate={isActive ? {
                                scale: [1, 1.03, 1]
                            } : {
                                scale: 1
                            }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        >
                            <PlanetGlyph
                                icon={planet.appearance.icon}
                                baseColor={planet.appearance.baseColor}
                                glowColor={planet.appearance.glowColor}
                                size={140}
                            />
                        </motion.div>
                    </motion.div>

                    {/* Category Name (NO Devanagari) */}
                    <motion.div
                        className="text-center mb-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 5 }}
                        transition={{ duration: 0.3, delay: 0.15, ease: APPLE_EASE }}
                    >
                        <span
                            className="text-xs uppercase tracking-[0.2em] font-medium"
                            style={{ color: planet.appearance.baseColor }}
                        >
                            {planet.name}
                        </span>
                    </motion.div>

                    {/* Headline */}
                    <motion.h3
                        className="font-serif text-xl text-center mb-4 text-white leading-tight tracking-tight"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.5, y: 5 }}
                        transition={{ duration: 0.3, delay: 0.25, ease: APPLE_EASE }}
                    >
                        {planet.content.headline}
                    </motion.h3>

                    {/* Description */}
                    <motion.p
                        className="text-sm text-center text-white/70 leading-relaxed mb-6 line-clamp-3"
                        initial={{ opacity: 0, y: 10 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 5 }}
                        transition={{ duration: 0.3, delay: 0.35, ease: APPLE_EASE }}
                    >
                        {planet.content.description}
                    </motion.p>

                    {/* Activities Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.3, y: 5 }}
                        transition={{ duration: 0.3, delay: 0.45, ease: APPLE_EASE }}
                    >
                        {/* Featured Activities Label */}
                        <h4 className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-3 text-center font-semibold">
                            Featured Activities
                        </h4>

                        {/* Activity Pills — EXACT Desktop Styling */}
                        <div className="flex flex-wrap gap-2 justify-center">
                            {planet.content.activities.map((activity, i) => (
                                <motion.span
                                    key={activity}
                                    className="px-3 py-1.5 rounded-full text-xs border transition-all"
                                    style={{
                                        borderColor: `${planet.appearance.baseColor}40`,
                                        color: planet.appearance.baseColor,
                                        backgroundColor: `${planet.appearance.baseColor}10`,
                                    }}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={isActive ? {
                                        opacity: 1,
                                        scale: 1
                                    } : {
                                        opacity: 0.4,
                                        scale: 0.95
                                    }}
                                    transition={{
                                        duration: 0.2,
                                        delay: 0.5 + i * 0.03,
                                        ease: APPLE_EASE,
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {activity}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        )
    }
)

PillarCard.displayName = 'PillarCard'

export default PillarCard
