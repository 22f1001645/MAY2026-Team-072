'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Users, Sparkles, Star, Zap } from 'lucide-react'
import { PartnerGrid } from '../partners/PartnerGrid'
import '@/styles/PartnerGrid.css'

// ============================================
// DATA STRUCTURES
// ============================================

interface TeamMember {
    id: string
    name: string
    role: string
    tagline: string
    hiddenQuote: string
    organization: string
    photo?: string
    signature?: string
}

interface Society {
    id: string
    name: string
    logo?: string
    representatives: string[]
}

interface ExtendedTeam {
    id: string
    title: string
    icon: string
    count: number
    members: Array<{ name: string; society?: string }>
}

// ============================================
// TIER 1: THE CORE SPARK (Top 3)
// ============================================

const CORE_SPARK: TeamMember[] = [
    {
        id: 'kothai',
        name: 'Kothai Ma\'am',
        role: 'Head of Student Affairs',
        tagline: 'Made the impossible possible with ₹2.4L budget approval',
        hiddenQuote: 'Believed in the vision when uncertainty was at its peak',
        organization: 'IIT Madras',
        photo: '/images/team/kothai-maam.png',
    },
    {
        id: 'vishal',
        name: 'Vishal Bhandari',
        role: 'Edition Head',
        tagline: 'Unified the houses, led the team, and made the impossible happen',
        hiddenQuote: 'From concept to celebration—led every step with precision',
        organization: 'Pravāha',
        photo: '/images/team/vishal-bhandari.png',
    },
    {
        id: 'saiteja',
        name: 'Sai Teja B',
        role: 'Edition Head',
        tagline: 'Designed the logo, built the brand, managed the foundation from scratch',
        hiddenQuote: 'The operational backbone under immense pressure',
        organization: 'Paradox',
        photo: '/images/team/sai-teja.png',
    },
]

// ============================================
// TIER 2: THE CORE EXECUTIVE (7 People)
// ============================================

const CORE_EXECUTIVE: TeamMember[] = [
    {
        id: 'prakash',
        name: 'Prakash Thandra',
        role: 'Operations Lead',
        tagline: 'Day 0 to finale—negotiated venues, set up transport, the silent force',
        hiddenQuote: 'Every attendee\'s safety was my responsibility',
        organization: 'Pravāha',
        photo: '/images/team/prakash-thandra.png',
    },
    {
        id: 'praharsha',
        name: 'Praharsha Surampudi',
        role: 'Culturals & Activities',
        tagline: 'Through personal struggles, anchored events and coordinated culturals—always showed up',
        hiddenQuote: 'The devil was in the details, and I loved it',
        organization: 'Pravāha',
        photo: '/images/team/praharsha.png',
    },
    {
        id: 'shiva',
        name: 'Shiva Kumar',
        role: 'Venue & Logistics',
        tagline: 'Negotiated the venue from ₹80K to ₹45K and optimized every resource',
        hiddenQuote: 'Every backup plan had a backup plan',
        organization: 'Saranda',
        photo: '/images/team/shiva.png',
    },
    {
        id: 'saiprakash',
        name: 'Sai Prakash',
        role: 'PR & Registrations',
        tagline: 'Built the PR team from scratch, filtered candidates, and welcomed every attendee',
        hiddenQuote: 'If it needed to happen on the day, I made it happen',
        organization: 'Kaziranga',
        photo: '/images/team/sai-prakash.png',
    },
    {
        id: 'arnav',
        name: 'Arnav Reddy',
        role: 'Transport & Operations',
        tagline: 'Transport setup, operations support—the go-to when it mattered most',
        hiddenQuote: 'Every chair, every mic, every wire—my responsibility',
        organization: 'Kanha',
        photo: '/images/team/arnav.png',
    },
    {
        id: 'varshith',
        name: 'Varshith Goud',
        role: 'Transport',
        tagline: 'Managed transport logistics and kept operations moving—always ready to help',
        hiddenQuote: 'First impressions are everything',
        organization: 'Periyar',
        photo: '/images/team/varshith.png',
    },
    {
        id: 'chirag',
        name: 'Chirag Rao',
        role: 'Event Planning',
        tagline: 'Planned every moment, structured the flow, and ensured the magic happened',
        hiddenQuote: 'WiFi, sound, lights—no room for failure',
        organization: 'Namdapha',
        photo: '/images/team/chirag.png',
    },
]

// ============================================
// TIER 3: PARTNER COMMUNITIES (13 Houses)
// ============================================

const PARTNER_COMMUNITIES: Society[] = [
    { id: 'pravaha', name: 'Pravāha', representatives: ['Vishal Bhandari', 'Praharsha Surampudi'] },
    { id: 'namdapha', name: 'Namdapha', representatives: ['Sairaj Mishra', 'Mayank Verma'] },
    { id: 'kanha', name: 'Kanha', representatives: ['Drashti Shah', 'Ekansh Gupta', 'Shubh Patel'] },
    { id: 'kaziranga', name: 'Kaziranga', representatives: ['Vamshi Teja', 'Aditya Kumar'] },
    { id: 'saranda', name: 'Saranda', representatives: ['Pramodini Reddy', 'Rohan Singh'] },
    { id: 'periyar', name: 'Periyar', representatives: ['Ananya Iyer', 'Karthik Menon'] },
    { id: 'corbett', name: 'Corbett', representatives: ['Neha Sharma', 'Arjun Kapoor'] },
    { id: 'bandipur', name: 'Bandipur', representatives: ['Sneha Rao', 'Vikram Joshi'] },
    { id: 'ranthambore', name: 'Ranthambore', representatives: ['Priya Nair', 'Rahul Desai'] },
    { id: 'sundarbans', name: 'Sundarbans', representatives: ['Ishita Bose', 'Aniket Chatterjee'] },
    { id: 'gir', name: 'Gir', representatives: ['Kavya Patel', 'Harsh Mehta'] },
    { id: 'bannerghatta', name: 'Bannerghatta', representatives: ['Divya Kumar', 'Siddharth Reddy'] },
    { id: 'hemis', name: 'Hemis', representatives: ['Tenzin Dorje', 'Sonam Wangchuk'] },
]

// ============================================
// TIER 4: EXTENDED FAMILY (70+ People)
// ============================================

const EXTENDED_TEAMS: ExtendedTeam[] = [
    {
        id: 'regional',
        title: 'Regional Coordinators',
        icon: '📍',
        count: 12,
        members: [
            { name: 'Pramodini Reddy', society: 'Saranda' },
            { name: 'Vamshi Teja', society: 'Kaziranga' },
            { name: 'Sairaj Mishra', society: 'Namdapha' },
            { name: 'Mayank Verma', society: 'Namdapha' },
            { name: 'Drashti Shah', society: 'Kanha' },
            { name: 'Ekansh Gupta', society: 'Kanha' },
            { name: 'Shubh Patel', society: 'Kanha' },
            { name: 'Aditya Kumar', society: 'Kaziranga' },
            { name: 'Rohan Singh', society: 'Saranda' },
            { name: 'Ananya Iyer', society: 'Periyar' },
            { name: 'Karthik Menon', society: 'Periyar' },
            { name: 'Neha Sharma', society: 'Corbett' },
        ],
    },
    {
        id: 'design',
        title: 'Design & Video Team',
        icon: '🎨',
        count: 8,
        members: [
            { name: 'Aryan Desai', society: 'Pravāha' },
            { name: 'Meera Krishnan', society: 'Periyar' },
            { name: 'Kabir Mehta', society: 'Gir' },
            { name: 'Riya Shankar', society: 'Bandipur' },
            { name: 'Dev Patel', society: 'Kanha' },
            { name: 'Sakshi Agarwal', society: 'Ranthambore' },
            { name: 'Aarav Singh', society: 'Corbett' },
            { name: 'Tanvi Reddy', society: 'Bannerghatta' },
        ],
    },
    {
        id: 'transport',
        title: 'Logistics & Transportation',
        icon: '🚗',
        count: 5,
        members: [
            { name: 'Vivek Sharma', society: 'Namdapha' },
            { name: 'Prateek Jain', society: 'Kaziranga' },
            { name: 'Aditi Kulkarni', society: 'Sundarbans' },
            { name: 'Nikhil Rao', society: 'Bandipur' },
            { name: 'Pooja Nair', society: 'Hemis' },
        ],
    },
    {
        id: 'volunteers',
        title: 'Volunteers Team',
        icon: '🤝',
        count: 4,
        members: [
            { name: 'Anjali Verma', society: 'Pravāha' },
            { name: 'Rohit Kumar', society: 'Saranda' },
            { name: 'Sneha Iyer', society: 'Periyar' },
            { name: 'Akash Reddy', society: 'Bannerghatta' },
        ],
    },
    {
        id: 'cultural',
        title: 'Cultural Performers',
        icon: '🎭',
        count: 10,
        members: [
            { name: 'Nisha Patel', society: 'Gir' },
            { name: 'Karan Malhotra', society: 'Ranthambore' },
            { name: 'Isha Kapoor', society: 'Corbett' },
            { name: 'Rahul Joshi', society: 'Namdapha' },
            { name: 'Diya Sharma', society: 'Kanha' },
            { name: 'Arjun Nair', society: 'Periyar' },
            { name: 'Prachi Desai', society: 'Sundarbans' },
            { name: 'Varun Reddy', society: 'Bannerghatta' },
            { name: 'Mira Singh', society: 'Hemis' },
            { name: 'Aditya Kulkarni', society: 'Bandipur' },
        ],
    },
    {
        id: 'pr',
        title: 'PR & Hospitality',
        icon: '📢',
        count: 5,
        members: [
            { name: 'Simran Kaur', society: 'Pravāha' },
            { name: 'Manav Jain', society: 'Kaziranga' },
            { name: 'Ritu Agarwal', society: 'Gir' },
            { name: 'Siddharth Menon', society: 'Ranthambore' },
            { name: 'Kavya Reddy', society: 'Bannerghatta' },
        ],
    },
    {
        id: 'photography',
        title: 'Photography & Videography',
        icon: '📸',
        count: 2,
        members: [
            { name: 'Vikram Choudhary', society: 'Namdapha' },
            { name: 'Ananya Sharma', society: 'Sundarbans' },
        ],
    },
    {
        id: 'technical',
        title: 'Technical Team',
        icon: '💻',
        count: 1,
        members: [
            { name: 'Rajat Kumar', society: 'Hemis' },
        ],
    },
]

// ============================================
//COMPONENT
// ============================================

export function TeamSection() {
    const [activeCategory, setActiveCategory] = useState<string>('')
    const [contributorCount, setContributorCount] = useState(0)
    const [hasAnimated, setHasAnimated] = useState(false)
    const [masterAccordionOpen, setMasterAccordionOpen] = useState(true)

    // Count-up animation for Tier 4
    const countRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        if (!countRef.current || hasAnimated) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !hasAnimated) {
                        setHasAnimated(true)
                        let current = 0
                        const target = 70
                        const increment = Math.ceil(target / 50)
                        const timer = setInterval(() => {
                            current += increment
                            if (current >= target) {
                                setContributorCount(target)
                                clearInterval(timer)
                            } else {
                                setContributorCount(current)
                            }
                        }, 30)
                    }
                })
            },
            { threshold: 0.5 }
        )

        observer.observe(countRef.current)
        return () => observer.disconnect()
    }, [hasAnimated])

    const scrollToCategory = (id: string) => {
        const el = document.getElementById(`category-${id}`)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setActiveCategory(id)
        }
    }

    return (
        <section className="team-section">
            {/* Ambient Background Glow */}
            <div className="team-bg-glow" />

            <div className="team-container">
                {/* ============================================
            HEADER
            ============================================ */}
                <motion.header
                    className="team-header-main"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="label-pill">
                        <Users size={12} className="text-teal-400" />
                        <span>The Team</span>
                    </div>
                    <h2 className="section-headline">
                        The Architects of Ekatva <span className="text-highlight-gold">Hyderabad</span>
                    </h2>
                    <p className="section-subheadline">
                        From a November whiteboard to 230 changed lives—meet the believers who engineered the impossible.
                    </p>
                </motion.header>

                {/* ============================================
            TIER 1: THE CORE SPARK (Arc Formation)
            ============================================ */}
                <div className="tier-section tier-core-spark">
                    <div className="tier-label">
                        <span className="tier-icon"><Sparkles className="text-highlight-gold" size={20} /></span>
                        <span className="tier-text" style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.15em' }}>THE PILLARS</span>
                    </div>

                    <div className="core-spark-arc" style={{ gap: '60px' }}>
                        {CORE_SPARK.map((member, index) => (
                            <motion.div
                                key={member.id}
                                className={`core-card ${index === 1 ? 'featured' : ''}`}
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                            >
                                <div className="card-glass">

                                    {/* Holographic Border (v3.0) */}
                                    <div className="card-holographic-border" />

                                    {/* Photo */}
                                    <div className="photo-wrapper">
                                        <img
                                            src={member.photo || '/images/team/placeholder.jpg'}
                                            alt={member.name}
                                            className="member-photo"
                                        />
                                        {/* Film Grain Overlay */}
                                        <div className="photo-film-grain" />
                                    </div>

                                    {/* Content */}
                                    <div className="card-content">
                                        <h3 className="member-name">{member.name}</h3>

                                        <div className="member-badge badge-gold">
                                            <span className="badge-icon"><Star className="text-[#FFCF96] fill-[#FFCF96]" size={12} /></span>
                                            <span className="badge-text">{member.role}</span>
                                        </div>

                                        <p className="member-tagline">"{member.tagline}"</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* ============================================
            TIER 2: THE CORE EXECUTIVE (Grid)
            ============================================ */}
                <div className="tier-section tier-core-executive">
                    <div className="tier-label">
                        <span className="tier-icon"><Zap className="text-teal-400 fill-teal-400/20" size={20} /></span>
                        <span className="tier-text" style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.12em' }}>THE CORE EXECUTIVE</span>
                    </div>

                    <div className="core-executive-grid">
                        {CORE_EXECUTIVE.map((member, index) => (
                            <motion.div
                                key={member.id}
                                className="executive-card"
                                initial={{ opacity: 0, y: 50 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: index * 0.08 }}
                            >
                                <div className="card-glass">

                                    {/* Holographic Border */}
                                    <div className="card-holographic-border" />

                                    {/* Photo */}
                                    <div className="photo-wrapper">
                                        <img
                                            src={member.photo || '/images/team/placeholder.jpg'}
                                            alt={member.name}
                                            className="member-photo"
                                        />
                                        <div className="photo-film-grain" />
                                    </div>

                                    {/* Content */}
                                    <div className="card-content">
                                        <h3 className="member-name">{member.name}</h3>

                                        <div className="member-badge badge-teal">
                                            <span className="badge-icon">🛡️</span>
                                            <span className="badge-text">{member.role}</span>
                                        </div>

                                        <p className="member-tagline">"{member.tagline}"</p>
                                    </div>

                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>


                {/* ============================================
                    PARTNER COMMUNITIES - Precision Expansion Grid
                    ============================================ */}
                <PartnerGrid />


                {/* ============================================
            TIER 4: THE REGISTRY INDEX (Master Accordion)
            ============================================ */}
                <div className="tier-section tier-extended">
                    {/* Master Toggle Header */}
                    <button
                        className="registry-master-header"
                        onClick={() => setMasterAccordionOpen(!masterAccordionOpen)}
                    >
                        <h2 className="section-title">CONTRIBUTOR TEAMS</h2>

                        <div className="section-subtitle-wrapper">
                            <span className="animated-count-wrapper" ref={countRef}>
                                <span className="count-number">{contributorCount > 0 ? contributorCount : '00'}</span>
                                <span className="count-plus">+</span>
                            </span>
                            <span className="section-subtitle">
                                Contributors
                                <span className="separator">•</span>
                                <span className="highlight">The Hands & Hearts</span>
                            </span>
                        </div>

                        <div className="section-divider" />

                        <div className={`master-chevron ${masterAccordionOpen ? 'open' : ''}`}>
                            <ChevronDown size={20} />
                        </div>
                    </button>

                    {/* Registry Content */}
                    <AnimatePresence>
                        {masterAccordionOpen && (
                            <motion.div
                                className="registry-content-wrapper"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <div className="registry-list">
                                    {EXTENDED_TEAMS.map((team, index) => (
                                        <div key={team.id} className="registry-item">
                                            {/* Registry Row */}
                                            <button
                                                className={`registry-row ${activeCategory === team.id ? 'active' : ''}`}
                                                onClick={() => activeCategory === team.id ? setActiveCategory('') : setActiveCategory(team.id)}
                                            >
                                                <span className="registry-team-name">{team.title}</span>
                                                <div className="registry-dots" />
                                                <span className="registry-count">{team.members.length}</span>
                                                <div className={`registry-chevron ${activeCategory === team.id ? 'open' : ''}`}>
                                                    <ChevronRight size={16} />
                                                </div>
                                            </button>

                                            {/* Expansion Grid */}
                                            <AnimatePresence>
                                                {activeCategory === team.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.3 }}
                                                        className="registry-expansion"
                                                    >
                                                        <div className="registry-grid">
                                                            {team.members.map((member, idx) => (
                                                                <div key={idx} className="registry-card">
                                                                    <span className="reg-name">{member.name}</span>
                                                                    {member.society && (
                                                                        <span className="reg-society">{member.society}</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ============================================
            FOOTER: LEGACY MESSAGE & CTA
            ============================================ */}
                <motion.footer
                    className="team-footer"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="footer-content">
                        <h2 className="footer-title">This Was EKATVA Hyderabad</h2>
                        <p className="footer-message">
                            "To every volunteer who believed in the vision, every community that opened their doors,
                            and every student who said yes—this is your legacy."
                        </p>
                        <p className="footer-cta-text">Want to bring EKATVA to your city?</p>
                        <a href="/partner-with-us" className="footer-cta-button">
                            Nominate Your City →
                        </a>
                    </div>
                </motion.footer>
            </div>
        </section>
    )
}

export default TeamSection
