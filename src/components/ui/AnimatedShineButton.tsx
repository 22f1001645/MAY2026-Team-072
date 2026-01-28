'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

/**
 * AnimatedShineButton - Premium CTA with shine animation
 * 
 * Features:
 * - Text shine sweep (diagonal mask animation)
 * - Surface polish sweep (synced timing)
 * - Spring physics for interactions
 * - EKATVA teal gradient styling
 */

interface AnimatedShineButtonProps {
    children: React.ReactNode
    href: string
    className?: string
    showArrow?: boolean
}

export default function AnimatedShineButton({
    children,
    href,
    className,
    showArrow = true
}: AnimatedShineButtonProps) {
    return (
        <Link href={href} className="inline-block">
            <motion.span
                whileTap={{ scale: 0.97 }}
                whileHover={{ y: -2 }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 17,
                }}
                className={cn(
                    'relative inline-flex items-center justify-center gap-2',
                    'px-8 py-4 rounded-full overflow-hidden cursor-pointer',
                    'bg-gradient-to-br from-[#5CE6C9] to-[#4DD4B7]',
                    'text-[#050505] font-bold text-sm tracking-wide',
                    'shadow-[0_4px_20px_rgba(92,230,201,0.35),0_0_30px_rgba(92,230,201,0.15)]',
                    'hover:shadow-[0_8px_30px_rgba(92,230,201,0.5),0_0_50px_rgba(92,230,201,0.25)]',
                    'transition-shadow duration-300',
                    className
                )}
            >
                {/* Text with shine sweep */}
                <motion.span
                    className="relative z-10 flex items-center gap-2"
                    style={{
                        WebkitMaskImage: 'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
                        maskImage: 'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
                    }}
                    initial={{ '--mask-x': '100%' } as any}
                    animate={{ '--mask-x': '-100%' } as any}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear', repeatDelay: 2 }}
                >
                    {children}
                    {showArrow && <ArrowRight size={16} strokeWidth={2.5} />}
                </motion.span>

                {/* Surface shine sweep */}
                <motion.span
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                        background: 'linear-gradient(-75deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                    }}
                    initial={{ backgroundPosition: '100% 0', opacity: 0 }}
                    animate={{ backgroundPosition: ['-50% 0', '-150% 0'], opacity: [0, 0.6, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                />
            </motion.span>
        </Link>
    )
}
