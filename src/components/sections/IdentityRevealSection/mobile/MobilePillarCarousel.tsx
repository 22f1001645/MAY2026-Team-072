'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PLANET_CONFIGS } from '@/data/planets'
import PillarCard from './PillarCard'
import CarouselDots from './CarouselDots'

/**
 * MobilePillarCarousel — Award-Winning Auto-Play Carousel (v2.0)
 * 
 * SMART AUTO-PLAY SYSTEM:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - Starts when section is 50%+ in viewport
 * - 5-second interval per card
 * - Pauses on ANY user interaction (swipe, dot click)
 * - Resumes after 8 seconds of idle
 * - Stops completely when scrolled out of view
 * - Respects prefers-reduced-motion
 * 
 * PERFORMANCE:
 * - IntersectionObserver for battery-safe triggering
 * - CSS scroll-snap for native 60fps physics
 * - No heavy re-renders during auto-play
 */

const AUTO_PLAY_INTERVAL = 5000 // 5 seconds per card
const RESUME_DELAY = 8000 // 8 seconds before resuming
const VIEWPORT_THRESHOLD = 0.5 // 50% visibility to trigger

export default function MobilePillarCarousel() {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const [activeIndex, setActiveIndex] = useState(0)

    // Auto-play state
    const [isAutoPlaying, setIsAutoPlaying] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null)
    const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const isInViewRef = useRef(false)

    // Extract pillar colors for dot indicator
    const pillarColors = PLANET_CONFIGS.map(p => p.appearance.baseColor)

    /**
     * Go to next card — Wraps around to first card
     */
    const goToNext = useCallback(() => {
        const nextIndex = (activeIndex + 1) % PLANET_CONFIGS.length
        const card = cardRefs.current[nextIndex]
        if (card && scrollContainerRef.current) {
            card.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            })
        }
    }, [activeIndex])

    /**
     * Start auto-play — Begins the 5-second interval
     */
    const startAutoPlay = useCallback(() => {
        // Check for reduced motion preference
        if (typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return
        }

        if (autoPlayRef.current) clearInterval(autoPlayRef.current)
        autoPlayRef.current = setInterval(goToNext, AUTO_PLAY_INTERVAL)
        setIsAutoPlaying(true)
        setIsPaused(false)
    }, [goToNext])

    /**
     * Stop auto-play — Clears interval completely
     */
    const stopAutoPlay = useCallback(() => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current)
            autoPlayRef.current = null
        }
        if (resumeTimeoutRef.current) {
            clearTimeout(resumeTimeoutRef.current)
            resumeTimeoutRef.current = null
        }
        setIsAutoPlaying(false)
        setIsPaused(false)
    }, [])

    /**
     * Pause auto-play — Temporarily pauses, resumes after 8s idle
     */
    const pauseAutoPlay = useCallback(() => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current)
            autoPlayRef.current = null
        }
        setIsPaused(true)

        // Resume after delay if still in view
        if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current)
        resumeTimeoutRef.current = setTimeout(() => {
            if (isInViewRef.current && isAutoPlaying) {
                startAutoPlay()
            }
        }, RESUME_DELAY)
    }, [isAutoPlaying, startAutoPlay])

    /**
     * IntersectionObserver — Start/stop auto-play based on viewport visibility
     */
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                isInViewRef.current = entry.isIntersecting &&
                    entry.intersectionRatio > VIEWPORT_THRESHOLD

                if (isInViewRef.current) {
                    // Small delay before starting to avoid jarring start
                    setTimeout(() => {
                        if (isInViewRef.current) startAutoPlay()
                    }, 1000)
                } else {
                    stopAutoPlay()
                }
            },
            { threshold: [0, VIEWPORT_THRESHOLD, 1] }
        )

        observer.observe(container)
        return () => {
            observer.disconnect()
            stopAutoPlay()
        }
    }, [startAutoPlay, stopAutoPlay])

    /**
     * IntersectionObserver — Track which card is most visible
     */
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
                        const index = cardRefs.current.findIndex(
                            (ref) => ref === entry.target
                        )
                        if (index !== -1) {
                            setActiveIndex(index)
                        }
                    }
                })
            },
            {
                root: container,
                threshold: [0.6],
                rootMargin: '0px',
            }
        )

        cardRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref)
        })

        return () => observer.disconnect()
    }, [])

    /**
     * Handle scroll events — Pause auto-play on user interaction
     */
    const handleScrollStart = useCallback(() => {
        if (isAutoPlaying) {
            pauseAutoPlay()
        }
    }, [isAutoPlaying, pauseAutoPlay])

    /**
     * Programmatic scroll to card — for dot click navigation
     */
    const scrollToCard = useCallback((index: number) => {
        // Pause auto-play on dot click
        if (isAutoPlaying) {
            pauseAutoPlay()
        }

        const card = cardRefs.current[index]
        if (card && scrollContainerRef.current) {
            card.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            })
        }
    }, [isAutoPlaying, pauseAutoPlay])

    return (
        <div className="relative">
            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="overflow-x-auto scroll-snap-x-mandatory scrollbar-hide pb-2"
                onTouchStart={handleScrollStart}
                onMouseDown={handleScrollStart}
            >
                {/* Cards Track */}
                <div
                    className="flex gap-4 px-6"
                    style={{
                        width: 'max-content',
                        paddingLeft: 'calc(50vw - 50%)',
                        paddingRight: 'calc(50vw - 50%)',
                    }}
                >
                    {PLANET_CONFIGS.map((planet, index) => (
                        <PillarCard
                            key={planet.id}
                            ref={(el) => {
                                cardRefs.current[index] = el
                            }}
                            planet={planet}
                            isActive={activeIndex === index}
                        />
                    ))}
                </div>
            </div>

            {/* Dot Indicator with Auto-Play Status */}
            <div className="flex items-center justify-center gap-3 mt-4">
                <CarouselDots
                    currentIndex={activeIndex}
                    total={PLANET_CONFIGS.length}
                    colors={pillarColors}
                    onDotClick={scrollToCard}
                />

                {/* Auto-Play Indicator */}
                {isAutoPlaying && !isPaused && (
                    <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: pillarColors[activeIndex] }}
                        animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                        title="Auto-playing"
                    />
                )}
            </div>

            {/* Card Counter */}
            <div className="text-center mt-2">
                <span className="text-xs text-white/40 font-medium">
                    {activeIndex + 1} / {PLANET_CONFIGS.length}
                </span>
            </div>

            {/* Swipe Hint — Only visible on first card */}
            <SwipeHint visible={activeIndex === 0} />
        </div>
    )
}

/**
 * SwipeHint — Subtle indicator that more content exists
 * Enhanced with pulsing animation and better visibility
 */
function SwipeHint({ visible }: { visible: boolean }) {
    if (!visible) return null

    return (
        <motion.div
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-white/40 text-xs pointer-events-none"
            initial={{ opacity: 0, x: 10 }}
            animate={{
                opacity: [0.4, 0.8, 0.4],
                x: [0, 4, 0],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        >
            <span className="sr-only">Swipe for more</span>
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                />
            </svg>
        </motion.div>
    )
}
