'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { PLANET_CONFIGS } from '@/data/planets'
import PillarCard from './PillarCard'
import CarouselDots from './CarouselDots'

/**
 * MobilePillarCarousel — Horizontal swipe carousel for Three Pillars
 * 
 * Award-winning implementation:
 * - CSS scroll-snap for native 60fps scroll physics
 * - IntersectionObserver for accurate active card detection
 * - Smooth programmatic scroll for dot click navigation
 * - Zero gesture conflicts with page scroll
 */

export default function MobilePillarCarousel() {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const cardRefs = useRef<(HTMLDivElement | null)[]>([])
    const [activeIndex, setActiveIndex] = useState(0)

    // Extract pillar colors for dot indicator
    const pillarColors = PLANET_CONFIGS.map(p => p.appearance.baseColor)

    /**
     * IntersectionObserver — Track which card is most visible
     * Threshold 0.6 ensures the card is mostly in view before activating
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

        // Observe all card refs
        cardRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref)
        })

        return () => observer.disconnect()
    }, [])

    /**
     * Programmatic scroll to card — for dot click navigation
     * Uses smooth scrolling for premium feel
     */
    const scrollToCard = useCallback((index: number) => {
        const card = cardRefs.current[index]
        if (card && scrollContainerRef.current) {
            card.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            })
        }
    }, [])

    return (
        <div className="relative">
            {/* Scroll Container */}
            <div
                ref={scrollContainerRef}
                className="overflow-x-auto scroll-snap-x-mandatory scrollbar-hide pb-2"
            >
                {/* Cards Track */}
                <div
                    className="flex gap-4 px-6"
                    style={{
                        width: 'max-content',
                        // Add padding to ensure first and last cards can center
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

            {/* Dot Indicator */}
            <CarouselDots
                currentIndex={activeIndex}
                total={PLANET_CONFIGS.length}
                colors={pillarColors}
                onDotClick={scrollToCard}
            />

            {/* Swipe Hint — Only visible on first load */}
            <SwipeHint visible={activeIndex === 0} />
        </div>
    )
}

/**
 * SwipeHint — Subtle indicator that more content exists
 * Fades out after user scrolls to second card
 */
function SwipeHint({ visible }: { visible: boolean }) {
    if (!visible) return null

    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-white/30 text-xs animate-pulse pointer-events-none">
            <span className="sr-only">Swipe for more</span>
            <svg
                className="w-4 h-4"
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
        </div>
    )
}
