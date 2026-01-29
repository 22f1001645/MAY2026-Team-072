'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon, ChevronDown } from 'lucide-react'

interface AtomicTruthCardProps {
    principle: string
    title: string
    subtitle: string
    description: string
    color: 'teal' | 'gold' | 'coral'
    icon: LucideIcon
}

const colorConfig = {
    teal: {
        bg: 'rgba(92, 230, 201, 0.1)',
        border: '#5CE6C9',
        glow: 'rgba(92, 230, 201, 0.3)',
    },
    gold: {
        bg: 'rgba(255, 207, 150, 0.1)',
        border: '#FFCF96',
        glow: 'rgba(255, 207, 150, 0.3)',
    },
    coral: {
        bg: 'rgba(255, 107, 107, 0.1)',
        border: '#FF6B6B',
        glow: 'rgba(255, 107, 107, 0.3)',
    },
}

/**
 * Atomic Truth Card — Simplified
 * 
 * Structure:
 * - Icon (colored circle with Lucide icon)
 * - Title (serif, large)
 * - Subtitle (uppercase tracking)
 * - Accordion: Just the description inside
 */
export default function AtomicTruthCard({
    title,
    subtitle,
    description,
    color,
    icon: Icon,
}: AtomicTruthCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const colors = colorConfig[color]

    return (
        <motion.div
            className="relative rounded-2xl p-5 cursor-pointer"
            style={{
                background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(255,255,255,0.02) 100%)`,
                border: `1px solid rgba(255,255,255,0.08)`,
                backdropFilter: 'blur(20px)',
            }}
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            {/* Radial Glow */}
            <div
                className="absolute inset-0 -z-10 blur-[60px] opacity-40 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`,
                }}
            />

            {/* Header: Icon + Title + Subtitle + Chevron */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: colors.border }}
                    >
                        <Icon className="w-7 h-7 text-black/80" strokeWidth={1.5} />
                    </div>

                    {/* Title + Subtitle */}
                    <div>
                        <h4 className="font-serif text-xl font-medium text-white tracking-tight">
                            {title}
                        </h4>
                        <p className="text-[10px] text-white/50 uppercase tracking-[0.15em] mt-0.5">
                            {subtitle}
                        </p>
                    </div>
                </div>

                {/* Chevron */}
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronDown className="w-5 h-5 text-white/40" />
                </motion.div>
            </div>

            {/* Expanded Content — Just the description */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <p className="pt-4 text-sm text-white/75 leading-relaxed">
                            {description}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
