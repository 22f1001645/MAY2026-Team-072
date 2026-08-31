import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { motion, useInView } from 'framer-motion'
import './testimonials.css'
import MobileTestimonialsCarousel from './mobile/MobileTestimonialsCarousel'

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
                        className="text-[9px] font-black tracking-[0.2em] uppercase"
                        style={{ color: accent }}
                    >
                        {label}
                    </p>
                    <div className="w-6 h-[2px] bg-white/10" />
                </div>
                <div className="text-4xl opacity-15 font-serif">&ldquo;</div>
            </div>

            {/* Quote Content - Flowfest-sized (17px base) */}
            <blockquote className="text-base md:text-lg text-gray-100 font-medium leading-relaxed tracking-tight italic">
                &ldquo;{content}&rdquo;
            </blockquote>

            {/* Attribution - Compact */}
            <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                <div
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg transform -rotate-3"
                    style={{
                        backgroundColor: accent,
                        color: isLightAccent ? '#050505' : '#FFFFFF'
                    }}
                >
                    {name.charAt(0)}
                </div>
                <div>
                    <h4 className="text-white font-bold text-base md:text-lg tracking-tight">
                        {name}
                    </h4>
                    <p className="text-gray-400 text-xs md:text-sm font-medium opacity-80 uppercase tracking-wider">
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
            const desktopContainer = document.querySelector('.testimonials-desktop') as HTMLElement

            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: triggerRef.current,
                    start: 'top top',
                    // Optimized scroll distance for smooth transitions
                    end: `+=${cards.length * 80}%`,
                    pin: true,
                    // Flowfest-style tight scrub for responsive feel
                    scrub: prefersReducedMotion ? 0 : 0.8,
                    anticipatePin: 1,
                    pinSpacing: true,
                    // Flowfest-style: Simple natural unpin, no custom animation
                    // The section just scrolls away naturally after last card stacks
                }
            })

            // ═══════════════════════════════════════════════════════════════
            // FLOWFEST-INSPIRED VERTICAL STACK ANIMATION
            // Natural scroll physics + 3D depth + "deck of cards" feel
            // ═══════════════════════════════════════════════════════════════

            cards.forEach((card, i) => {
                // Random subtle rotation for "deck of cards" feel (Flowfest technique)
                const cardRotation = (i % 2 === 0 ? 1 : -1) * (1 + Math.random() * 2)

                if (i === 0) {
                    // First card: Already visible, slight rotation
                    gsap.set(card, {
                        zIndex: cards.length + 10,
                        y: 0,
                        z: 0,
                        scale: 1,
                        opacity: 1,
                        rotate: cardRotation * 0.5,
                        filter: 'blur(0px)'
                    })
                } else {
                    // CRITICAL: Hide all upcoming cards until their turn
                    // This prevents text bleed-through from cards not yet in the stack
                    gsap.set(card, {
                        opacity: 0,
                        y: '80vh',
                        z: -150,
                        scale: 0.92,
                        zIndex: i
                    })

                    // Card Entry Animation - Vertical from bottom
                    tl.fromTo(
                        card,
                        {
                            // Starting: Below viewport, receded in Z-space
                            y: '80vh',
                            z: -150,
                            scale: 0.92,
                            opacity: 0,
                            rotate: cardRotation
                        },
                        {
                            // Target: Stack on top with slight rotation
                            y: 0,
                            z: 0,
                            scale: 1,
                            opacity: 1,
                            rotate: cardRotation * 0.5,
                            duration: 1,
                            ease: prefersReducedMotion ? 'none' : 'power2.out',
                            zIndex: cards.length + 10 + i
                        },
                        i * 0.7
                    )

                    // Previous Card: HIDE content, show only shadow edges (Design Principal fix)
                    tl.to(
                        cards[i - 1],
                        {
                            y: '-10vh',           // Push further up
                            z: -100 * i,          // Deeper recession
                            scale: 0.85,          // More shrink
                            opacity: 0.12,        // Nearly invisible (edges only)
                            filter: 'blur(6px)',  // Heavy blur hides text
                            duration: 0.8,
                            ease: 'power2.inOut'
                        },
                        i * 0.7
                    )
                }
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

            {/* Mobile Layout - Smart Auto-Play Carousel */}
            {isMobile && (
                <div className="testimonials-mobile">
                    <MobileTestimonialsCarousel />
                </div>
            )}
        </section>
    )
}
