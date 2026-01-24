'use client'

/**
 * GALLERY SECTION - "Every Moment, Every Memory"
 * 
 * Hybrid architecture:
 * - 6 Interactive Shuffle Decks (3x2 grid)
 * - 1 Infinite Vibe Stream (full-bleed marquee)
 * - Parallax depth on scroll
 * - FLIP Lightbox for fullscreen view
 * 
 * Implements Iceberg Loading:
 * - Phase 1: Top cards only (LCP priority)
 * - Phase 2: Back cards after idle
 * - Phase 3: n+2 on interaction
 */

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Download, Shuffle } from 'lucide-react'
import { MemoryDeck } from './MemoryDeck'
import { VibeStream } from './VibeStream'
import { PhotoLightbox } from './PhotoLightbox'
import type { GalleryData, EditionStatus } from '@/types/edition'

interface GallerySectionProps {
    data: GalleryData
    status: EditionStatus
    city: string
}

// Gallery deck configuration - Iceberg data model
const DECK_CONFIG = {
    'icebreakers': {
        label: 'Icebreakers',
        images: [
            '/images/gallery/icebreakers/speed-conversations.png',
            '/images/gallery/icebreakers/senior-junior.png',
            '/images/gallery/icebreakers/treasure-hunt.png'
        ]
    },
    'red-light': {
        label: 'Red Light, Green Light',
        images: [
            '/images/gallery/red-light/thumbnail.png',
            '/images/gallery/red-light/action-1.jpg'
        ]
    },
    'mimic-relay': {
        label: 'Mimic Relay',
        images: [
            '/images/gallery/mimic-relay/mimic-1.png',
            '/images/gallery/mimic-relay/mimic-2.png'
        ]
    },
    'interactive': {
        label: 'Interactive Sessions',
        images: [
            '/images/gallery/interactive/interactive-1.png',
            '/images/gallery/interactive/interactive-2.png'
        ]
    },
    'dj-night': {
        label: 'Music & DJ Night',
        images: [
            '/images/gallery/dj-night/music.png',
            '/images/gallery/dj-night/dance.png',
            '/images/gallery/dj-night/dj.png'
        ]
    },
    'ekatva-family': {
        label: 'Ekatva Family',
        images: [
            '/images/gallery/ekatva-family/family-1.png',
            '/images/gallery/ekatva-family/family-2.jpg',
            '/images/gallery/ekatva-family/family-3.png'
        ]
    }
}

// Slider images for vibe stream
const SLIDER_IMAGES = [
    '/images/gallery/slider/people-1.png',
    '/images/gallery/slider/people-2.jpg',
    '/images/gallery/slider/people-3.jpg',
    '/images/gallery/slider/venue-1.jpg'
]

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' as const },
    },
}

// Type for active photo in lightbox
interface ActivePhoto {
    src: string
    alt: string
    layoutId: string
}

export function GallerySection({ data, status, city }: GallerySectionProps) {
    // Lightbox state
    const [activePhoto, setActivePhoto] = useState<ActivePhoto | null>(null)

    // Parallax ref and scroll tracking
    const sectionRef = useRef<HTMLElement>(null)
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    })

    // Check for mobile (disable parallax on small screens)
    const [isMobile, setIsMobile] = useState(false)
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    // Subtle parallax: ±30px offset (disabled on mobile)
    const gridY = useTransform(scrollYProgress, [0, 1], isMobile ? [0, 0] : [30, -30])

    // Handler for opening lightbox
    const handlePhotoClick = (src: string, alt: string, layoutId: string) => {
        setActivePhoto({ src, alt, layoutId })
    }

    // For completed editions with shuffle decks
    if (status === 'completed') {
        return (
            <>
                <section
                    ref={sectionRef}
                    className="gallery-section gallery-section--hybrid"
                >
                    {/* Section Header */}
                    <motion.div
                        className="gallery-header"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    >
                        <h2 className="section-headline">
                            Every Moment, <span className="text-gold">Every Memory</span>
                        </h2>
                        {/* Fix D: Instruction badge - elevated affordance */}
                        <div className="gallery-instruction-badge">
                            <Shuffle size={14} />
                            <span>Tap any deck to explore</span>
                        </div>
                    </motion.div>

                    {/* Shuffle Deck Grid - 3x2 on Desktop - WITH PARALLAX */}
                    <motion.div
                        className="memory-deck-grid"
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        style={{ y: gridY }}
                    >
                        {Object.entries(DECK_CONFIG).map(([deckId, deck], index) => (
                            <motion.div key={deckId} variants={itemVariants}>
                                <MemoryDeck
                                    deckId={deckId}
                                    label={deck.label}
                                    images={deck.images}
                                    onPhotoClick={handlePhotoClick}
                                    entryDelay={index * 100} // Staggered entry animation
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Vibe Stream - Full Bleed Marquee */}
                    <motion.div
                        className="vibe-stream-container"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                    >
                        <VibeStream images={SLIDER_IMAGES} />
                        <p className="vibe-stream-caption">
                            Moments that made Ekatva unforgettable
                        </p>
                    </motion.div>

                    {/* Download Action */}

                </section>

                {/* FLIP Lightbox */}
                <AnimatePresence>
                    {activePhoto && (
                        <PhotoLightbox
                            imageSrc={activePhoto.src}
                            imageAlt={activePhoto.alt}
                            layoutId={activePhoto.layoutId}
                            onClose={() => setActivePhoto(null)}
                        />
                    )}
                </AnimatePresence>
            </>
        )
    }

    // Upcoming edition - placeholder
    return (
        <section className="gallery-section">
            <motion.h2
                className="section-headline"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                A Glimpse of What Awaits
            </motion.h2>

            <motion.div
                className="gallery-placeholder"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
            >
                <div className="placeholder-content">
                    <span className="placeholder-icon">📸</span>
                    <h3>Memories in the Making</h3>
                    <p>
                        The gallery will be filled with moments from {city} 2025.
                        <br />
                        For now, explore what Hyderabad looked like:
                    </p>
                </div>
            </motion.div>
        </section>
    )
}

export default GallerySection
