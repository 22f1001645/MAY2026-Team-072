'use client'

/**
 * TESTIMONIALS SECTION - VELOCITY SPOTLIGHT HEADER
 * 
 * Architecture: "The Velocity Stream"
 * Interaction: Infinite Horizontal Scroll + Pause on Hover + Mouse-tracking Spotlight
 * Vibe: High Energy, Trustworthy, Premium
 */

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Quote, Sparkles } from 'lucide-react'
import Image from 'next/image'

// --- DATA ---
const TESTIMONIALS = [
    {
        id: 1,
        name: "Priya Sharma",
        role: "Attendee",
        edition: "Pravāha '24",
        quote: "Ekatva made me realize I'm not alone. Found my study group and lifelong friends here. It wasn't just an event, it was a reset button.",
        accent: "teal"
    },
    {
        id: 2,
        name: "Rahul Menon",
        role: "Volunteer",
        edition: "Paradox '23",
        quote: "The speed conversations were genius. I made 10 genuine connections in just 30 minutes! The energy was absolutely electric.",
        accent: "gold"
    },
    {
        id: 3,
        name: "Ananya Reddy",
        role: "Speaker",
        edition: "Akord '24",
        quote: "From nervous introvert to dancing at DJ night – that's what EKATVA did to me. No judgment, just pure vibes.",
        accent: "teal"
    },
    {
        id: 4,
        name: "Karthik V.",
        role: "Organizer",
        edition: "Core Team",
        quote: "Seeing 500+ students from across India under one roof... that creates a feeling you can't describe. It's pure magic.",
        accent: "gold"
    },
    {
        id: 5,
        name: "Sarah Jenkins",
        role: "Attendee",
        edition: "Pravāha '24",
        quote: "The best weekend of my college life. Period. The workshops actually taught me things I use in my job today.",
        accent: "teal"
    },
    {
        id: 6,
        name: "Arjun Mehta",
        role: "Volunteer",
        edition: "Paradox '23",
        quote: "Exhausting? Yes. Worth it? 1000%. I'd do it all over again in a heartbeat. The community is everything.",
        accent: "gold"
    },
    {
        id: 7,
        name: "Meera Nair",
        role: "Creator",
        edition: "Akord '24",
        quote: "Finally a place where artists are celebrated, not just tolerated. The showcase gave me the confidence to launch my page.",
        accent: "teal"
    }
]

// --- COMPONENT: SPOTLIGHT CARD ---
const SpotlightCard = ({ data }: { data: typeof TESTIMONIALS[0] }) => {
    const divRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [opacity, setOpacity] = useState(0)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return
        const div = divRef.current
        const rect = div.getBoundingClientRect()
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    const handleFocus = () => {
        setOpacity(1)
    }

    const handleBlur = () => {
        setOpacity(0)
    }

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleFocus}
            onMouseLeave={handleBlur}
            className="testimonial-card"
        >
            {/* SPOTLIGHT GLOW EFFECT */}
            <div
                className="spotlight-layer"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${data.accent === 'gold' ? 'rgba(255, 207, 150, 0.15)' : 'rgba(92, 230, 201, 0.15)'}, transparent 40%)`
                }}
            />
            {/* SPOTLIGHT BORDER REVEAL */}
            <div
                className="spotlight-border"
                style={{
                    opacity,
                    background: `radial-gradient(200px circle at ${position.x}px ${position.y}px, ${data.accent === 'gold' ? '#FFCF96' : '#5CE6C9'}, transparent 40%)`,
                }}
            />

            {/* CONTENT */}
            <div className="testimonial-content">
                <Quote
                    className={`testimonial-quote-icon ${data.accent === 'gold' ? 'text-gold' : 'text-teal'}`}
                    size={24}
                />

                <p className="testimonial-text">
                    "{data.quote}"
                </p>

                <div className="testimonial-author">
                    <div className={`author-avatar-placeholder ${data.accent === 'gold' ? 'bg-gold' : 'bg-teal'}`}>
                        {data.name.charAt(0)}
                    </div>
                    <div className="author-info">
                        <h4 className="author-name">{data.name}</h4>
                        <div className="author-meta">
                            <span className="author-role">{data.role}</span>
                            <span className="author-edition">• {data.edition}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- MAIN SECTION ---
export function TestimonialsSection() {
    return (
        <section className="testimonials-section">
            {/* Background Atmosphere */}
            <div className="testimonials-bg-glow" />

            <div className="container-testimonials">
                <motion.div
                    className="testimonials-header"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="label-pill">
                        <Sparkles size={12} className="text-teal-400" />
                        <span>Community Voices</span>
                    </div>
                    <h2 className="section-headline">
                        Real Stories. <span className="text-highlight-gold">Real Impact.</span>
                    </h2>
                    <p className="section-subheadline">
                        From first-time attendees to core organizers, Ekatva is defined by its people.
                    </p>
                </motion.div>

                {/* VELOCITY SCROLL TRACK */}
                <div className="velocity-scroll-mask">
                    <div className="velocity-track">
                        {/* SET 1 */}
                        {TESTIMONIALS.map((t, i) => (
                            <SpotlightCard key={`origin-${t.id}`} data={t} />
                        ))}
                        {/* SET 2 (Duplicate for loop) */}
                        {TESTIMONIALS.map((t, i) => (
                            <SpotlightCard key={`clone-${t.id}`} data={t} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default TestimonialsSection
