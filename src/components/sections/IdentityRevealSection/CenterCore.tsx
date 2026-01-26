'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { calculateCoreRadius, calculatePlanetSize } from '@/lib/orbital-math'

/**
 * CenterCore - The pulsing EKATVA center (Refactored for Golden Ratio Sizing)
 *
 * Features:
 * - Dynamic Sizing: r = PlanetSize * 1.618 (φ)
 * - Pulsing glow animation (2s loop)
 * - Core circle with gradient
 * - "एकत्व" in Devanagari
 * - "EKATVA" subtitle
 * - "One Movement, Three Expressions" tagline
 */
interface CenterCoreProps {
    cx: number
    cy: number
}

export default function CenterCore({ cx, cy }: CenterCoreProps) {
    // Golden ratio based sizing - responsive to viewport
    // Default to Desktop: 100px planet -> 162px core
    const [coreRadius, setCoreRadius] = useState(162)

    useEffect(() => {
        const updateCoreSize = () => {
            const planetSize = calculatePlanetSize(window.innerWidth)
            const newCoreRadius = calculateCoreRadius(planetSize)
            setCoreRadius(newCoreRadius)
        }

        updateCoreSize()
        window.addEventListener('resize', updateCoreSize)
        return () => window.removeEventListener('resize', updateCoreSize)
    }, [])

    return (
        <g>
            {/* Outer pulsing glow */}
            <motion.circle
                cx={cx}
                cy={cy}
                r={coreRadius * 1.5} // Scales proportionally
                fill="none"
                stroke="url(#centerGlow)"
                strokeWidth={2}
                initial={{ opacity: 0.3, scale: 0.9 }}
                animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.9, 1.05, 0.9],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{ transformOrigin: `${cx}px ${cy}px` }}
            />

            {/* Middle glow ring */}
            <motion.circle
                cx={cx}
                cy={cy}
                r={coreRadius * 1.25} // Scales proportionally
                fill="none"
                stroke="url(#centerGlow)"
                strokeWidth={1}
                initial={{ opacity: 0.2 }}
                animate={{
                    opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                }}
            />

            {/* Core background glow */}
            <circle
                cx={cx}
                cy={cy}
                r={coreRadius}
                fill="url(#coreGradient)"
                filter="url(#coreGlow)"
            />

            {/* Core circle */}
            <circle
                cx={cx}
                cy={cy}
                r={coreRadius}
                fill="rgba(5, 5, 5, 0.9)"
                stroke="#5CE6C9"
                strokeWidth={2}
            />

            {/* Devanagari text - एकत्व */}
            <text
                x={cx}
                y={cy - 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#5CE6C9"
                fontSize="32"
                fontWeight="bold"
                style={{
                    textShadow: '0 0 20px rgba(92, 230, 201, 0.6)',
                    fontFamily: 'serif',
                }}
            >
                एकत्व
            </text>

            {/* English name */}
            <text
                x={cx}
                y={cy + 22}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="14"
                fontWeight="600"
                letterSpacing="0.15em"
            >
                EKATVA
            </text>

            {/* Tagline (Dynamic positioning) */}
            <text
                x={cx}
                y={cy + coreRadius * 1.3} // Tightened from 1.375
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255, 255, 255, 0.6)"
                fontSize="12"
                fontWeight="400"
                letterSpacing="0.1em"
            >
                One Movement, Three Expressions
            </text>

            {/* SVG Defs for gradients and filters */}
            <defs>
                <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#5CE6C9" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#5CE6C9" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(92, 230, 201, 0.15)" />
                    <stop offset="100%" stopColor="rgba(5, 5, 5, 0.9)" />
                </radialGradient>

                <filter id="coreGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="15" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        </g>
    )
}
