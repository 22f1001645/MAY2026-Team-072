'use client'

import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useInView } from 'framer-motion'
import './testimonials.css'

gsap.registerPlugin(ScrollTrigger)

// Testimonial data with brand-aligned colors
const testimonials = [
    {
        name: 'Kothai Mitra',
        role: 'Head of Student Affairs, IITM BS',
        content: 'Watching Ekatva evolve from a concept into a massive regional movement has been incredible. It\'s a testament to the organizational power and unity of our students across India.',
        accent: '#FFCF96', // unity-gold
        label: 'VISIONARY SUPPORT'
    },
    {
        name: 'Bharathi Ma\'am',
        role: 'Coordinator, IITM BS Degree',
        content: 'Ekatva perfectly bridges the gap between virtual learning and physical community. It creates a space where academic excellence meets cultural vibrancy, fostering a true sense of belonging.',
        accent: '#5CE6C9', // ekatva-teal
        label: 'ACADEMIC SYNERGY'
    },
    {
        name: 'Vishal Bhandari',
        role: 'Event Head, Ekatva Hyderabad',
        content: 'We handled everything from budget deadlocks to on-site cooking for 260+ people. Ekatva taught us that when students lead, challenges become milestones. The 4.4/5 rating is just the beginning.',
        accent: '#3FD4B6', // accent-turquoise
        label: 'STUDENT LEADERSHIP'
    },
    {
        name: 'Ekatva Team',
        role: 'The Vision 2025',
        content: '9 Cities. 1 Mission. Limitless Experiences. Ekatva is a tradition in the making, and we are just getting started. Are you ready for the next edition?',
        accent: '#F8F8F8', // off-white
        label: 'THE MOVEMENT'
    }
]

// Individual Testimonial Card Component
interface TestimonialCardProps {
    name: string
    role: string
    content: string
    accent: string
    label: string
    index: number
}

function TestimonialCard({ name, role, content, accent, label, index }: TestimonialCardProps) {
    // Determine if accent is light (needs dark text)
    const isLightAccent = accent === '#F8F8F8' || accent === '#FFCF96'

    return (
        <div
            className="testimonial-card"
            style={{ zIndex: index }}
        >
            {/* Top Row: Label + Quote Icon */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p
                        className="text-[10px] font-black tracking-[0.3em] uppercase"
                        style={{ color: accent }}
                    >
                        {label}
                    </p>
                    <div className="w-8 h-1 bg-white/10" />
                </div>
                <div className="text-5xl opacity-20 font-serif">&ldquo;</div>
            </div>

            {/* Quote Content */}
            <blockquote className="text-xl md:text-2xl lg:text-3xl text-gray-100 font-medium leading-[1.3] tracking-tight italic">
                &ldquo;{content}&rdquo;
            </blockquote>

            {/* Attribution */}
            <div className="flex items-center gap-5 pt-8 border-t border-white/5">
                <div
                    className="w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg transform -rotate-3"
                    style={{
                        backgroundColor: accent,
                        color: isLightAccent ? '#050505' : '#FFFFFF'
                    }}
                >
                    {name.charAt(0)}
                </div>
                <div>
                    <h4 className="text-white font-extrabold text-lg md:text-xl lg:text-2xl tracking-tight">
                        {name}
                    </h4>
                    <p className="text-gray-400 text-sm md:text-base font-medium opacity-80 uppercase tracking-wider">
                        {role}
                    </p>
                </div>
            </div>
        </div>
    )
}

// Mobile Card Component (simplified for Intersection Observer)
function MobileTestimonialCard({ name, role, content, accent, label, index }: TestimonialCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(cardRef, { once: true, margin: '-50px' })
    const isLightAccent = accent === '#F8F8F8' || accent === '#FFCF96'

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="testimonial-card-mobile"
        >
            <div className="flex justify-between items-start mb-4">
                <p
                    className="text-[9px] font-black tracking-[0.25em] uppercase"
                    style={{ color: accent }}
                >
                    {label}
                </p>
                <div className="text-3xl opacity-20 font-serif">&ldquo;</div>
            </div>

            <blockquote className="text-base text-gray-200 font-medium leading-relaxed italic mb-6">
                &ldquo;{content}&rdquo;
            </blockquote>

            <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg transform -rotate-2"
                    style={{
                        backgroundColor: accent,
                        color: isLightAccent ? '#050505' : '#FFFFFF'
                    }}
                >
                    {name.charAt(0)}
                </div>
                <div>
                    <h4 className="text-white font-bold text-base tracking-tight">{name}</h4>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{role}</p>
                </div>
            </div>
        </motion.div>
    )
}

// Main Testimonials Stack Section
export default function TestimonialsStackSection() {
    const componentRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLElement>(null)
    const [isMobile, setIsMobile] = useState(false)

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // GSAP ScrollTrigger Animation (Desktop Only)
    useLayoutEffect(() => {
        if (isMobile || !triggerRef.current || !componentRef.current) return

        // Accessibility: Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const ctx = gsap.context(() => {
            const cards = gsap.utils.toArray<HTMLElement>('.testimonial-card')

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: triggerRef.current,
                    start: 'top top',
                    // Reduced from 600% to 400% to eliminate blank scroll after last card
                    end: `+=${cards.length * 100}%`,
                    pin: true,
                    // Smoother scrub with physics damping
                    scrub: 2,
                    anticipatePin: 1,
                    pinSpacing: true,
                    // Snap to card positions for premium magnetic feel
                    snap: {
                        snapTo: 1 / (cards.length - 1),
                        duration: { min: 0.2, max: 0.5 },
                        ease: 'power2.inOut',
                        inertia: true
                    }
                }
            })

            cards.forEach((card, i) => {
                if (i === 0) {
                    // First card: Already visible, set in front
                    gsap.set(card, {
                        zIndex: 10,
                        x: 0,
                        z: 0,
                        scale: 1,
                        opacity: 1,
                        rotate: 0,
                        rotateX: 0
                    })
                    return
                }

                // ═══════════════════════════════════════════════════════════
                // AWARD-WINNING HYBRID ANIMATION
                // Horizontal X-axis + 3D Z-depth + VengenceUI elastic easing
                // ═══════════════════════════════════════════════════════════

                // Card Entry Animation - Multi-Stage Keyframes (Overshoot + Settle)
                tl.fromTo(
                    card,
                    {
                        // Starting position: Off-screen right, receded in Z-space
                        x: '110vw',                          // ✓ Horizontal entry (user plan)
                        z: -400,                             // ✓ 3D depth (current optimization)
                        scale: 0.8,                          // Small
                        opacity: 0,                          // Invisible
                        rotate: i % 2 === 0 ? 3 : -3,        // ✓ Subtle rotation for horizontal
                        rotateX: 5                           // Slight tilt
                    },
                    {
                        // Target: Center with overshoot pattern
                        keyframes: {
                            // Stage 1 → 2 → 3 (VengenceUI technique)
                            "0%": { x: '110vw', z: -400, scale: 0.8 },
                            "60%": { x: '-5vw', z: 100, scale: 1.05 },   // OVERSHOOT: Past center, pop forward
                            "100%": { x: '0vw', z: 0, scale: 1 }          // SETTLE: Perfect center
                        },
                        opacity: 1,
                        rotate: 0,
                        rotateX: 0,
                        duration: 0.6,                       // ✓ Snappy (VengenceUI timing)
                        ease: 'elastic.out(1, 0.5)',         // ✓ Elastic bounce-back
                        zIndex: 10 + i
                    },
                    i * 0.8
                )

                // Previous Card Exit Animation - Slide left with depth recession
                tl.to(
                    cards[i - 1],
                    {
                        // Exit: Slide left, recede in Z-space, blur
                        x: '-15vw',                          // ✓ Horizontal exit (user plan)
                        z: -200,                             // Recede into background
                        scale: 0.85,                         // Shrink
                        opacity: 0.2,                        // Fade significantly
                        filter: 'blur(10px)',                // Depth of field effect
                        rotate: -2,                          // Slight counter-rotation
                        duration: 0.5,                       // ✓ Fast exit
                        ease: 'power2.inOut'
                    },
                    i * 0.8
                )
            })
        }, componentRef)

        return () => ctx.revert()
    }, [isMobile])

    return (
        <section
            ref={triggerRef}
            id="testimonials"
            className="testimonials-section"
            aria-label="Community Testimonials"
        >
            {/* Desktop Layout */}
            {!isMobile && (
                <div
                    ref={componentRef}
                    className="testimonials-desktop"
                >
                    {/* Large Decorative Vertical Text */}
                    <div className="testimonials-vertical-text">
                        <h2 className="text-[10vh] font-black uppercase text-white leading-none">
                            ONENESS
                        </h2>
                    </div>

                    {/* Section Header */}
                    <div className="testimonials-header">
                        <div className="flex items-center gap-3 mb-2 justify-center lg:justify-start">
                            <span className="w-12 h-[2px] bg-ekatva-teal" />
                            <span className="text-ekatva-teal font-bold uppercase tracking-[0.4em] text-xs">
                                Voices of Ekatva
                            </span>
                        </div>
                        <h3 className="text-fluid-h1 font-black uppercase tracking-tight">
                            Unity In{' '}
                            <span
                                className="text-transparent"
                                style={{ WebkitTextStroke: '1px white' }}
                            >
                                Action.
                            </span>
                        </h3>
                    </div>

                    {/* Card Stack Container */}
                    <div className="card-stack-container">
                        {testimonials.map((t, i) => (
                            <TestimonialCard
                                key={i}
                                index={i}
                                name={t.name}
                                role={t.role}
                                content={t.content}
                                accent={t.accent}
                                label={t.label}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Mobile Layout */}
            {isMobile && (
                <div className="testimonials-mobile">
                    {/* Mobile Header */}
                    <div className="text-center mb-8 px-4">
                        <div className="flex items-center gap-2 justify-center mb-3">
                            <span className="w-8 h-[2px] bg-ekatva-teal" />
                            <span className="text-ekatva-teal font-bold uppercase tracking-[0.3em] text-[10px]">
                                Voices of Ekatva
                            </span>
                            <span className="w-8 h-[2px] bg-ekatva-teal" />
                        </div>
                        <h3 className="text-white text-2xl font-black uppercase tracking-tight">
                            Unity In Action
                        </h3>
                    </div>

                    {/* Mobile Cards */}
                    <div className="testimonials-mobile-grid">
                        {testimonials.map((t, i) => (
                            <MobileTestimonialCard
                                key={i}
                                index={i}
                                name={t.name}
                                role={t.role}
                                content={t.content}
                                accent={t.accent}
                                label={t.label}
                            />
                        ))}
                    </div>
                </div>
            )}
        </section>
    )
}
