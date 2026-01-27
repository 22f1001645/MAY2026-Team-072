'use client'

import { motion } from 'framer-motion'
import { CityData, STATUS_COLORS, STATUS_SIZES, MAP_VIEWBOX } from '@/data/cities'
import { useState } from 'react'

/**
 * CityMarker - Interactive City Dot with Animations
 * 
 * Features:
 * - 3 visual states (completed/confirmed/exploring)
 * - Glow effects and pulse animation
 * - Hover syncs with legend
 * - Optional label display
 */
interface CityMarkerProps {
    city: CityData
    isAnimating: boolean
    isHovered: boolean
    isHighlighted?: boolean // Sync with legend hover
    onHover: (cityId: string | null) => void
    onClick: (cityId: string) => void
    isMobile: boolean
    showLabel?: boolean // Control label visibility
}

export default function CityMarker({
    city,
    isAnimating,
    isHovered,
    isHighlighted = false,
    onHover,
    onClick,
    isMobile,
    showLabel = true
}: CityMarkerProps) {
    const [showTooltip, setShowTooltip] = useState(false)

    const color = STATUS_COLORS[city.status]
    const sizes = STATUS_SIZES[city.status]
    const isCompleted = city.status === 'completed'
    const isActive = isHovered || isHighlighted

    // Calculate position as percentage of viewBox
    const leftPercent = (city.coordinates.x / MAP_VIEWBOX.width) * 100
    const topPercent = (city.coordinates.y / MAP_VIEWBOX.height) * 100

    const handleMouseEnter = () => {
        if (!isMobile) {
            setShowTooltip(true)
            onHover(city.id)
        }
    }

    const handleMouseLeave = () => {
        if (!isMobile) {
            setShowTooltip(false)
            onHover(null)
        }
    }

    const handleClick = () => {
        onClick(city.id)
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={isAnimating ? {
                opacity: 1,
                scale: 1
            } : {}}
            transition={{
                delay: city.revealDelay,
                duration: 0.5,
                ease: [0.34, 1.56, 0.64, 1]
            }}
            className="absolute cursor-pointer z-30"
            style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: 'translate(-50%, -50%)'
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label={`${city.name}: ${city.description}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleClick()
                }
            }}
        >
            {/* Outer glow ring - only pulses on hover/active, NOT auto for completed */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    width: isActive ? sizes.glow * 2.5 : sizes.glow * 2,
                    height: isActive ? sizes.glow * 2.5 : sizes.glow * 2,
                    background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)'
                }}
                animate={isActive ? {
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0.9, 0.5]
                } : {
                    opacity: isCompleted ? 0.5 : 0.35
                }}
                transition={isActive ? {
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut'
                } : {
                    duration: 0.3
                }}
            />

            {/* Main dot with enhanced glow when highlighted */}
            <motion.div
                className="relative rounded-full"
                style={{
                    width: sizes.dot * 2,
                    height: sizes.dot * 2,
                    backgroundColor: color,
                    boxShadow: isActive
                        ? `0 0 20px ${color}, 0 0 40px ${color}, 0 0 60px ${color}80`
                        : `0 0 12px ${color}, 0 0 24px ${color}60`
                }}
                animate={isActive ? { scale: 1.3 } : { scale: 1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
            />

            {/* City name label - conditionally shown */}
            {showLabel && (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={isAnimating ? {
                        opacity: isActive ? 1 : 0.8,
                        y: 0
                    } : {}}
                    transition={{
                        delay: city.revealDelay + 0.3,
                        duration: 0.4
                    }}
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                    style={{
                        top: `${sizes.dot * 2 + 8}px`
                    }}
                >
                    <span
                        className="text-[10px] font-bold tracking-wider uppercase"
                        style={{
                            color: color,
                            textShadow: `0 0 10px ${color}, 0 2px 4px rgba(0,0,0,0.8)`,
                            opacity: isActive ? 1 : 0.75
                        }}
                    >
                        {city.name}
                    </span>
                </motion.div>
            )}

            {/* Tooltip - Desktop hover only */}
            {showTooltip && !isMobile && (
                <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute z-50 pointer-events-none"
                    style={{
                        bottom: `${sizes.glow * 2 + 16}px`,
                        left: '50%',
                        transform: 'translateX(-50%)'
                    }}
                >
                    <div
                        className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl px-4 py-3 whitespace-nowrap"
                        style={{
                            borderLeft: `4px solid ${color}`,
                            minWidth: '160px'
                        }}
                    >
                        <div
                            className="text-sm font-bold"
                            style={{ color: '#0E2F36' }}
                        >
                            {city.name}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                            {city.description}
                        </div>
                        {city.studentCount && (
                            <div className="text-xs font-semibold mt-1.5" style={{ color }}>
                                {city.studentCount}+ Students
                            </div>
                        )}
                    </div>

                    {/* Tooltip arrow */}
                    <div
                        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                        style={{
                            bottom: '-6px',
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '6px solid rgba(255, 255, 255, 0.95)'
                        }}
                    />
                </motion.div>
            )}
        </motion.div>
    )
}
