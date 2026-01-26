'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import CountUp from 'react-countup'
import { cn } from '@/lib/utils'
import { fadeInUp } from '@/lib/animations'
import type { StatCardProps } from '@/types'

/**
 * StatCard - Award-Winning Design (Phase 2)
 * 
 * Features:
 * - Animated counting numbers on scroll-in
 * - Responsive serif font
 * - Glass background with gradient
 * - Hover lift effect with glow
 */
export default function StatCard({
    value,
    label,
    color = 'teal',
    className
}: StatCardProps) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.5 })
    const [hasAnimated, setHasAnimated] = useState(false)

    // Parse the value to extract number and suffix
    const parseValue = (val: string): { number: number; suffix: string; prefix: string } => {
        const match = val.match(/^([^\d]*)(\d[\d,]*)(.*)$/)
        if (match) {
            const prefix = match[1] || ''
            const numStr = match[2].replace(/,/g, '')
            const suffix = match[3] || ''
            return { number: parseInt(numStr, 10), suffix, prefix }
        }
        return { number: 0, suffix: '', prefix: '' }
    }

    const { number, suffix, prefix } = parseValue(String(value))

    useEffect(() => {
        if (isInView && !hasAnimated) {
            setHasAnimated(true)
        }
    }, [isInView, hasAnimated])

    const colorClasses = {
        teal: 'text-ekatva-teal',
        gold: 'text-unity-gold',
        white: 'text-white',
    }

    const glowStyles = {
        teal: { textShadow: '0 0 40px rgba(92, 230, 201, 0.4)' },
        gold: { textShadow: '0 0 40px rgba(255, 207, 150, 0.4)' },
        white: { textShadow: '0 0 30px rgba(255, 255, 255, 0.3)' },
    }

    const borderHoverClasses = {
        teal: 'hover:border-ekatva-teal/50',
        gold: 'hover:border-unity-gold/50',
        white: 'hover:border-white/50',
    }

    return (
        <motion.div
            ref={ref}
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            whileHover={{
                y: -4,
                scale: 1.02,
                transition: { duration: 0.3, ease: 'easeOut' }
            }}
            viewport={{ once: true, amount: 0.5 }}
            className={cn(
                'text-center p-[clamp(0.75rem,2vh,1.5rem)]',
                'rounded-xl md:rounded-2xl',
                'border border-white/20', // Brighter border for distinct glass effect
                borderHoverClasses[color],
                'transition-all duration-300',
                'cursor-default',
                className
            )}
            style={{
                background: `linear-gradient(135deg,
                    rgba(31, 79, 89, 0.3) 0%,
                    rgba(14, 47, 54, 0.35) 100%
                )`,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
            }}
        >
            {/* Animated Number - Medium-Large sweet spot with tight tracking */}
            <p
                className={cn(
                    'font-serif text-[clamp(2rem,3.5vw,3.5rem)] font-bold tracking-tight mb-0.5',
                    colorClasses[color]
                )}
                style={glowStyles[color]}
            >
                {prefix}
                {hasAnimated ? (
                    <CountUp
                        end={number}
                        duration={2.5}
                        separator=","
                        useEasing={true}
                        easingFn={(t, b, c, d) => {
                            // Custom easing: ease out cubic
                            return c * (1 - Math.pow(1 - t / d, 3)) + b
                        }}
                    />
                ) : (
                    '0'
                )}
                {suffix}
            </p>

            {/* Label - Small, crisp, uppercase - Number is the hero */}
            <p className="text-[clamp(0.6rem,0.75vw,0.875rem)] text-light-gray uppercase tracking-[0.15em] font-semibold whitespace-nowrap">
                {label}
            </p>
        </motion.div>
    )
}
