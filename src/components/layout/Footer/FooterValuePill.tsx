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
            border: 'border-[#5CE6C9]/20',
            hoverBorder: 'border-[#5CE6C9]/60',
            text: 'text-[#5CE6C9]/80',
            hoverText: 'text-[#5CE6C9]',
            bg: 'bg-gradient-to-br from-[#5CE6C9]/5 to-transparent',
            hoverBg: 'bg-gradient-to-br from-[#5CE6C9]/10 to-[#5CE6C9]/5',
            glow: 'shadow-[0_8px_32px_rgba(92,230,201,0.15)]',
            ring: 'ring-1 ring-[#5CE6C9]/20'
        },
        gold: {
            border: 'border-[#FFCF96]/20',
            hoverBorder: 'border-[#FFCF96]/60',
            text: 'text-[#FFCF96]/80',
            hoverText: 'text-[#FFCF96]',
            bg: 'bg-gradient-to-br from-[#FFCF96]/5 to-transparent',
            hoverBg: 'bg-gradient-to-br from-[#FFCF96]/10 to-[#FFCF96]/5',
            glow: 'shadow-[0_8px_32px_rgba(255,207,150,0.15)]',
            ring: 'ring-1 ring-[#FFCF96]/20'
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
                    y: -2,
                    scale: 1.02,
                    transition: { type: "spring", stiffness: 400, damping: 20 }
                }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className={`
          relative px-8 py-3.5 rounded-2xl border-2 cursor-pointer
          backdrop-blur-xl transition-all duration-300
          ${isHovered ? colors.hoverBorder : colors.border}
          ${isHovered ? colors.hoverBg : colors.bg}
          ${isHovered ? colors.glow : ''}
          ${isHovered ? colors.ring : ''}
        `}
            >
                <span className={`
          text-[15px] md:text-[15px] font-medium tracking-[0.05em] capitalize
          transition-colors duration-300
          ${isHovered ? colors.hoverText : colors.text}
        `}>
                    {value}
                </span>

                {/* Floating animation synchronized to 6s master cycle */}
                <motion.div
                    className="absolute inset-0"
                    animate={{
                        y: [0, -6, 0],
                        rotate: [0, 0.5, 0]
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: delay * 0.5
                    }}
                />
            </motion.div>

            {/* Enhanced Tooltip */}
            {description && isHovered && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="absolute -top-14 left-1/2 transform -translate-x-1/2
                     px-4 py-3 bg-white/98 backdrop-blur-2xl rounded-md
                     border border-white/40 shadow-2xl
                     min-w-[180px] max-w-[240px] z-50
                     pointer-events-none"
                >
                    <p className="text-gray-900 font-medium text-sm leading-relaxed text-center">
                        {description}
                    </p>
                    {/* Arrow pointer */}
                    <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 rotate-45 bg-white/98 border-r border-b border-white/40" />
                </motion.div>
            )}
        </div>
    )
}
