'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useOrbitalStore, PlanetState } from '@/store/orbitalStore'
import { easeOut } from '@/lib/animations'

// Constant to prevent array recreation every frame
const DASH_ANIMATION = [0, 16]

/**
 * OrbitTrails - PRODUCTION VERSION (Optimized & Refined)
 *
 * Animation Philosophy:
 * - Subtle breathing effect that enhances without overwhelming
 * - Reduced opacity: 0.05/0.10 for refined visual hierarchy (was 0.08/0.2)
 * - Crisp edges: 5px blur provides soft glow while maintaining definition
 * - Natural motion: Material Design cubic-bezier(0.4, 0, 0.2, 1) for organic easing
 * - Accessibility: Respects prefers-reduced-motion for inclusive experience
 *
 * Layer Hierarchy:
 * - Outer Glow: Ambient presence - barely visible at rest, gentle emphasis on hover
 * - Main Trail: Primary visual element - clear path definition with smooth easing
 * - Inner Highlight: Depth enhancement - adds dimensionality without distraction
 */
interface OrbitTrailsProps {
    planets: PlanetState[]
    centerX: number
    centerY: number
    scale: number
}

export default function OrbitTrails({ planets, centerX, centerY, scale }: OrbitTrailsProps) {
    const { hoveredPlanetId } = useOrbitalStore()
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    // Detect Reduced Motion Preference
    useEffect(() => {
        if (typeof window === 'undefined') return

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        setPrefersReducedMotion(mediaQuery.matches)

        const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
        mediaQuery.addEventListener('change', handleChange)

        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    return (
        <g>
            {planets.map((planet) => {
                const isHovered = hoveredPlanetId === planet.id
                const scaledRadius = planet.orbital.radius * scale

                // Calculate ellipse axes
                const rx = scaledRadius * (1 + planet.orbital.eccentricity * 0.5)
                const ry = scaledRadius * (1 - planet.orbital.eccentricity * 0.3)

                return (
                    <g key={planet.id}>
                        {/* Outer glow layer - Ambient presence
                            Barely visible at rest (0.05), gentle emphasis on hover (0.10)
                            Crisp 5px blur for refined aesthetic without harsh edges
                        */}
                        <motion.ellipse
                            cx={centerX}
                            cy={centerY}
                            rx={rx + 6}
                            ry={ry + 6}
                            fill="none"
                            stroke={planet.appearance.baseColor}
                            strokeWidth={6}
                            animate={{
                                opacity: prefersReducedMotion
                                    ? 0.05
                                    : (isHovered ? 0.10 : 0.05)
                            }}
                            transition={{
                                opacity: { duration: 0.5, ease: easeOut }
                            }}
                            style={{
                                filter: 'blur(5px)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Main orbit trail - Primary visual element
                            Clear path definition with smooth color transitions
                            Dashed when idle, solid on hover with subtle glow
                        */}
                        <motion.ellipse
                            cx={centerX}
                            cy={centerY}
                            rx={rx}
                            ry={ry}
                            fill="none"
                            stroke={isHovered ? planet.appearance.baseColor : 'rgba(255, 255, 255, 0.6)'}
                            strokeWidth={isHovered ? 4 : 3}
                            strokeDasharray={isHovered ? '0' : '10 5'}
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: 1,
                                strokeDashoffset: prefersReducedMotion
                                    ? 0
                                    : (isHovered ? 0 : DASH_ANIMATION),
                            }}
                            transition={{
                                opacity: { duration: 0.5, ease: easeOut },
                                strokeDashoffset: prefersReducedMotion
                                    ? { duration: 0 }
                                    : {
                                        duration: 20,
                                        repeat: Infinity,
                                        ease: 'linear',
                                    }
                            }}
                            style={{
                                filter: isHovered
                                    ? `drop-shadow(0 0 8px ${planet.appearance.glowColor})`
                                    : 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.25))',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Inner highlight - Depth enhancement
                            Adds subtle dimensionality without distraction
                            Very gentle opacity shift on hover (0.2 → 0.35)
                        */}
                        <motion.ellipse
                            cx={centerX}
                            cy={centerY}
                            rx={rx - 1.5}
                            ry={ry - 1.5}
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.15)"
                            strokeWidth={1}
                            animate={{
                                opacity: prefersReducedMotion
                                    ? 0.2
                                    : (isHovered ? 0.35 : 0.2)
                            }}
                            transition={{
                                opacity: { duration: 0.5, ease: easeOut }
                            }}
                            style={{ pointerEvents: 'none' }}
                        />
                    </g>
                )
            })}
        </g>
    )
}
