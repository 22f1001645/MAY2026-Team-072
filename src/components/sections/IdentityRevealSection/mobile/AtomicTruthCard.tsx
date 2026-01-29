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
 * Atomic Truth Card
 * Expandable card for core EKATVA philosophies
 * Features glassmorphism, radial glows, and smooth expand/collapse
 */
export default function AtomicTruthCard({
    principle,
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
            className="relative rounded-2xl p-6 cursor-pointer"
            style={{
                background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(255,255,255,0.02) 100%)`,
                border: `1px solid rgba(255,255,255,0.08)`,
                backdropFilter: 'blur(20px)',
            }}
            onClick={() => setIsExpanded(!isExpanded)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Radial Glow */}
            <div
                className="absolute inset-0 -z-10 blur-[60px] opacity-40 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`,
                }}
            />

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div
                        className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: colors.border }}
                    >
                        <Icon className="w-7 h-7 text-black/80" strokeWidth={1.5} />
                    </div>

                    {/* Title */}
                    <div>
                        <h4 className="font-serif text-xl font-bold text-white tracking-tight">
                            {title}
                        </h4>
                        <p className="text-xs text-white/60 uppercase tracking-wider mt-0.5">
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

            {/* Description (Always Visible) */}
            <p className="text-sm text-white/75 leading-relaxed mb-4">
                {description}
            </p>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4 border-t border-white/10">
                            {/* Extended philosophy - pulling from desktop Core data */}
                            <div className="space-y-3 text-sm text-white/80 leading-relaxed">
                                {principle === 'unity' && (
                                    <>
                                        <p>
                                            <strong className="text-white/90">The Foundation:</strong> EKATVA began as a simple idea—what if 34,000+ IITM BS students, scattered across India, could come together? Not just as individuals, but as one unified force.
                                        </p>
                                        <p>
                                            <strong className="text-white/90">The Reality:</strong> In 2025, we proved it's possible. From Hyderabad to the national stage, we've built a community where distance dissolves and unity emerges. One platform, one ambition, one identity: EKATVA.
                                        </p>
                                    </>
                                )}
                                {principle === 'imagination' && (
                                    <>
                                        <p>
                                            <strong className="text-white/90">Beyond Code:</strong> Innovation isn't just about algorithms and frameworks. It's about daring to imagine what doesn't exist yet—and then building it with your bare hands.
                                        </p>
                                        <p>
                                            <strong className="text-white/90">The EKATVA Way:</strong> From hackathons that push technical limits to cultural performances that defy gravity, we thrive at the intersection where logic meets magic. Where engineers become artists, and artists become engineers.
                                        </p>
                                    </>
                                )}
                                {principle === 'glory' && (
                                    <>
                                        <p>
                                            <strong className="text-white/90">Competitive Spirit:</strong> We don't shy away from competition. We seek it out. Whether it's a cricket match, a coding battle, or a dance-off, we bring intensity and precision.
                                        </p>
                                        <p>
                                            <strong className="text-white/90">The Reward:</strong> Glory isn't just about trophies. It's the collective roar of 34,000 students when one of us wins. It's the shared pride that comes from knowing we pushed each other to be better.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
