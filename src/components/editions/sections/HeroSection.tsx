'use client'

/**
 * HERO SECTION - EDITION PAGE (Theatrical Framed Design)
 * 
 * Aftermovie-led hero with:
 * - Centered vertical layout (text ABOVE video)
 * - Framed video container (80% width, 16:9, rounded corners)
 * - Teal glow border on video frame
 * - Staggered Framer Motion entry animations
 * - Native <video> with muted autoplay
 * - Responsive: 16:9 on all devices, width scales
 * 
 * Inspired by Codebasics AI Fest - video as SUBJECT, not background
 */

import { useState, useEffect, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Volume2, VolumeX, ChevronDown, MapPin } from 'lucide-react'
import type { HeroData, EditionStatus } from '@/types/edition'

interface HeroSectionProps {
    data: HeroData
    status: EditionStatus
}

export function HeroSection({ data, status }: HeroSectionProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isMuted, setIsMuted] = useState(true)
    const [isVideoLoaded, setIsVideoLoaded] = useState(false)
    const prefersReducedMotion = useReducedMotion()

    // Auto-play video on mount
    useEffect(() => {
        if (videoRef.current && data.type === 'video') {
            videoRef.current.play().catch(() => {
                console.log('Autoplay prevented by browser')
            })
        }
    }, [data.type])

    // Toggle mute
    const handleToggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted
            setIsMuted(videoRef.current.muted)
        }
    }

    // Scroll to next section
    const handleScrollClick = () => {
        const statsSection = document.querySelector('.stats-section')
        if (statsSection) {
            statsSection.scrollIntoView({ behavior: 'smooth' })
        }
    }

    // Animation variants for staggered entry
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: 'easeOut' as const }
        }
    }

    const videoVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { duration: 0.8, delay: 0.5, ease: 'easeOut' as const }
        }
    }

    return (
        <section className="hero-section-theatrical">
            {/* Background gradient */}
            <div className="hero-bg-gradient" />

            {/* Main Content Container */}
            <motion.div
                className="hero-theatrical-content"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Status Badge - Premium Edition Marker */}
                <motion.span
                    className="hero-edition-marker"
                    variants={itemVariants}
                >
                    EDITION I
                </motion.span>

                {/* Main Title */}
                <motion.h1 className="hero-theatrical-title" variants={itemVariants}>
                    <span className="title-brand-premium">EKATVA</span>
                    <span className="title-city-premium">{data.title?.replace('EKATVA ', '') || 'HYDERABAD'}</span>
                </motion.h1>

                {/* Decorative Underline */}
                <motion.div
                    className="title-underline"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                />

                {/* Date - Editorial Format */}
                <motion.p className="hero-date-premium" variants={itemVariants}>
                    FEB. 15, 2025
                </motion.p>

                {/* Venue - Premium Icon */}
                <motion.p className="hero-venue-premium" variants={itemVariants}>
                    <MapPin
                        size={14}
                        strokeWidth={1.5}
                        className="inline-block text-teal-400 mr-2"
                        aria-hidden="true"
                    />
                    {data.venue?.toUpperCase() || 'INORBIT MALL • HYDERABAD'}
                </motion.p>

                {/* Video Frame Container */}
                <motion.div
                    className="hero-video-frame"
                    variants={prefersReducedMotion ? {} : videoVariants}
                    initial={prefersReducedMotion ? undefined : "hidden"}
                    animate={prefersReducedMotion ? undefined : "visible"}
                >
                    {data.type === 'video' && data.videoUrl ? (
                        <>
                            <video
                                ref={videoRef}
                                className="hero-framed-video"
                                autoPlay
                                muted={isMuted}
                                loop
                                playsInline
                                poster={data.videoPoster}
                                onLoadedData={() => setIsVideoLoaded(true)}
                            >
                                <source src={data.videoUrl} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                            {/* Unmute Button */}
                            <button
                                className="hero-mute-btn"
                                onClick={handleToggleMute}
                                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                            >
                                {isMuted ? (
                                    <>
                                        <VolumeX size={18} />
                                        <span>Unmute to Experience</span>
                                    </>
                                ) : (
                                    <>
                                        <Volume2 size={18} />
                                        <span>Sound On</span>
                                    </>
                                )}
                            </button>
                        </>
                    ) : data.imageUrl ? (
                        <img
                            className="hero-framed-image"
                            src={data.imageUrl}
                            alt={`${data.title} venue`}
                        />
                    ) : (
                        <div
                            className="hero-framed-placeholder"
                            style={{
                                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                            }}
                        />
                    )}
                </motion.div>

                {/* CTA Button (Upcoming only) */}
                {status === 'upcoming' && data.ctaLink && (
                    <motion.a
                        href={data.ctaLink}
                        className="hero-theatrical-cta"
                        variants={itemVariants}
                    >
                        {data.ctaText || 'Register Now'}
                    </motion.a>
                )}
            </motion.div>

            {/* Scroll Indicator */}
            <motion.button
                className="hero-scroll-indicator"
                onClick={handleScrollClick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                aria-label="Scroll to content"
            >
                <span>Scroll to explore</span>
                <ChevronDown className="scroll-icon" size={24} />
            </motion.button>
        </section>
    )
}

export default HeroSection
