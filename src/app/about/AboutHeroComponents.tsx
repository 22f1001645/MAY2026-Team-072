'use client'

import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring, useVelocity, useAnimationFrame, useMotionValue, wrap } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ===========================================
// MARQUEE COMPONENT
// ===========================================
interface MarqueeProps {
    children: React.ReactNode
    baseVelocity?: number
    className?: string
}

export function HeroMarquee({ children, baseVelocity = 100, className }: MarqueeProps) {
    const baseX = useMotionValue(0)
    const { scrollY } = useScroll()
    const scrollVelocity = useVelocity(scrollY)
    const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
    const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })

    const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`)
    const directionFactor = useRef<number>(1)
    const containerRef = useRef<HTMLDivElement>(null)
    const isAnimating = useRef(false) // Use ref to avoid rerenders during scroll

    // PERFORMANCE OPTIMIZATION: Only animate when visible and tab is active
    // This saves CPU cycles when the marquee is off-screen
    useEffect(() => {
        if (!containerRef.current) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Determine if we should be animating
                // Only animate if intersecting AND document is visible
                const shouldAnimate = entry.isIntersecting && document.visibilityState === 'visible'
                isAnimating.current = shouldAnimate

                // If we become visible, we might want to "wake up" the animation loop
                // (framer-motion handles this primarily, but the ref gate helps our logic)
            },
            { threshold: 0.1 } // 10% visibility required
        )

        observer.observe(containerRef.current)

        // Also listen for visibility change (tab switch)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                isAnimating.current = false
            } else {
                // Re-check intersection status if we really wanted to be perfect, 
                // but usually just assuming we might be visible if we were before is okay,
                // or letting the observer trigger again. 
                // For safety/simplicity, we rely on IntersectionObserver remaining active 
                // or just letting the RAF loop run if visible.
                // A simpler RAF gate is:
                isAnimating.current = document.visibilityState === 'visible'
                // Note: Logic inside RAF is what matters most for CPU
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            observer.disconnect()
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    useAnimationFrame((t, delta) => {
        // PERFORMANCE GATING: Skip calculation if off-screen or hidden
        if (!isAnimating.current) return

        let moveBy = directionFactor.current * baseVelocity * (delta / 1000)

        // Change direction based on scroll (optional - keeps it dynamic)
        if (velocityFactor.get() < 0) { directionFactor.current = -1 }
        else if (velocityFactor.get() > 0) { directionFactor.current = 1 }

        moveBy += directionFactor.current * moveBy * velocityFactor.get()
        baseX.set(baseX.get() + moveBy)
    })

    return (
        <div
            ref={containerRef}
            className={cn("overflow-hidden whitespace-nowrap flex flex-nowrap absolute w-full", className)}
        >
            <motion.div
                className="flex flex-nowrap gap-16"
                style={{
                    x,
                    // GPU ACCELERATION HINTS
                    willChange: 'transform',
                    transform: 'translateZ(0)' // Force composite layer
                }}
            >
                {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className="flex-shrink-0">
                        {children}
                    </span>
                ))}
            </motion.div>
        </div>
    )
}

// ===========================================
// CIRCULAR SCROLL INDICATOR
// ===========================================
interface CircularScrollProps {
    onClick?: () => void
    className?: string
}

export function CircularScroll({ onClick, className }: CircularScrollProps) {
    return (
        <motion.div
            className={cn("relative cursor-pointer group z-20", className)}
            onClick={onClick}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 1 }}
            whileHover={{ scale: 1.1 }}
        >
            {/* Rotating Text Ring */}
            <motion.div
                className="w-32 h-32 md:w-36 md:h-36"
                animate={{ rotate: 360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            >
                <svg viewBox="0 0 100 100" className="w-full h-full fill-white/80">
                    <defs>
                        <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
                    </defs>
                    <text fontSize="11" className="font-mono uppercase tracking-[0.2em]">
                        <textPath xlinkHref="#circlePath">
                            SCROLL TO EXPLORE • SCROLL TO EXPLORE •
                        </textPath>
                    </text>
                </svg>
            </motion.div>

            {/* Static Center Arrow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <ArrowDown className="w-6 h-6 text-ekatva-teal" />
            </div>
        </motion.div>
    )
}
