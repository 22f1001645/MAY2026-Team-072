'use client'

/**
 * STATS SECTION - EDITION PAGE
 * 
 * Impact statistics grid with:
 * - Animated stat cards
 * - Icons with brand colors
 * - Conditional headline based on status
 */

import { motion } from 'framer-motion'
import { Users, Clock, Trophy, Utensils, Bus, Route, Calendar, Award, Heart } from 'lucide-react'
import type { StatData, EditionStatus } from '@/types/edition'

interface StatsSectionProps {
    data: StatData[]
    status: EditionStatus
    city: string
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
    users: Users,
    clock: Clock,
    trophy: Trophy,
    food: Utensils,
    bus: Bus,
    route: Route,
    calendar: Calendar,
    groups: Award,
    award: Award,
    heart: Heart,
}

export function StatsSection({ data, status, city }: StatsSectionProps) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: 'easeOut' as const },
        },
    }

    return (
        <section className="stats-section">
            {/* Cinematic Divider - Transition from Hero */}
            <div className="w-[120px] h-[1px] bg-gradient-to-r from-transparent via-[#5CE6C9] to-transparent opacity-50 mx-auto mb-16 shadow-[0_0_15px_rgba(92,230,201,0.6)]" />

            <motion.h2
                className="section-headline"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                {status === 'completed'
                    ? 'The Numbers That Made It Real'
                    : 'What to Expect'}
            </motion.h2>

            <motion.div
                className="stats-grid"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
            >
                {data.map((stat, index) => {
                    const IconComponent = iconMap[stat.icon] || Users

                    return (
                        <motion.div
                            key={index}
                            className="stat-card"
                            variants={itemVariants}
                            style={{ '--stat-color': stat.color } as React.CSSProperties}
                        >
                            <div className="stat-icon">
                                <IconComponent size={32} color={stat.color} />
                            </div>
                            <div className="stat-value">{stat.value}</div>
                            <div className="stat-label">{stat.label}</div>
                            {stat.description && (
                                <p className="stat-description">{stat.description}</p>
                            )}
                        </motion.div>
                    )
                })}
            </motion.div>

            {status === 'upcoming' && (
                <motion.p
                    className="stats-note"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                >
                    *Projected numbers based on Hyderabad 2025 edition
                </motion.p>
            )}
        </section>
    )
}

export default StatsSection
