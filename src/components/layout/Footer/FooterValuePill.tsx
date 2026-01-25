'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

interface FooterValuePillProps {
    value: string
    theme: 'teal' | 'gold'
    description?: string
    delay?: number
}

export default function FooterValuePill({
    value,
    theme,
    description,
    delay = 0
}: FooterValuePillProps) {
    const [isHovered, setIsHovered] = useState(false)

    const themeColors = {
        teal: {
            border: 'border-ekatva-teal/30',
            hoverBorder: 'border-ekatva-teal',
            text: 'text-ekatva-teal/70',
            hoverText: 'text-ekatva-teal',
            glow: 'shadow-[0_0_20px_rgba(92,230,201,0.3)]',
            bg: 'bg-ekatva-teal/5'
        },
        gold: {
            border: 'border-unity-gold/30',
            hoverBorder: 'border-unity-gold',
            text: 'text-unity-gold/70',
            hoverText: 'text-unity-gold',
            glow: 'shadow-[0_0_20px_rgba(255,207,150,0.3)]',
            bg: 'bg-unity-gold/5'
        }
    }

    const colors = themeColors[theme]

    return (
        <div className="relative group">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                    duration: 0.5,
                    delay,
                    ease: 'easeOut'
                }}
                whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.2 }
                }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className={`
          relative px-6 py-2.5 rounded-full border cursor-pointer
          transition-all duration-300
          ${isHovered ? colors.hoverBorder : colors.border}
          ${isHovered ? colors.bg : 'bg-transparent'}
          ${isHovered ? colors.glow : ''}
        `}
            >
                <span className={`
          text-[13px] font-medium tracking-wider uppercase
          transition-colors duration-300
          ${isHovered ? colors.hoverText : colors.text}
        `}>
                    {value}
                </span>

                {/* Subtle floating animation */}
                <motion.div
                    className="absolute inset-0"
                    animate={{
                        y: [0, -4, 0]
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: delay
                    }}
                />
            </motion.div>

            {/* Tooltip (optional) */}
            {description && isHovered && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 
                     px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-md
                     text-white/80 text-xs whitespace-nowrap z-50
                     pointer-events-none border border-white/20"
                >
                    {description}
                </motion.div>
            )}
        </div>
    )
}
