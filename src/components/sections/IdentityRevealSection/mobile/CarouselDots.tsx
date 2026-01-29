'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

/**
 * CarouselDots — Navigation indicator for Mobile Pillars Carousel
 * 
 * Features:
 * - Active dot expands with pillar-specific color
 * - Inactive dots are subtle white/30
 * - Click any dot to scroll to that card
 * - Smooth width transition for premium feel
 */

interface CarouselDotsProps {
    currentIndex: number
    total: number
    colors: string[]
    onDotClick?: (index: number) => void
}

export default function CarouselDots({
    currentIndex,
    total,
    colors,
    onDotClick,
}: CarouselDotsProps) {
    return (
        <div className="flex justify-center items-center gap-3 mt-8">
            {Array.from({ length: total }).map((_, index) => {
                const isActive = currentIndex === index

                return (
                    <motion.button
                        key={index}
                        onClick={() => onDotClick?.(index)}
                        className={cn(
                            "h-2 rounded-full transition-all duration-300 ease-out",
                            isActive ? "w-8" : "w-2 bg-white/30 hover:bg-white/50"
                        )}
                        style={isActive ? {
                            backgroundColor: colors[index]
                        } : undefined}
                        whileHover={{ scale: isActive ? 1 : 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Go to slide ${index + 1}`}
                        aria-current={isActive ? 'true' : 'false'}
                    />
                )
            })}
        </div>
    )
}
