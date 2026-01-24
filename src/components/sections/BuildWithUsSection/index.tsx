'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Users,
    Rocket,
    Heart,
    ArrowRight,
    CheckCircle,
    ExternalLink,
    Shield,
    Globe,
    X
} from 'lucide-react'
import './buildWithUs.css'

// Import real form components
import {
    PartnerInterestForm,
    TeamApplicationForm,
    CityProposalForm,
    CityInterestForm
} from './forms'

import { Modal } from '../../ui/Modal'


// ============================================================================
// SECTION 5: BUILD WITH US - Premium Conversion Section
// ============================================================================

/**
 * BuildWithUsSection - The Movement Needs You
 * 
 * Purpose: Convert visitors into contributors through 3 clear pathways
 * 
 * Architecture:
 * ✅ 3 Pathway Cards (Partner, Team, Community)
 * ✅ Trust Signals Bar
 * ✅ Modal System for Forms
 * ✅ Premium animations and hover states
 * ✅ Fully responsive
 */

// ============================================================================
// DATA DEFINITIONS
// ============================================================================

interface PathwayCardData {
    id: string
    badge: string
    badgeColor: 'gold' | 'teal' | 'white'
    icon: React.ReactNode
    headline: string
    description: string
    benefits: string[]
    testimonial?: {
        quote: string
        author: string
    }
    primaryCTA: {
        text: string
        action: string
        icon?: React.ReactNode
    }
    secondaryCTA?: {
        text: string
        action: string
        badge?: string
    }
    accentColor: string
    glowColor: string
    departments?: typeof DEPARTMENTS
}

const DEPARTMENTS = [
    { name: 'Content', icon: '✍️' },
    { name: 'Cultural', icon: '🎭' },
    { name: 'Technical', icon: '💻' },
    { name: 'Transport', icon: '🚌' },
    { name: 'Volunteers', icon: '🤝' },
    { name: 'Sponsor', icon: '💼' },
    { name: 'Media', icon: '📸' }
]

const PATHWAYS: PathwayCardData[] = [
    {
        id: 'partner',
        badge: 'FOR STUDENT BODIES',
        badgeColor: 'gold',
        icon: <Users size={32} strokeWidth={1.5} />,
        headline: 'Bring Your Society Into EKATVA',
        description: 'We spent a week pitching to 10 houses individually for EKATVA Hyderabad. Never again. Watch one video. Read one deck. Decide if this is bigger than leaderboards.',
        benefits: [
            'Regional exposure for your society (10 cities)',
            'Showcase talent at every EKATVA edition',
            'Collaborate, don\'t compete with other societies',
            'Part of Governing Body (co-equal partnership)',
            'Students see you beyond online lectures'
        ],
        testimonial: {
            quote: 'EKATVA isn\'t about one house winning. It\'s about all of us building something that outlasts our degrees.',
            author: 'SVCAN, Co-Founder'
        },
        primaryCTA: {
            text: 'Watch Partnership Pitch',
            action: '/partner-with-us',
            icon: <ArrowRight size={18} />
        },
        secondaryCTA: {
            text: 'Express Interest',
            action: 'modal:partner-interest'
        },
        accentColor: '#FFCF96',
        glowColor: 'rgba(255, 207, 150, 0.3)'
    },
    {
        id: 'team',
        badge: 'FOR CONTRIBUTORS',
        badgeColor: 'teal',
        icon: <Rocket size={32} strokeWidth={1.5} />,
        headline: 'Build EKATVA From The Inside',
        description: 'EKATVA isn\'t run by passive volunteers. It\'s built by dedicated teams across 7 departments. This isn\'t helping out. This is becoming part of the core engine.',
        benefits: [
            'Join one of 7 specialized departments',
            'Work with talented student leaders',
            'Build real skills (not just certificate)',
            'National recognition for your work',
            'Shape the future of 10 regional fests'
        ],
        primaryCTA: {
            text: 'Apply to Join Team',
            action: 'modal:team-application',
            icon: <ArrowRight size={18} />
        },
        secondaryCTA: {
            text: 'Propose Your City',
            action: 'modal:city-proposal',
            badge: 'GB Only'
        },
        accentColor: '#5CE6C9',
        glowColor: 'rgba(92, 230, 201, 0.3)',
        departments: DEPARTMENTS
    },
    {
        id: 'community',
        badge: 'FOR EVERYONE',
        badgeColor: 'white',
        icon: <Heart size={32} strokeWidth={1.5} />,
        headline: 'Be Part of Something Bigger',
        description: 'You don\'t need to organize or commit 10 hours a week. Just stay connected. Attend when it comes to your city. Meet your batchmates IRL.',
        benefits: [
            'Join EKATVA WhatsApp community',
            'Early access to event registrations',
            'Connect with 600+ students nationwide',
            'Behind-the-scenes updates',
            'Exclusive content (photos, videos, stories)'
        ],
        testimonial: {
            quote: 'I came alone. I left with 15 new friends and finally felt like I\'m part of IITM.',
            author: 'Attendee, EKATVA Hyderabad'
        },
        primaryCTA: {
            text: 'Join Community',
            action: 'external:whatsapp',
            icon: <ExternalLink size={18} />
        },
        secondaryCTA: {
            text: 'Bring EKATVA to Your City',
            action: 'modal:city-interest'
        },
        accentColor: '#FFFFFF',
        glowColor: 'rgba(255, 255, 255, 0.2)'
    }
]

// WhatsApp Community Link
const WHATSAPP_LINK = 'https://chat.whatsapp.com/Do3WvVMprMe3xZtcuyfYiW'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BuildWithUsSection() {
    const [activeModal, setActiveModal] = useState<string | null>(null)

    const handleCTA = useCallback((action: string) => {
        if (action.startsWith('modal:')) {
            setActiveModal(action.replace('modal:', ''))
        } else if (action.startsWith('external:')) {
            const type = action.replace('external:', '')
            if (type === 'whatsapp') {
                window.open(WHATSAPP_LINK, '_blank', 'noopener,noreferrer')
            }
        } else {
            // Navigate to page (Next.js Link would be better, but this works for CTAs)
            window.location.href = action
        }
    }, [])

    const closeModal = useCallback(() => setActiveModal(null), [])

    return (
        <section
            id="build-with-us"
            className="build-with-us-section relative min-h-screen overflow-hidden"
            aria-labelledby="build-with-us-title"
        >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-radial-teal opacity-40 animate-pulse-slow" />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />

            {/* Content */}
            <div className="relative z-10 container-custom py-24 md:py-32 lg:py-40">

                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center mb-16 md:mb-20 lg:mb-24"
                >
                    {/* Section Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ekatva-teal/30 bg-ekatva-teal/10 mb-6"
                    >
                        <div className="w-2 h-2 rounded-full bg-ekatva-teal animate-pulse" />
                        <span className="text-ekatva-teal text-xs tracking-widest uppercase font-medium">
                            Join The Movement
                        </span>
                    </motion.div>

                    <h2
                        id="build-with-us-title"
                        className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight"
                    >
                        This Movement{' '}
                        <span className="text-unity-gold italic">Needs You.</span>
                    </h2>

                    <p className="text-lg md:text-xl lg:text-2xl text-mid-gray max-w-3xl mx-auto leading-relaxed">
                        Three ways to contribute.<br className="hidden sm:block" />
                        One mission: unite IITM BS students across India.<br className="hidden sm:block" />
                        <span className="text-white/90 font-medium">Choose your path.</span>
                    </p>
                </motion.div>

                {/* Pathway Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10 max-w-7xl mx-auto mb-16 md:mb-20">
                    {PATHWAYS.map((pathway, index) => (
                        <PathwayCard
                            key={pathway.id}
                            pathway={pathway}
                            index={index}
                            onCTA={handleCTA}
                        />
                    ))}
                </div>

                {/* Trust Signals Bar */}
                <TrustSignals />

            </div>

            {/* Modal System */}
            <AnimatePresence>
                {activeModal && (
                    <Modal onClose={closeModal}>
                        {activeModal === 'partner-interest' && <PartnerInterestForm onClose={closeModal} />}
                        {activeModal === 'team-application' && <TeamApplicationForm onClose={closeModal} />}
                        {activeModal === 'city-proposal' && <CityProposalForm onClose={closeModal} />}
                        {activeModal === 'city-interest' && <CityInterestForm onClose={closeModal} />}
                    </Modal>
                )}
            </AnimatePresence>
        </section>
    )
}

// ============================================================================
// PATHWAY CARD COMPONENT
// ============================================================================

interface PathwayCardProps {
    pathway: PathwayCardData
    index: number
    onCTA: (action: string) => void
}

function PathwayCard({ pathway, index, onCTA }: PathwayCardProps) {
    return (
        <motion.article
            initial={{ opacity: 0, y: 60, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{
                duration: 0.7,
                delay: index * 0.15,
                ease: [0.16, 1, 0.3, 1]
            }}
            whileHover={{
                y: -12,
                transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
            }}
            className="pathway-card group"
            style={{
                '--accent-color': pathway.accentColor,
                '--glow-color': pathway.glowColor
            } as React.CSSProperties}
            aria-labelledby={`pathway-${pathway.id}-title`}
        >
            {/* Top accent bar - reveals on hover */}
            <div className="accent-bar" aria-hidden="true" />

            {/* Card Content */}
            <div className="p-6 md:p-8 flex flex-col h-full">

                {/* Badge */}
                <span className={`pathway-badge badge-${pathway.badgeColor}`}>
                    {pathway.badge}
                </span>

                {/* Icon Circle */}
                <div className="icon-circle mt-6 mb-5" aria-hidden="true">
                    {pathway.icon}
                </div>

                {/* Headline */}
                <h3
                    id={`pathway-${pathway.id}-title`}
                    className="text-xl md:text-2xl lg:text-[1.65rem] font-bold text-white mb-3 leading-tight"
                >
                    {pathway.headline}
                </h3>

                {/* Description */}
                <p className="text-sm md:text-base text-mid-gray mb-5 leading-relaxed">
                    {pathway.description}
                </p>

                {/* Benefits List */}
                <ul className="space-y-2.5 mb-6 flex-grow" role="list">
                    {pathway.benefits.map((benefit, i) => (
                        <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.4 + (i * 0.08) }}
                            className="flex items-start gap-2.5 text-sm text-light-gray"
                        >
                            <CheckCircle
                                size={16}
                                className="mt-0.5 flex-shrink-0"
                                style={{ color: pathway.accentColor }}
                            />
                            <span>{benefit}</span>
                        </motion.li>
                    ))}
                </ul>

                {/* Departments Preview (Team card only) */}
                {pathway.departments && (
                    <div className="departments-preview mb-5">
                        <p className="text-xs font-semibold text-white/80 mb-3 uppercase tracking-wider">
                            7 Departments:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {pathway.departments.map(dept => (
                                <span
                                    key={dept.name}
                                    className="dept-tag"
                                >
                                    <span className="mr-1">{dept.icon}</span>
                                    {dept.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Testimonial (if exists) */}
                {pathway.testimonial && (
                    <blockquote className="testimonial-box mb-5">
                        <p className="text-sm italic text-white/70 mb-2 leading-relaxed">
                            "{pathway.testimonial.quote}"
                        </p>
                        <cite className="text-xs text-white/50 not-italic font-medium">
                            — {pathway.testimonial.author}
                        </cite>
                    </blockquote>
                )}

                {/* CTAs */}
                <div className="flex flex-col gap-3 mt-auto pt-2">
                    <motion.button
                        onClick={() => onCTA(pathway.primaryCTA.action)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="primary-cta"
                    >
                        <span>{pathway.primaryCTA.text}</span>
                        {pathway.primaryCTA.icon}
                    </motion.button>

                    {pathway.secondaryCTA && (
                        <motion.button
                            onClick={() => onCTA(pathway.secondaryCTA!.action)}
                            whileHover={{ x: 4 }}
                            className="secondary-cta"
                        >
                            <span>{pathway.secondaryCTA.text}</span>
                            {pathway.secondaryCTA.badge && (
                                <span className="secondary-badge">
                                    {pathway.secondaryCTA.badge}
                                </span>
                            )}
                        </motion.button>
                    )}
                </div>

            </div>
        </motion.article>
    )
}

// ============================================================================
// TRUST SIGNALS COMPONENT
// ============================================================================

function TrustSignals() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center"
        >
            <div className="trust-signals-bar">
                <TrustStat
                    icon={<Shield size={20} />}
                    value="IIT Madras"
                    label="Backed By"
                />
                <div className="trust-divider" aria-hidden="true" />
                <TrustStat
                    icon={<Users size={20} />}
                    value="600+"
                    label="Students"
                />
                <div className="trust-divider" aria-hidden="true" />
                <TrustStat
                    icon={<Globe size={20} />}
                    value="10"
                    label="Cities"
                />
            </div>
        </motion.div>
    )
}

function TrustStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-ekatva-teal">{icon}</div>
            <div className="text-left">
                <div className="text-base md:text-lg font-bold text-white leading-none">{value}</div>
                <div className="text-[11px] text-white/60 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
        </div>
    )
}

// ============================================================================
// SHARED MODAL COMPONENT IMPORTED
// ============================================================================


