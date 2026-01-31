'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import CountUp from 'react-countup'
import { cn } from '@/lib/utils'
import { fadeInUp } from '@/lib/animations'
import type { StatCardProps } from '@/types'

/**
 * StatCard - Antigravity Refactor
 * 
 * Features:
 * - Balanced Typography: Goldilocks scale.
 * - Concise Padding: No extra "safety" buffers.
 * - Label Safety: Prevent wrapping/overflow.
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
                y: -5,
                scale: 1.02,
                transition: { duration: 0.3, ease: 'easeOut' }
            }}
            viewport={{ once: true, amount: 0.5 }}
            className={cn(
                'flex flex-col items-center justify-center text-center',
                // Symmetric Padding - Removed "Safety" buffer
                'p-[clamp(1rem,1.5vh,1.5rem)]',
                'rounded-2xl',
                'border border-divider-gray/40',
                borderHoverClasses[color],
                'transition-all duration-300',
                'cursor-default h-full',
                className
            )}
            style={{
                background: `linear-gradient(135deg, 
                    rgba(31, 79, 89, 0.25) 0%, 
                    rgba(14, 47, 54, 0.3) 100%
                )`,
                backdropFilter: 'blur(10px)',
            }}
        >
            {/* Animated Number */}
            <p
                className={cn(
                    'font-serif font-bold leading-none mb-2',
                    'text-[clamp(2rem,3.5vw,3.5rem)] tracking-tight',
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
                            return c * (1 - Math.pow(1 - t / d, 3)) + b
                        }}
                    />
                ) : (
                    '0'
                )}
                {suffix}
            </p>

            {/* Label - Responsive wrapping with controlled spacing */}
            <p className="text-[clamp(0.55rem,1.2vw,0.8rem)] text-light-gray uppercase tracking-[0.08em] font-semibold leading-[1.2] whitespace-normal text-center max-w-[180px] mx-auto">
                {label}
            </p>
        </motion.div>
    )
}
