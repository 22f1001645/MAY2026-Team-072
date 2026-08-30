import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface PlanetGlyphProps {
    icon: LucideIcon
    baseColor: string
    glowColor: string
    size?: number
}

/**
 * Planet Glyph Component
 * Renders a planet icon with radial glow and breathing animation
 * Used in book pages to represent the three pillars
 */
export default function PlanetGlyph({
    icon: Icon,
    baseColor,
    glowColor,
    size = 120
}: PlanetGlyphProps) {
    return (
        <motion.div
            className="relative mb-8"
            animate={{
                scale: [1, 1.05, 1],
            }}
            transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            {/* Radial Glow */}
            <div
                className="absolute inset-0 -z-10 blur-[40px] opacity-30"
                style={{
                    background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
                }}
            />

            {/* Icon Circle */}
            <div
                className="rounded-full flex items-center justify-center"
                style={{
                    width: size,
                    height: size,
                    backgroundColor: baseColor,
                }}
            >
                <Icon
                    className="text-black/80"
                    size={size * 0.5}
                    strokeWidth={1.5}
                />
            </div>
        </motion.div>
    )
}
