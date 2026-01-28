'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import './premiumCTA.css'

/**
 * PremiumCTAButton - Award-Winning 7-Layer Animation Button
 * 
 * Layers:
 * 1. Breathing Glow Aura - Floating/depth feel
 * 2. Border Light Runner - Energy/portal effect
 * 3. Core Button Surface - Gradient with depth
 * 4. Surface Shine Sweep - Polish effect
 * 5. Text with Shine - Reveal animation
 * 6. Arrow Animation - Hover bounce
 * 7. Particle Sparkles - Hover magic
 */

interface PremiumCTAButtonProps {
    children: React.ReactNode
    href: string
    className?: string
}

interface Particle {
    id: number
    x: number
    y: number
    angle: number
    speed: number
    size: number
    opacity: number
}

export default function PremiumCTAButton({
    children,
    href,
    className
}: PremiumCTAButtonProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [particles, setParticles] = useState<Particle[]>([])
    const buttonRef = useRef<HTMLSpanElement>(null)
    const particleIdRef = useRef(0)

    // Spawn particles on hover
    useEffect(() => {
        if (!isHovered) {
            setParticles([])
            return
        }

        const spawnParticle = () => {
            const newParticle: Particle = {
                id: particleIdRef.current++,
                x: 50 + (Math.random() - 0.5) * 40, // Center with some variance
                y: 50 + (Math.random() - 0.5) * 20,
                angle: Math.random() * 360,
                speed: 30 + Math.random() * 20,
                size: 2 + Math.random() * 3,
                opacity: 0.6 + Math.random() * 0.4
            }
            setParticles(prev => [...prev.slice(-7), newParticle]) // Max 8 particles
        }

        // Initial burst
        for (let i = 0; i < 4; i++) {
            setTimeout(() => spawnParticle(), i * 100)
        }

        // Continuous spawn
        const interval = setInterval(spawnParticle, 300)
        return () => clearInterval(interval)
    }, [isHovered])

    // Remove particles after animation
    useEffect(() => {
        if (particles.length === 0) return
        const timeout = setTimeout(() => {
            setParticles(prev => prev.slice(1))
        }, 1000)
        return () => clearTimeout(timeout)
    }, [particles])

    return (
        <Link href={href} className="inline-block">
            <motion.span
                ref={buttonRef}
                className={cn(
                    'premium-cta-button relative inline-flex items-center justify-center',
                    'cursor-pointer select-none',
                    className
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                whileTap={{ scale: 0.97 }}
                animate={{
                    y: isHovered ? -4 : 0,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                }}
            >
                {/* Layer 1: Breathing Glow Aura */}
                <motion.span
                    className="glow-aura absolute inset-0 rounded-full -z-20"
                    animate={{
                        scale: isHovered ? [1.3, 1.5, 1.3] : [1.2, 1.35, 1.2],
                        opacity: isHovered ? [0.5, 0.7, 0.5] : [0.3, 0.45, 0.3],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        background: 'radial-gradient(circle, rgba(92, 230, 201, 0.6) 0%, rgba(92, 230, 201, 0) 70%)',
                        filter: 'blur(20px)',
                    }}
                />

                {/* Layer 2: Border Light Runner */}
                <span className="border-runner-container absolute inset-0 rounded-full -z-10 overflow-hidden">
                    <span
                        className="border-runner absolute inset-[-2px] rounded-full"
                        style={{
                            background: `conic-gradient(
                                from var(--border-angle, 0deg),
                                transparent 0%,
                                transparent 25%,
                                rgba(255, 255, 255, 0.8) 30%,
                                rgba(92, 230, 201, 1) 35%,
                                transparent 40%,
                                transparent 100%
                            )`,
                            animation: 'borderRotate 3s linear infinite',
                        }}
                    />
                    {/* Inner mask to show only the border */}
                    <span
                        className="absolute inset-[2px] rounded-full bg-[#050505]"
                        style={{ zIndex: 1 }}
                    />
                </span>

                {/* Layer 3: Core Button Surface */}
                <motion.span
                    className="button-core relative z-10 inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #5CE6C9 0%, #4DD4B7 100%)',
                        boxShadow: isHovered
                            ? '0 8px 30px rgba(92, 230, 201, 0.5), 0 0 60px rgba(92, 230, 201, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                            : '0 4px 20px rgba(92, 230, 201, 0.35), 0 0 30px rgba(92, 230, 201, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    }}
                    animate={{
                        boxShadow: isHovered
                            ? '0 8px 30px rgba(92, 230, 201, 0.5), 0 0 60px rgba(92, 230, 201, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
                            : '0 4px 20px rgba(92, 230, 201, 0.35), 0 0 30px rgba(92, 230, 201, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Layer 4: Surface Shine Sweep */}
                    <motion.span
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                            background: 'linear-gradient(-75deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                            backgroundSize: '200% 100%',
                        }}
                        initial={{ backgroundPosition: '100% 0', opacity: 0 }}
                        animate={{
                            backgroundPosition: ['-50% 0', '-150% 0'],
                            opacity: [0, 0.7, 0],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'linear',
                            repeatDelay: 2.5,
                        }}
                    />

                    {/* Layer 5: Text with Shine */}
                    <motion.span
                        className="relative z-20 flex items-center gap-2 text-[#050505] font-bold text-sm tracking-wide"
                        style={{
                            WebkitMaskImage: 'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
                            maskImage: 'linear-gradient(-75deg, white calc(var(--mask-x) + 20%), transparent calc(var(--mask-x) + 30%), white calc(var(--mask-x) + 100%))',
                        }}
                        initial={{ '--mask-x': '100%' } as any}
                        animate={{ '--mask-x': '-100%' } as any}
                        transition={{
                            repeat: Infinity,
                            duration: 1.5,
                            ease: 'linear',
                            repeatDelay: 2.5,
                        }}
                    >
                        {children}

                        {/* Layer 6: Arrow with Hover Animation */}
                        <motion.span
                            animate={{
                                x: isHovered ? 4 : 0,
                            }}
                            transition={{
                                type: 'spring',
                                stiffness: 300,
                                damping: 20,
                            }}
                        >
                            <ArrowRight size={16} strokeWidth={2.5} />
                        </motion.span>
                    </motion.span>
                </motion.span>

                {/* Layer 7: Particle Sparkles */}
                <span className="particles-container absolute inset-0 pointer-events-none overflow-visible z-30">
                    {particles.map((particle) => (
                        <motion.span
                            key={particle.id}
                            className="particle absolute rounded-full"
                            style={{
                                left: `${particle.x}%`,
                                top: `${particle.y}%`,
                                width: particle.size,
                                height: particle.size,
                                background: particle.id % 2 === 0
                                    ? 'rgba(92, 230, 201, 1)'
                                    : 'rgba(255, 255, 255, 0.9)',
                                boxShadow: particle.id % 2 === 0
                                    ? '0 0 6px rgba(92, 230, 201, 0.8)'
                                    : '0 0 4px rgba(255, 255, 255, 0.6)',
                            }}
                            initial={{
                                opacity: particle.opacity,
                                scale: 0,
                            }}
                            animate={{
                                opacity: 0,
                                scale: 1,
                                x: Math.cos(particle.angle * Math.PI / 180) * particle.speed,
                                y: Math.sin(particle.angle * Math.PI / 180) * particle.speed,
                            }}
                            transition={{
                                duration: 1,
                                ease: 'easeOut',
                            }}
                        />
                    ))}
                </span>
            </motion.span>
        </Link>
    )
}
