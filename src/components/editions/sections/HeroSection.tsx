'use client'

import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { YouTubeFacade } from '@/components/ui/YouTubeFacade'
import type { HeroData, EditionStatus } from '@/types/edition'

interface HeroSectionProps {
    data: HeroData
    status: EditionStatus
}

export function HeroSection({ data, status }: HeroSectionProps) {

    // Fallback ID if not present in data (though we added it)
    const youtubeId = data.youtubeId || "M7lc1UVf-VE"

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
            transition: { duration: 0.6, ease: 'easeOut' }
        }
    }

    return (
        <section className="hero-section-theatrical min-h-screen relative flex flex-col items-center justify-center overflow-hidden py-20 bg-[#050505]">
            {/* Background gradient */}
            <div className="hero-bg-gradient absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-[#050505] to-black z-0 pointer-events-none" />

            {/* Background Glows matching Teal theme */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Content Container */}
            <motion.div
                className="hero-theatrical-content relative z-10 w-full max-w-7xl mx-auto px-4 flex flex-col items-center text-center"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Status Badge - Premium Edition Marker */}
                <motion.span
                    className="hero-edition-marker"
                    variants={itemVariants}
                >
                    {status === 'completed' ? 'EDITION I — COMPLETED' : 'UPCOMING EDITION'}
                </motion.span>

                {/* Main Title - RESTORED ORIGINAL FONTS */}
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
                    {data.subtitle || 'FEB. 15, 2025'}
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

                {/* VIDEO FRAME CONTAINER (The YouTube Facade) - RESTORED GLOW */}
                <motion.div
                    className="hero-video-frame"
                    initial={{ opacity: 0, y: 40, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
                >
                    {/* 
                        Use className to override YouTubeFacade's default borders/radius 
                        so they don't conflict with hero-video-frame 
                    */}
                    <YouTubeFacade
                        videoId={youtubeId}
                        posterUrl={data.videoPoster}
                        className="w-full h-full border-0 shadow-none rounded-none !bg-transparent"
                    />
                </motion.div>

            </motion.div>

            {/* Scroll Indicator REMOVED as requested */}

        </section>
    )
}

export default HeroSection
