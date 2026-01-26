'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'
import { scaleIn, fadeIn } from '@/lib/animations'

/**
 * Hero Section - Award-Winning Video Background (10/10)
 * 
 * Features:
 * - Real EKATVA celebration video background
 * - 3-layer overlay system for perfect text readability
 * - MASSIVE typography (208px on desktop)
 * - Mobile-responsive (poster image on mobile)
 * - Smooth parallax scroll effect
 * - Performance optimized with Cloudinary
 */
export default function HeroSection() {
    const sectionRef = useRef<HTMLElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isMobile, setIsMobile] = useState(false)

    // Parallax scroll effects
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ['start start', 'end start']
    })

    // Background moves slower (parallax)
    const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])

    // Content fades out and moves up on scroll
    const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
    const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -50])

    // Detect mobile for conditional rendering
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Ensure video plays on mount with fallback
    useEffect(() => {
        if (videoRef.current && !isMobile) {
            const playVideo = async () => {
                try {
                    await videoRef.current?.play()
                } catch (err) {
                    console.log('Video autoplay prevented:', err)
                    // Fallback: Play on user interaction
                    document.addEventListener('click', () => {
                        videoRef.current?.play()
                    }, { once: true })
                }
            }
            playVideo()
        }
    }, [isMobile])

    const handleScrollToNext = () => {
        window.scrollTo({
            top: window.innerHeight,
            behavior: 'smooth'
        })
    }

    return (
        <section
            ref={sectionRef}
            id="hero"
            className="relative h-screen min-h-[600px] w-full overflow-hidden flex items-center justify-center bg-oneness-black"
            aria-label="Hero section with EKATVA celebration video"
        >
            {/* Video/Image Background with Parallax */}
            <motion.div
                className="absolute inset-0 z-0"
                style={{ y: backgroundY }}
            >
                {isMobile ? (
                    /* Mobile: Static poster image for performance */
                    <Image
                        src="https://res.cloudinary.com/davgdsnyd/video/upload/so_0,f_jpg,q_auto:best/v1767244223/Last_Part_Edit_-_Highlights_720p_qcarfn.jpg"
                        alt="EKATVA Hyderabad 2025 - Students celebrating"
                        fill
                        priority
                        className="object-cover"
                        sizes="100vw"
                    />
                ) : (
                    /* Desktop: Optimized video with subtle zoom animation */
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover animate-video-zoom"
                        style={{
                            filter: 'brightness(1.1) contrast(1.05) saturate(1.1)'
                        }}
                        poster="https://res.cloudinary.com/davgdsnyd/video/upload/so_0,f_jpg,q_auto:best/v1767244223/Last_Part_Edit_-_Highlights_720p_qcarfn.jpg"
                    >
                        {/* WebM for Chrome/Firefox (better compression) */}
                        <source
                            src="https://res.cloudinary.com/davgdsnyd/video/upload/q_auto:good,f_webm/v1767244223/Last_Part_Edit_-_Highlights_720p_qcarfn.webm"
                            type="video/webm"
                        />

                        {/* MP4 fallback for Safari */}
                        <source
                            src="https://res.cloudinary.com/davgdsnyd/video/upload/q_auto:good,f_mp4/v1767244223/Last_Part_Edit_-_Highlights_720p_qcarfn.mp4"
                            type="video/mp4"
                        />

                        {/* Fallback message */}
                        Your browser does not support the video tag.
                    </video>
                )}

                {/* 3-LAYER OVERLAY SYSTEM FOR TEXT READABILITY */}
                <div className="absolute inset-0 z-10">
                    {/* Layer 1: Base darkening (30% opacity - lightened) */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'rgba(5, 5, 5, 0.3)'
                        }}
                    />

                    {/* Layer 2: Radial gradient spotlight (20-75% opacity - lightened) */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(
                                ellipse 60% 60% at 50% 45%,
                                rgba(31, 79, 89, 0.2) 0%,
                                rgba(14, 47, 54, 0.5) 40%,
                                rgba(5, 5, 5, 0.75) 100%
                            )`
                        }}
                    />

                    {/* Layer 3: Top/bottom vignette for cinematic feel */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `linear-gradient(
                                to bottom,
                                rgba(5, 5, 5, 0.6) 0%,
                                transparent 30%,
                                transparent 70%,
                                rgba(5, 5, 5, 0.7) 100%
                            )`
                        }}
                    />
                </div>
            </motion.div>

            {/* Hero Content - MASSIVE Typography */}
            <motion.div
                className="relative z-20 text-center px-fluid-xs max-w-6xl mx-auto"
                style={{ opacity: contentOpacity, y: contentY }}
            >
                {/* Pre-headline Badge */}
                <motion.div
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    className="inline-block mb-fluid-sm px-fluid-sm py-fluid-xs rounded-full border border-ekatva-teal/40 bg-ekatva-teal/15 backdrop-blur-md"
                >
                    <span className="text-fluid-caption text-ekatva-teal tracking-[0.25em] uppercase font-bold">
                        India&apos;s First Regional Fest Movement
                    </span>
                </motion.div>

                {/* ULTRA-MASSIVE Headline - Award-Winning Scale */}
                <motion.h1
                    variants={scaleIn}
                    initial="initial"
                    animate="animate"
                    className="font-serif text-fluid-h1 text-white leading-[1.1] mb-fluid-md"
                >
                    <motion.span
                        className="block"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                        From Online
                    </motion.span>
                    <motion.span
                        className="block text-unity-gold italic"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            textShadow: '0 0 80px rgba(255, 207, 150, 0.6), 0 0 120px rgba(255, 207, 150, 0.4)'
                        }}
                    >
                        to Oneness.
                    </motion.span>
                </motion.h1>

                {/* Subtitle - Forward-Looking & Movement-Focused */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                    className="text-white text-fluid-body max-w-4xl mx-auto mb-fluid-lg font-light leading-relaxed"
                    style={{
                        textShadow: '0 2px 20px rgba(0, 0, 0, 0.8)'
                    }}
                >
                    Uniting{' '}
                    <span className="text-ekatva-teal font-semibold">34,000+ IITM BS students</span>{' '}
                    across India.{' '}
                    <br className="hidden lg:block" />
                    Bringing the campus experience to{' '}
                    <span className="text-unity-gold font-medium">your city</span>.{' '}
                </motion.p>

                {/* CTA Buttons - Larger & More Prominent */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
                    className="flex flex-col sm:flex-row gap-fluid-sm justify-center items-center"
                >
                    {/* Primary CTA - Bigger with stronger glow */}
                    <a
                        href="#origin-story"
                        className="group relative px-fluid-md py-fluid-sm bg-ekatva-teal rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_60px_rgba(92,230,201,0.7)]"
                        style={{
                            boxShadow: '0 0 40px rgba(92, 230, 201, 0.5)'
                        }}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out -translate-x-full" />

                        <span className="relative text-oneness-black font-bold tracking-widest uppercase text-fluid-caption">
                            Discover EKATVA
                        </span>
                    </a>

                    {/* Secondary CTA - Join Movement */}
                    <a
                        href="https://www.instagram.com/ekatva_iitm/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-fluid-md py-fluid-sm rounded-full border-2 border-white/40 text-white hover:bg-white/15 hover:border-white/60 hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all text-fluid-caption font-bold tracking-widest uppercase backdrop-blur-sm"
                    >
                        Join The Movement
                    </a>
                </motion.div>
            </motion.div>

            {/* Scroll Indicator - Slightly larger */}
            <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ duration: 1, delay: 1.5 }}
                onClick={handleScrollToNext}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 p-4 rounded-full border border-white/20 hover:border-ekatva-teal/40 hover:opacity-100 transition-all duration-300 focus:outline-none backdrop-blur-sm"
                aria-label="Scroll to explore EKATVA story"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChevronDown className="w-6 h-6 text-white/70" />
                </motion.div>
            </motion.button>
        </section>
    )
}
