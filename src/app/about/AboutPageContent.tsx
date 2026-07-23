'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Heart,
    Users,
    Lightbulb,
    Zap,
    ArrowLeft,
    ArrowRight,
    MapPin,
    Calendar,
    CheckCircle,

    MessageSquare,
    UserCheck,
    Rocket,
    PartyPopper
} from 'lucide-react'
import { HeroMarquee, CircularScroll } from './AboutHeroComponents'
import { SectionSkeleton } from '@/components/about/SectionSkeleton'

// PERFORMANCE OPTIMIZATION: Lazy load heavy sections
// Section6A: ~43KB, Section6B: ~30KB - Total savings: ~73KB on initial bundle
const Section6A = dynamic(() => import('./Section6A').then(mod => ({ default: mod.Section6A })), {
    ssr: false,
    loading: () => <SectionSkeleton />
})

const Section6B = dynamic(() => import('./Section6B').then(mod => ({ default: mod.Section6B })), {
    ssr: false,
    loading: () => <SectionSkeleton />
})

import './about.css'

// ============================================================================
// DIVERSITY ANIMATION - MORPHING TYPOGRAPHY
// ============================================================================

// All scripts for morphing main headline (Hindi first, then regional)
const MORPH_SCRIPTS = [
    { script: 'एकत्व', name: 'Hindi', langCode: 'hi' },
    { script: 'ఏకత్వ', name: 'Telugu', langCode: 'te' },
    { script: 'ஏகத்வம்', name: 'Tamil', langCode: 'ta' },
    { script: 'একত্ব', name: 'Bengali', langCode: 'bn' },
    { script: 'એકત્વ', name: 'Gujarati', langCode: 'gu' },
    { script: 'ಏಕತ್ವ', name: 'Kannada', langCode: 'kn' },
    { script: 'ഏകത്വം', name: 'Malayalam', langCode: 'ml' },
]

// Marquee text (regional only, Hindi is in main title)
const MARQUEE_SCRIPTS = MORPH_SCRIPTS.slice(1)

// ============================================================================
// DATA CONSTANTS
// ============================================================================

const BELIEF_PRINCIPLES = [
    {
        id: 'unity',
        headline: 'Unity Through Oneness',
        shortText: 'Cities, batches, houses disappear — students finally belong to one living IITM BS community.',
        expandedText: [
            'EKATVA = एकत्व = Oneness.',
            'From the start, we knew fragmentation was the enemy. UHC houses competing against each other. Societies working in silos. Students divided by geography, batch year, and campus politics.',
            'The first signal of oneness happened before the fest even began — when Pravāha, Akord, IRIS, Boundless, and 10+ student bodies came onto the same page. This alignment was rare in a largely online degree ecosystem.',
            'At EKATVA Hyderabad, oneness became real: During Speed Conversations, seniors and juniors mixed freely without hierarchy. People who had only seen each other as Zoom names were suddenly laughing and exchanging numbers.',
            'In team activities like Indian Squid Games, house rivalries dissolved. You could visibly see competition replaced by collaboration — teammates cheering regardless of house identity.',
            'By the end of the day, cities, batches, houses, and screens disappeared. Students finally felt like they belonged to one living IITM BS community.',
            "That's oneness beyond competition. That's EKATVA."
        ],
        icon: Heart,
        accent: 'teal'
    },
    {
        id: 'inclusivity',
        headline: 'Belonging Without Barriers',
        shortText: "Free wasn't a budget decision. It was a belief — belonging should never have a price tag.",
        expandedText: [
            'Making EKATVA free was not accidental — and it was not guaranteed.',
            'Before the ₹2,40,000 budget approval, there were multiple meetings, long discussions, and complete uncertainty about whether funding would come through at all.',
            'We considered charging students. ₹500 might not seem like much. But we asked a different question: "Should even one student hesitate because of money?"',
            'We knew some students would need parental approval. Some would feel uncomfortable asking. Some would silently opt out.',
            'EKATVA was meant to be a safe yes — a no-pressure decision. A place where money never decides belonging.',
            'This philosophy extended to everything: Free transport to and from the venue, free lunch for every attendee, no registration fees, no hidden costs.',
            "The experience had to feel like a gift, not a transaction. We didn't want students asking: \"Did I get my ₹500 worth?\" We wanted them thinking: \"I can't believe we got to experience this.\"",
            "Free wasn't a budget decision. It was a belief."
        ],
        icon: Users,
        accent: 'gold'
    },
    {
        id: 'student-led',
        headline: 'By Students, For Students',
        shortText: 'Faculty built the playground. EKATVA taught students how to play together — meaningfully, joyfully, at scale.',
        expandedText: [
            'The IITM BS ecosystem is like a playground.',
            'Faculty built it. They created the degree, enabled student bodies, allowed meetups, put basic rules in place. That itself is powerful.',
            "But here's the reality: A playground with only rules and no framework becomes chaotic. Rules decide what is allowed. Frameworks decide how things are done well, repeatedly, and at scale.",
            'EKATVA was designed to be structured, standardized, scalable, and sustainable. Not dependent on one individual, one leader, or one society. But built as a system.',
            'Being student-led allowed us to take risks that would have been sanitized: Activities like Speed Conversations, Indian Squid Games, Meme Recreation might have been seen as "too informal" or "too playful."',
            'But these were the moments where real connections were formed.',
            "Faculty designs tend to prioritize safety, formality, and predictability. Student designs prioritize belonging, energy, relatability, and shared laughter.",
            "We didn't assume what students need. We were the students. We knew the awkwardness of first conversations, the hunger to meet people beyond screens, the craving for a real IIT Madras identity.",
            "That gave EKATVA a different energy, warmth, and authenticity. People weren't \"attending\" EKATVA. They were belonging to it."
        ],
        icon: Lightbulb,
        accent: 'teal'
    },
    {
        id: 'connection',
        headline: 'Designed to Connect Humans',
        shortText: "We didn't design activities to entertain students. We designed them to connect humans.",
        expandedText: [
            'Every activity at EKATVA was guided by two non-negotiable principles:',
            '1. Unreasonable Hospitality — Not basic hospitality. But unreasonable hospitality — where every student feels noticed, welcomed, and valued, even if they came alone.',
            "2. Engineered Ice-Breaking — Most meetups fail: People come, eat, watch, leave — without knowing anyone's name. Introverts stay invisible. Networking is left to chance.",
            "We believe: It is the organizer's responsibility — not the participant's — to break the ice.",
            'The Core Design Question: How do we make 200+ students — most of whom have never met — feel comfortable, connected, and equal within the first hour?',
            'Every activity was chosen using four filters: Maximum Interaction (fast & forced in a good way), Radical Inclusivity (no talent, no elimination), Non-Competitive by Design (fun before leaderboards), and Cultural Familiarity + Virality.',
            "By the time the first activity block ended: People knew names, groups had formed, energy had shifted, the fest felt &quot;safe.&quot; After that, performances landed better, team games felt natural, and the DJ night felt communal.",
            "We didn't design activities to entertain students. We designed them to connect humans."
        ],
        icon: Zap,
        accent: 'gold'
    }
]

const BROKEN_SYSTEMS = [
    {
        number: 1,
        headline: "Paradox — And Many Can&apos;t Attend",
        short: 'Many dual-degree students miss the annual fest entirely because of exam overlaps, travel difficulties, and timing conflicts.'
    },
    {
        number: 2,
        headline: 'Students Passing Through — Not Living It',
        short: 'Out of 40,000+ enrolled students, less than 1% complete the degree. Not because they lack capability — but because they lack community.'
    },
    {
        number: 3,
        headline: 'Meetups Exist — Without Meaning',
        short: 'Many meetups happen "just for the sake of happening." No framework, no consistency, no shared standards.'
    },
    {
        number: 4,
        headline: 'Fragmentation & Competitive Toxicity',
        short: 'Houses vs Houses. Societies vs Houses. Ego-driven hierarchies. Leaderboard rigging. Hostility.'
    }
]


const PHILOSOPHY_PILLARS = [
    {
        number: 1,
        title: 'Activity Design',
        subtitle: 'Participation Over Performance',
        tagline: "EKATVA wasn't designed to be watched. It was designed to be felt — together.",
        content: [
            {
                heading: "Culture Is Not a Stage — It's a Shared Space",
                text: 'Most college fests follow a familiar pattern: 80% watching, 20% participating. A clear divide between performers and audience. EKATVA was designed to break that divide.'
            },
            {
                heading: 'Participation Came First',
                text: 'The day was structured deliberately: Morning & afternoon team-building, evening performances, late evening DJ. By the time performances began, people already knew each other. The crowd felt safe, warm, and open.'
            },
            {
                heading: 'DJ Night: The Final Equalizer',
                text: "After talking, playing, collaborating, and laughing, the DJ night allowed barriers to fully dissolve. People to let go. No hierarchies. No roles. No labels. Just people."
            }
        ],
        accent: 'teal'
    },
    {
        number: 2,
        title: 'Cultural Balance',
        subtitle: 'Three Expressions Unite',
        tagline: 'Socio-Cultural. Techno-Cultural. Sports. All united under one vision.',
        content: [
            {
                heading: 'Beyond Socio-Cultural',
                text: 'EKATVA was designed from the start to go beyond socio-cultural activities. The vision was always: Three Expressions Unite — Socio-Cultural, Techno-Cultural, and Sports.'
            },
            {
                heading: 'The Hyderabad Focus',
                text: 'The first edition focused primarily on socio-cultural activities because we needed to establish the core: connection and belonging. Building trust through shared experiences had to come first.'
            },
            {
                heading: 'The Roadmap',
                text: 'Future editions will integrate techno-cultural and sports equally, creating a complete, holistic experience where every student — regardless of interest — finds their space.'
            }
        ],
        accent: 'gold'
    },
    {
        number: 3,
        title: 'Inclusivity in Action',
        subtitle: 'No Barriers to Belonging',
        tagline: 'Unreasonable hospitality. Engineered ice-breaking. Free access for all.',
        content: [
            {
                heading: 'How Inclusivity Showed Up',
                text: 'Free transport from multiple pickup points. Free lunch for every attendee. Free entry with no registration fee. No talent gating in activities. No elimination rounds.'
            },
            {
                heading: 'Venue Design',
                text: 'The venue had open spaces — gardens, pools, sports areas — so students could choose their own energy level. Some played cricket. Some sat by the pool. Some danced at the DJ. Everyone belonged.'
            },
            {
                heading: 'The Philosophy',
                text: "Not just making things available. But removing every possible friction between a student and their sense of belonging. EKATVA's inclusivity wasn't theoretical. It was designed into every detail."
            }
        ],
        accent: 'white'
    }
]

const MOMENTS = [
    {
        number: 1,
        title: 'When "Gangs" Started Forming',
        description: 'People stopped standing alone and found their groups. By the end, students had found people whose frequency matched — people they could rely on beyond the fest.'
    },
    {
        number: 2,
        title: 'When the Fest Became a Space',
        description: 'No one asked "What\'s next?" They were just living. Some played cricket, some sat by the pool, some danced. Everyone did what they felt like doing.'
    },
    {
        number: 3,
        title: 'When Real Joy Happened',
        description: 'Not performative joy, but real, relaxed, unfiltered fun. There were no visible social barriers, no awkward corners, no "outsiders." Everyone belonged.'
    }
]

const STATS = [
    { number: '230+', label: 'Students Attended' },
    { number: '4.4/5', label: 'Average Rating' },
    { number: '10+', label: 'Student Bodies' },
    { number: '100%', label: 'Engagement' },
    { number: '80+', label: 'Team Members' },
    { number: 'Free', label: 'Transport & Food' }
]

const TESTIMONIALS = [
    { quote: 'I came alone. I left with 15 new friends.', author: '— First-year student, Hyderabad' },
    { quote: 'This was the first time IITM BS felt real, not just a Zoom classroom.', author: '— Attendee, Jan 2025 batch' },
    { quote: "We're from different houses, different cities, but by the end, we were just one group.", author: '— Cultural performer' },
    { quote: "EKATVA proved that distance doesn't matter when the intent is genuine.", author: '— Regional Coordinator' },
    { quote: 'I finally understand what "belonging" means.', author: '— First-time meetup attendee' }
]

const PROCESS_STEPS = [
    { icon: Users, number: 1, title: 'Societies Unite', desc: 'Co-equal partnership. Governing body model.' },
    { icon: Heart, number: 2, title: 'Inclusive Design', desc: 'Free transport. Free food. No barriers.' },
    { icon: Zap, number: 3, title: 'Three Expressions', desc: 'Socio + Techno + Sports united.' },
    { icon: Lightbulb, number: 4, title: 'Community Building', desc: 'Speed conversations. Real connections.' },
    { icon: PartyPopper, number: 5, title: 'Memories Last', desc: 'Students leave with people, not just photos.' }
]

const CITIES = [
    { name: 'Hyderabad', status: 'completed', year: 'Feb 2025', count: '230+' },
    { name: 'Delhi', status: 'planned', year: '2025' },
    { name: 'Mumbai', status: 'planned', year: '2025' },
    { name: 'Bangalore', status: 'planned', year: '2025' },
    { name: 'Chennai', status: 'future', year: '2026' },
    { name: 'Pune', status: 'future', year: '2026' },
    { name: 'Kolkata', status: 'future', year: '2026' },
    { name: 'Patna', status: 'planned', year: '2025' }
]



// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.12
        }
    }
}

const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AboutPageContent() {
    const [expandedPrinciple, setExpandedPrinciple] = useState<string | null>(null)
    const [expandedPillar, setExpandedPillar] = useState<number | null>(0)
    const [testimonialIndex, setTestimonialIndex] = useState(0)

    // Diversity Animation State
    const [showMorphing, setShowMorphing] = useState(false)
    const [currentScriptIndex, setCurrentScriptIndex] = useState(0)

    // Morphing Typography Effect - DEFERRED to requestIdleCallback
    useEffect(() => {
        // Defer morphing animation until browser is idle (PERFORMANCE OPTIMIZATION)
        // This prevents animation from blocking critical path rendering
        const timeoutId = setTimeout(() => setShowMorphing(true), 2000)

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(() => {
                clearTimeout(timeoutId)
                setShowMorphing(true)
            }, { timeout: 2000 })

            return () => window.cancelIdleCallback(idleId)
        }

        return () => clearTimeout(timeoutId)
    }, [])

    // Script cycling (3 seconds per script) - only runs AFTER morphing is enabled
    useEffect(() => {
        if (!showMorphing) return

        const interval = setInterval(() => {
            setCurrentScriptIndex((prev) => (prev + 1) % MORPH_SCRIPTS.length)
        }, 3000) // 3 seconds per script

        return () => clearInterval(interval)
    }, [showMorphing])

    const nextTestimonial = () => {
        setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }

    const prevTestimonial = () => {
        setTestimonialIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
    }

    return (
        <div className="about-page">
            {/* Back to Home */}
            <Link href="/" className="about-back-link">
                <ArrowLeft size={18} />
                <span>Home</span>
            </Link>

            {/* ================================================================
                SECTION 1: HERO (MORPHING TYPOGRAPHY)
            ================================================================ */}
            <section className="hero-section" id="hero" aria-label="EKATVA Introduction">
                {/* Background */}
                <div className="hero-background">
                    <div className="hero-gradient-bg" aria-hidden="true" />
                    <div className="hero-overlay" />
                </div>

                {/* CONVERGENCE AURA - Award-winning ambient effect */}
                <div className="convergence-aura" aria-hidden="true">
                    {/* Layer 1: Breathing Glow */}
                    <div className="breathing-glow" />

                    {/* Layer 2: Convergence Rays */}
                    <div className="convergence-rays" />

                    {/* Layer 3: Orbit Ring Path */}
                    <div className="orbit-ring" />

                    {/* Layer 4: Orbital Scripts */}
                    <div className="orbital-scripts">
                        {MORPH_SCRIPTS.map((script, index) => (
                            <span
                                key={script.langCode}
                                className={`orbital-script ${currentScriptIndex === index ? 'active' : ''}`}
                            >
                                {script.script}
                            </span>
                        ))}
                    </div>

                </div>


                {/* Main Content */}
                <div className="hero-content">
                    {/* Skip Link (Accessibility) */}
                    <a href="#belief" className="skip-link">
                        Skip to main content
                    </a>

                    {/* Morphing Main Script */}
                    <div className="hero-morph-container">
                        <AnimatePresence mode="wait">
                            <motion.h1
                                key={currentScriptIndex}
                                className="hero-devanagari"
                                initial={{ opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.5, ease: 'easeInOut' }}
                                lang={MORPH_SCRIPTS[currentScriptIndex].langCode}
                            >
                                {MORPH_SCRIPTS[currentScriptIndex].script}
                            </motion.h1>
                        </AnimatePresence>
                    </div>

                    <motion.h2
                        className="hero-english"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                        lang="en"
                    >
                        EKATVA
                    </motion.h2>

                    <motion.div
                        className="hero-divider"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
                        aria-hidden="true"
                    />

                    <motion.p
                        className="hero-translation"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        = Oneness
                    </motion.p>

                    <motion.p
                        className="hero-mission"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.8 }}
                    >
                        A movement uniting 34,000+ IITM BS students
                        <br />
                        across India — one city, one fest,
                        <br />
                        one community at a time.
                    </motion.p>
                </div>

                {/* Scroll Indicator - Magnetic & Circular */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:bottom-12 z-20 hidden md:block">
                    <CircularScroll onClick={() => document.getElementById('our-beliefs')?.scrollIntoView({ behavior: 'smooth' })} />
                </div>


            </section>

            {/* ================================================================
                SECTION 2: THE BELIEF
            ================================================================ */}
            <section className="about-belief" id="our-beliefs">
                <div className="about-container">
                    <motion.header
                        className="about-section-header"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="about-section-title">What We Stand For</h2>
                        <p className="about-section-subtitle">
                            These aren&apos;t values we chose.<br />
                            They&apos;re the foundations EKATVA was built on.
                        </p>
                    </motion.header>

                    <motion.div
                        className="principles-grid"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                    >
                        {BELIEF_PRINCIPLES.map((principle) => {
                            const Icon = principle.icon
                            const isExpanded = expandedPrinciple === principle.id

                            return (
                                <motion.div
                                    key={principle.id}
                                    className="principle-card"
                                    data-accent={principle.accent}
                                    variants={fadeInUp}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="principle-icon">
                                        <Icon size={40} />
                                    </div>

                                    <h3 className="principle-headline">{principle.headline}</h3>
                                    <p className="principle-short">{principle.shortText}</p>

                                    <button
                                        className="principle-expand-btn"
                                        onClick={() => setExpandedPrinciple(isExpanded ? null : principle.id)}
                                        aria-expanded={isExpanded}
                                    >
                                        <span>{isExpanded ? 'Show Less' : 'Read Full Story'}</span>
                                        <motion.div
                                            animate={{ rotate: isExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <ChevronDown size={16} />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                className="principle-expanded"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.4 }}
                                            >
                                                {principle.expandedText.map((para, idx) => (
                                                    <p key={idx}>{para}</p>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })}
                    </motion.div>
                </div>
            </section>

            {/* ================================================================
                SECTION 3: THE STORY
            ================================================================ */}
            <section className="about-story" id="the-story">
                <div className="about-container">
                    <motion.header
                        className="about-section-header"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="about-section-title">Why EKATVA Had to Exist</h2>
                        <p className="about-section-subtitle">
                            The moment we realized something was broken.
                        </p>
                    </motion.header>

                    <div className="story-grid">
                        {/* Broken Systems */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h3 className="story-subsection-title about-subhead">The 4 Broken Systems</h3>
                            <div className="systems-list">
                                {BROKEN_SYSTEMS.map((system) => (
                                    <div key={system.number} className="system-item">
                                        <span className="system-number">{system.number}</span>
                                        <span className="system-headline">{system.headline}</span>
                                        <p className="system-short">{system.short}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Personal Story */}
                        <motion.div
                            className="personal-story-card"
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            <h3 className="story-subsection-title about-subhead">Why I Took This On</h3>
                            <blockquote className="personal-quote">
                                &quot;Once you&apos;ve felt belonging, you can&apos;t ignore those who never will.&quot;
                            </blockquote>
                            <div className="personal-text">
                                <p>
                                    Being a standalone IITM BS student, campus life and student bodies meant everything to me.
                                    Through student activity bodies and Paradox, I met some of the most like-minded people of my life.
                                </p>
                                <p>
                                    And then came the realization: So many students would never experience this.
                                    Not because they didn&apos;t want to — but because the system didn&apos;t allow them to.
                                </p>
                                <p>
                                    I could have just attended Paradox, enjoyed my experience, and moved on.
                                    But once you&apos;ve felt belonging, you can&apos;t ignore those who never will.
                                </p>
                                <p><strong>What about everyone else?</strong></p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>




            {/* ================================================================
                SECTION 6: HOW EKATVA WORKS (REDESIGNED)
            ================================================================ */}
            <Section6A />

            {/* ================================================================
                SECTION 6B: THE VISION (WHERE WE'RE GOING)
            ================================================================ */}
            <Section6B />


        </div>
    )
}
