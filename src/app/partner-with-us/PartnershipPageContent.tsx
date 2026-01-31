'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
    Play,
    Users,
    Globe,
    Calendar,
    CheckCircle,
    ArrowRight,
    Shield,
    Clock,
    MessageSquare,
    FileText,
    UserPlus,
    Sparkles,
    Quote,
    ChevronLeft,
    ChevronRight,
    Building,
    Music,
    Code,
    Camera,
    ArrowUp,
    Mail
} from 'lucide-react'
import './partnership.css'

// Import Partner Interest Form
import { PartnerInterestForm } from '@/components/sections/BuildWithUsSection/forms'

// ============================================================================
// PARTNERSHIP PAGE - Full Pitch Replacement
// ============================================================================

/**
 * PartnershipPageContent
 * 
 * 7 Sections:
 * 1. Hero with Video Placeholder
 * 2. What We're Building
 * 3. Value Propositions (Tabbed)
 * 4. Governing Body Model
 * 5. Success Stories / Testimonials
 * 6. What Happens Next (Timeline)
 * 7. Final CTA
 */

// ============================================================================
// DATA
// ============================================================================

const STATS = [
    { icon: <Users size={24} />, value: '10+', label: 'Partner Societies' },
    { icon: <Globe size={24} />, value: '10', label: 'Cities Planned' },
    { icon: <Calendar size={24} />, value: '230+', label: 'Students Reached' }
]

const PROOF_POINTS = [
    { check: true, text: 'EKATVA Hyderabad (Feb 2025): 230 students, 4.4/5 rating' },
    { check: true, text: 'Confirmed cities: Delhi, Mumbai, Bangalore, Patna' },
    { check: true, text: 'Planning: 6 more cities by end of 2025' }
]

const VALUE_TABS = [
    {
        id: 'houses',
        label: 'UHC Houses',
        icon: <Building size={18} />,
        headline: 'Beyond Leaderboards. Build Real Community.',
        benefits: [
            'Your house gets regional recognition (not just online points)',
            'Members meet IRL, strengthening house identity',
            'Showcase house culture at 10 fests annually',
            'Part of Governing Body (equal decision-making power)',
            'Build lasting legacy beyond individual batches'
        ],
        testimonial: {
            quote: 'For the first time, our house felt like a real community, not just a Discord server.',
            author: 'House Representative',
            role: 'EKATVA Hyderabad'
        }
    },
    {
        id: 'cultural',
        label: 'Cultural Societies',
        icon: <Music size={18} />,
        headline: 'Perform at 10 Cities. Build National Presence.',
        benefits: [
            'Stage access at every regional fest (10 cities)',
            'Grow your society\'s reach beyond campus',
            'Recruit talent from regional meetups',
            'Collaborate with other cultural societies',
            'Documented performances (photography, videography)'
        ],
        testimonial: {
            quote: 'EKATVA gave Pravāha a platform we never had before.',
            author: 'Vishal',
            role: 'Founder, Pravāha Dance Society'
        }
    },
    {
        id: 'technical',
        label: 'Technical Societies',
        icon: <Code size={18} />,
        headline: 'Build The Infrastructure. Gain Real Experience.',
        benefits: [
            'Build registration systems, websites, automation tools',
            'Real-world project for your portfolio',
            'Networking with 10-city technical community',
            'Mentorship from EKATVA technical team',
            'Infrastructure you build serves 10,000+ students'
        ],
        useCases: [
            'Registration & ticketing systems',
            'Event management dashboards',
            'Analytics & reporting tools',
            'Mobile apps for attendees'
        ]
    },
    {
        id: 'special',
        label: 'Special Interest',
        icon: <Camera size={18} />,
        headline: 'Find Your Niche Audience Across India.',
        benefits: [
            'Dedicated activity slots at every fest',
            'Access to niche communities in each city',
            'Cross-city collaborations',
            'Content opportunities with exclusive access',
            'Build specialized offerings (workshops, exhibitions)'
        ],
        examples: [
            { name: 'Boundless Travel', desc: 'Coordinate inter-city travel' },
            { name: 'Photography Club', desc: 'Official event documentation' },
            { name: 'Writing Society', desc: 'Storytelling workshops' },
            { name: 'E-Cell', desc: 'Startup showcases' }
        ]
    }
]

const SOCIETY_COMMITMENTS = [
    'Promote EKATVA in your channels (1 post per city)',
    'Contribute talent (performers, volunteers, organizers)',
    'Participate in GB meetings (1 monthly call)',
    'Support logistics when possible (venue, sponsors)'
]

const EKATVA_SUPPORT = [
    'Centralized branding & marketing',
    'Budget management & IIT backing',
    'Vendor network & playbooks',
    'Legal & administrative support',
    'Post-event documentation'
]

const TESTIMONIALS = [
    {
        quote: 'EKATVA gave us a platform we never had before. Performing in Hyderabad opened doors for regional recruitment.',
        author: 'Vishal',
        role: 'Founder',
        society: 'Pravāha Dance Society',
        avatar: '/assets/testimonials/vishal.jpg' // Placeholder
    },
    {
        quote: 'Coordinating EKATVA Express brought 80+ students together on a train. That\'s community building at scale.',
        author: 'Transport Team Lead',
        role: 'Organizer',
        society: 'EKATVA Hyderabad',
        avatar: '/assets/testimonials/transport.jpg'
    },
    {
        quote: 'Our house finally felt like a real community, not just a Discord leaderboard. We\'re in for every city.',
        author: 'Anonymous',
        role: 'House Representative',
        society: 'UHC House',
        avatar: '/assets/testimonials/house.jpg'
    }
]

const PROCESS_STEPS = [
    {
        icon: <MessageSquare size={24} />,
        title: 'Express Interest',
        description: 'Fill the quick form. We\'ll send you the detailed partnership deck.',
        duration: '2 minutes'
    },
    {
        icon: <Calendar size={24} />,
        title: 'Scheduled Call',
        description: 'Meet with EKATVA founders. Ask questions. Understand commitment.',
        duration: '30 minutes'
    },
    {
        icon: <FileText size={24} />,
        title: 'Review Terms',
        description: 'Read the partnership agreement. Discuss with your society leadership.',
        duration: 'Async'
    },
    {
        icon: <UserPlus size={24} />,
        title: 'Onboard to GB',
        description: 'Join the Governing Body. Access planning channels, playbooks, resources.',
        duration: 'Week 1'
    },
    {
        icon: <Sparkles size={24} />,
        title: 'Contribute',
        description: 'Participate in planning the next city edition. Promote. Recruit. Build.',
        duration: 'Ongoing'
    }
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PartnershipPageContent() {
    const [activeTab, setActiveTab] = useState('houses')
    const [showPartnerForm, setShowPartnerForm] = useState(false)
    const [testimonialIndex, setTestimonialIndex] = useState(0)

    const nextTestimonial = () => {
        setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }

    const prevTestimonial = () => {
        setTestimonialIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
    }

    return (
        <main className="partnership-page bg-oneness-black min-h-screen">

            {/* ============ SECTION 1: HERO ============ */}
            <section id="video" className="hero-partnership min-h-screen flex items-center justify-center relative overflow-hidden">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0A2329] via-[#0E2F36] to-[#0A2329]" />
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

                <div className="relative z-10 container-custom py-24 pt-32 lg:py-32">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-12"
                    >
                        <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight">
                            Bring Your Society Into{' '}
                            <span className="text-unity-gold italic">EKATVA</span>
                        </h1>
                        <p className="text-lg md:text-xl lg:text-2xl text-white/70 max-w-3xl mx-auto">
                            Watch this 5-minute pitch to understand what EKATVA is building
                            and why your society should be part of it.
                        </p>
                    </motion.div>

                    {/* Video Placeholder */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="max-w-4xl mx-auto mb-12"
                    >
                        <VideoPlaceholder />
                    </motion.div>

                    {/* Quick Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex justify-center gap-4 sm:gap-8 md:gap-16 flex-wrap"
                    >
                        {STATS.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className="text-ekatva-teal mb-2">{stat.icon}</div>
                                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                                <div className="text-sm text-white/60">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ============ SECTION 2: WHAT WE'RE BUILDING ============ */}
            <section className="py-24 lg:py-32 relative">
                <div className="container-custom max-w-4xl">
                    <SectionBadge>THE MOVEMENT</SectionBadge>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-8"
                    >
                        What Is EKATVA?
                    </motion.h2>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="prose prose-lg prose-invert mx-auto mb-12"
                    >
                        <p className="text-lg md:text-xl text-white/80 text-center leading-relaxed">
                            EKATVA (meaning <em>"oneness"</em> in Sanskrit) is India's first regional festival movement
                            for IITM BS students. We're solving a simple problem:
                        </p>
                    </motion.div>

                    {/* Problem Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 md:p-8 mb-6"
                    >
                        <h3 className="text-xl font-bold text-red-400 mb-3">The Problem</h3>
                        <p className="text-white/80 text-lg">
                            <strong className="text-white">34,000+ BS students</strong> are scattered across India.
                            Most can't attend Paradox in Chennai.
                        </p>
                    </motion.div>

                    {/* Solution Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 }}
                        className="bg-ekatva-teal/10 border border-ekatva-teal/20 rounded-2xl p-6 md:p-8 mb-12"
                    >
                        <h3 className="text-xl font-bold text-ekatva-teal mb-3">The Solution</h3>
                        <p className="text-white/80 text-lg">
                            <strong className="text-white">10 regional fests</strong> across India. Every year.
                            Every student gets to experience the joy of a true college fest.
                        </p>
                    </motion.div>

                    {/* Proof Points */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="space-y-4"
                    >
                        <h4 className="text-lg font-semibold text-white/90 mb-4">The Proof:</h4>
                        {PROOF_POINTS.map((point, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <CheckCircle size={20} className="text-ekatva-teal mt-0.5 flex-shrink-0" />
                                <span className="text-white/80">{point.text}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ============ SECTION 3: VALUE PROPOSITIONS ============ */}
            <section className="py-24 lg:py-32 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
                <div className="container-custom">
                    <SectionBadge>WHY PARTNER</SectionBadge>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-12"
                    >
                        What's In It For Your Society?
                    </motion.h2>

                    {/* Tab Navigation */}
                    <div className="flex justify-center gap-2 md:gap-4 flex-wrap mb-10">
                        {VALUE_TABS.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-full text-sm md:text-base font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-ekatva-teal text-oneness-black'
                                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                {tab.icon}
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {VALUE_TABS.map((tab) => (
                            activeTab === tab.id && (
                                <motion.div
                                    key={tab.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="max-w-3xl mx-auto"
                                >
                                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 lg:p-10">
                                        <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
                                            {tab.headline}
                                        </h3>

                                        <ul className="space-y-4 mb-8">
                                            {tab.benefits.map((benefit, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <CheckCircle size={20} className="text-unity-gold mt-0.5 flex-shrink-0" />
                                                    <span className="text-white/80">{benefit}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {tab.testimonial && (
                                            <blockquote className="border-l-2 border-unity-gold pl-4 py-2 bg-unity-gold/5 rounded-r-lg">
                                                <p className="text-white/70 italic mb-2">"{tab.testimonial.quote}"</p>
                                                <cite className="text-sm text-white/50 not-italic">
                                                    — {tab.testimonial.author}, {tab.testimonial.role}
                                                </cite>
                                            </blockquote>
                                        )}

                                        {tab.useCases && (
                                            <div className="mt-6 pt-6 border-t border-white/10">
                                                <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                                                    Use Cases
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {tab.useCases.map((uc, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-white/70">
                                                            {uc}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {tab.examples && (
                                            <div className="mt-6 pt-6 border-t border-white/10">
                                                <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                                                    Examples
                                                </h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {tab.examples.map((ex, i) => (
                                                        <div key={i} className="p-3 bg-white/5 rounded-lg">
                                                            <div className="font-medium text-white text-sm">{ex.name}</div>
                                                            <div className="text-xs text-white/50">{ex.desc}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        ))}
                    </AnimatePresence>
                </div>
            </section>

            {/* ============ SECTION 4: GOVERNING BODY MODEL ============ */}
            <section className="py-24 lg:py-32">
                <div className="container-custom max-w-5xl">
                    <SectionBadge>PARTNERSHIP MODEL</SectionBadge>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-6"
                    >
                        The Governing Body Model
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-white/70 text-center max-w-2xl mx-auto mb-12"
                    >
                        EKATVA isn't led by one society. It's a <strong className="text-white">co-equal partnership</strong> between all partner societies.
                    </motion.p>

                    {/* Two Column Grid */}
                    <div className="grid md:grid-cols-2 gap-6 mb-10">
                        {/* From Your Society */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-unity-gold/10 border border-unity-gold/20 rounded-2xl p-6 md:p-8"
                        >
                            <h3 className="text-xl font-bold text-unity-gold mb-4 flex items-center gap-2">
                                <ArrowRight size={20} />
                                From Your Society
                            </h3>
                            <ul className="space-y-3">
                                {SOCIETY_COMMITMENTS.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle size={18} className="text-unity-gold mt-0.5 flex-shrink-0" />
                                        <span className="text-white/80 text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* From EKATVA */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="bg-ekatva-teal/10 border border-ekatva-teal/20 rounded-2xl p-6 md:p-8"
                        >
                            <h3 className="text-xl font-bold text-ekatva-teal mb-4 flex items-center gap-2">
                                <ArrowRight size={20} />
                                From EKATVA HQ
                            </h3>
                            <ul className="space-y-3">
                                {EKATVA_SUPPORT.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <CheckCircle size={18} className="text-ekatva-teal mt-0.5 flex-shrink-0" />
                                        <span className="text-white/80 text-sm">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    </div>

                    {/* Trust Signal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl max-w-lg mx-auto"
                    >
                        <Shield size={24} className="text-ekatva-teal" />
                        <p className="text-white/70 text-sm">
                            Backed by IIT Madras. Transparent operations. Democratic governance.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ============ SECTION 5: TESTIMONIALS ============ */}
            <section className="py-24 lg:py-32 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
                <div className="container-custom">
                    <SectionBadge>TESTIMONIALS</SectionBadge>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-12"
                    >
                        What Partners Are Saying
                    </motion.h2>

                    {/* Testimonial Carousel */}
                    <div className="max-w-3xl mx-auto relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={testimonialIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                                className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10 text-center"
                            >
                                <Quote size={40} className="text-unity-gold/30 mx-auto mb-6" />
                                <blockquote className="text-xl md:text-2xl text-white/90 italic mb-6 leading-relaxed">
                                    "{TESTIMONIALS[testimonialIndex].quote}"
                                </blockquote>
                                <div>
                                    <div className="font-semibold text-white">{TESTIMONIALS[testimonialIndex].author}</div>
                                    <div className="text-sm text-white/60">
                                        {TESTIMONIALS[testimonialIndex].role}, {TESTIMONIALS[testimonialIndex].society}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {/* Navigation */}
                        <div className="flex justify-center gap-4 mt-6">
                            <button
                                onClick={prevTestimonial}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                                aria-label="Previous testimonial"
                            >
                                <ChevronLeft size={20} className="text-white" />
                            </button>
                            <div className="flex items-center gap-2">
                                {TESTIMONIALS.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setTestimonialIndex(i)}
                                        className={`w-2 h-2 rounded-full transition-colors ${i === testimonialIndex ? 'bg-ekatva-teal' : 'bg-white/30'
                                            }`}
                                        aria-label={`Go to testimonial ${i + 1}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={nextTestimonial}
                                className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-colors"
                                aria-label="Next testimonial"
                            >
                                <ChevronRight size={20} className="text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ SECTION 6: PROCESS TIMELINE ============ */}
            <section className="py-24 lg:py-32">
                <div className="container-custom max-w-4xl">
                    <SectionBadge>GETTING STARTED</SectionBadge>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-12"
                    >
                        What Happens Next?
                    </motion.h2>

                    {/* Timeline */}
                    <div className="relative">
                        {/* Line */}
                        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-ekatva-teal/50 via-unity-gold/50 to-ekatva-teal/50 -translate-x-1/2" />

                        {PROCESS_STEPS.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className={`relative flex items-start gap-6 mb-10 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                                    }`}
                            >
                                {/* Number Circle */}
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-ekatva-teal flex items-center justify-center text-oneness-black font-bold text-lg z-10 md:absolute md:left-1/2 md:-translate-x-1/2">
                                    {i + 1}
                                </div>

                                {/* Content */}
                                <div className={`flex-1 md:w-[calc(50%-3rem)] ${i % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                                        <div className={`flex items-center gap-3 mb-2 ${i % 2 === 0 ? 'md:justify-end' : ''}`}>
                                            <div className="text-ekatva-teal">{step.icon}</div>
                                            <h3 className="text-lg font-bold text-white">{step.title}</h3>
                                        </div>
                                        <p className="text-white/70 text-sm mb-2">{step.description}</p>
                                        <span className="inline-block px-2 py-0.5 bg-white/5 rounded text-xs text-white/50">
                                            {step.duration}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Timeline Footer */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex items-center justify-center gap-3 p-4 bg-ekatva-teal/10 border border-ekatva-teal/20 rounded-xl max-w-md mx-auto mt-8"
                    >
                        <Clock size={20} className="text-ekatva-teal" />
                        <p className="text-white/80">
                            <strong className="text-white">Timeline:</strong> From interest to onboarded in ~1 week.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* ============ SECTION 7: FINAL CTA ============ */}
            <section className="py-24 lg:py-32 bg-gradient-to-b from-[#0A2329] to-oneness-black">
                <div className="container-custom text-center max-w-3xl">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6"
                    >
                        Ready to Bring Your Society Into{' '}
                        <span className="text-unity-gold italic">EKATVA</span>?
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-white/70 mb-10"
                    >
                        Join 10+ partner societies building India's regional fest movement.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
                    >
                        <motion.button
                            onClick={() => setShowPartnerForm(true)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-8 py-4 bg-unity-gold text-oneness-black font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(255,207,150,0.4)] transition-all"
                        >
                            Express Partnership Interest
                            <ArrowRight size={20} />
                        </motion.button>

                        <a
                            href="#video"
                            className="px-8 py-4 bg-white/5 border border-white/20 text-white font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                        >
                            <ArrowUp size={18} />
                            Re-watch Pitch Video
                        </a>
                    </motion.div>

                    {/* Contact Fallback */}
                    <p className="text-sm text-white/50">
                        Have questions? Email us at{' '}
                        <a
                            href="mailto:partner@ekatva.org"
                            className="text-ekatva-teal hover:underline"
                        >
                            partner@ekatva.org
                        </a>
                    </p>
                </div>
            </section>

            {/* Partner Form Modal */}
            <AnimatePresence>
                {showPartnerForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
                        onClick={() => setShowPartnerForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gradient-to-b from-[#0E2F36] to-[#0A2329] border border-white/20 rounded-2xl p-6 md:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
                        >
                            <PartnerInterestForm onClose={() => setShowPartnerForm(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </main>
    )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SectionBadge({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="flex justify-center mb-6"
        >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ekatva-teal/30 bg-ekatva-teal/10">
                <div className="w-2 h-2 rounded-full bg-ekatva-teal animate-pulse" />
                <span className="text-ekatva-teal text-xs tracking-widest uppercase font-medium">
                    {children}
                </span>
            </div>
        </motion.div>
    )
}

function VideoPlaceholder() {
    return (
        <div className="aspect-video bg-gradient-to-br from-[#0A2329] to-[#0E2F36] rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden relative">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-ekatva-teal/5 to-unity-gold/5 animate-pulse" />

            <div className="relative text-center p-8">
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 cursor-pointer"
                >
                    <Play size={40} className="text-white ml-2" />
                </motion.div>

                <h3 className="text-2xl font-bold text-white mb-2">
                    Partnership Pitch Video
                </h3>

                <p className="text-white/70 mb-4">
                    Coming Soon
                </p>

                <p className="text-sm text-white/50 max-w-md mx-auto">
                    We're filming the complete EKATVA partnership pitch.
                    Meanwhile, scroll down to read what we're building.
                </p>
            </div>
        </div>
    )
}
