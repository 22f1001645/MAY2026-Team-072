'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight } from 'lucide-react'

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
        role: 'Co-Lead, EKATVA',
        tagline: 'Turned vision into flawless execution when it mattered most',
        hiddenQuote: 'From concept to celebration—led every step with precision',
        organization: 'Pravāha',
        photo: '/images/team/vishal-bhandari.png',
    },
    {
        id: 'saiteja',
        name: 'Sai Teja B',
        role: 'Co-Lead, EKATVA',
        tagline: 'Turned operational chaos into coordinated magic',
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
        role: 'Safety & Security',
        tagline: 'Ensured 230 students felt safe and secure',
        hiddenQuote: 'Every attendee\'s safety was my responsibility',
        organization: 'Pravāha',
        photo: '/images/team/prakash-thandra.png',
    },
    {
        id: 'praharsha',
        name: 'Praharsha Surampudi',
        role: 'Logistics & Coordination',
        tagline: 'Synchronized 15 moving parts into one seamless experience',
        hiddenQuote: 'The devil was in the details, and I loved it',
        organization: 'Pravāha',
        photo: '/images/team/praharsha.png',
    },
    {
        id: 'shiva',
        name: 'Shiva Kumar',
        role: 'Operations Lead',
        tagline: 'Turned chaos into clockwork precision',
        hiddenQuote: 'Every backup plan had a backup plan',
        organization: 'Saranda',
        photo: '/images/team/shiva.png',
    },
    {
        id: 'saiprakash',
        name: 'Sai Prakash',
        role: 'Ground Operations',
        tagline: 'Made sure the ground reality matched the vision',
        hiddenQuote: 'If it needed to happen on the day, I made it happen',
        organization: 'Kaziranga',
        photo: '/images/team/sai-prakash.png',
    },
    {
        id: 'arnav',
        name: 'Arnav Reddy',
        role: 'Venue & Logistics',
        tagline: 'Transformed Ripplez into our home for the day',
        hiddenQuote: 'Every chair, every mic, every wire—my responsibility',
        organization: 'Kanha',
        photo: '/images/team/arnav.png',
    },
    {
        id: 'varshith',
        name: 'Varshith Goud',
        role: 'Guest Relations',
        tagline: 'Ensured every guest felt welcomed and valued',
        hiddenQuote: 'First impressions are everything',
        organization: 'Periyar',
        photo: '/images/team/varshith.png',
    },
    {
        id: 'chirag',
        name: 'Chirag Rao',
        role: 'Technical Coordination',
        tagline: 'Kept the tech running flawlessly behind the scenes',
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
        title: 'Transportation Team',
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
    const [openCommunities, setOpenCommunities] = useState<Set<string>>(new Set())
    const [masterAccordionOpen, setMasterAccordionOpen] = useState(true)
    const [openExtendedTeams, setOpenExtendedTeams] = useState<Set<string>>(new Set())

    const toggleCommunity = (id: string) => {
        setOpenCommunities(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleExtendedTeam = (id: string) => {
        setOpenExtendedTeams(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
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
                    className="team-header"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h1 className="team-title">Built By Believers</h1>
                    <p className="team-subtitle">
                        From late-night planning to the final bow—these are the architects of Ekatva Hyderabad 2025.
                    </p>
                    <div className="team-divider" />
                </motion.header>

                {/* ============================================
            TIER 1: THE CORE SPARK (Arc Formation)
            ============================================ */}
                <div className="tier-section tier-core-spark">
                    <div className="tier-label">
                        <span className="tier-icon">✨</span>
                        <span className="tier-text" style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '0.15em' }}>THE CORE SPARK</span>
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
                                            <span className="badge-icon">⭐</span>
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
                        <span className="tier-icon">🔥</span>
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
            TIER 3: PARTNER COMMUNITIES (Accordion)
            ============================================ */}
                <div className="tier-section tier-communities">
                    <div className="tier-label">
                        <span className="tier-icon">🏛️</span>
                        <span className="tier-text">Partner Communities</span>
                    </div>

                    <div className="communities-list">
                        {PARTNER_COMMUNITIES.map((community, index) => (
                            <motion.div
                                key={community.id}
                                className={`community-item ${openCommunities.has(community.id) ? 'open' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                            >
                                <button
                                    className="community-header"
                                    onClick={() => toggleCommunity(community.id)}
                                    aria-expanded={openCommunities.has(community.id)}
                                >
                                    <div className="header-left">
                                        <div className="community-logo-placeholder">
                                            {community.name.charAt(0)}
                                        </div>
                                        <h3 className="community-name">{community.name}</h3>
                                    </div>
                                    {openCommunities.has(community.id) ? (
                                        <ChevronDown className="toggle-icon" size={20} />
                                    ) : (
                                        <ChevronRight className="toggle-icon" size={20} />
                                    )}
                                </button>

                                {openCommunities.has(community.id) && (
                                    <motion.div
                                        className="community-members"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="members-grid">
                                            {community.representatives.map((rep, idx) => (
                                                <div key={idx} className="member-name-tag">
                                                    {rep}
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* ============================================
            TIER 4: EXTENDED FAMILY (Nested Accordion)
            ============================================ */}
                <div className="tier-section tier-extended">
                    <div className="tier-label">
                        <span className="tier-icon">🛠️</span>
                        <span className="tier-text">The Extended Family</span>
                    </div>

                    <div className="master-accordion">
                        <button
                            className="master-header"
                            onClick={() => setMasterAccordionOpen(!masterAccordionOpen)}
                            aria-expanded={masterAccordionOpen}
                        >
                            <div className="master-title-wrapper">
                                <span className="master-count">70+</span>
                                <h3 className="master-title">Contributors Made It Real</h3>
                            </div>
                            {masterAccordionOpen ? (
                                <ChevronDown className="master-toggle" size={28} />
                            ) : (
                                <ChevronRight className="master-toggle" size={28} />
                            )}
                        </button>

                        {masterAccordionOpen && (
                            <motion.div
                                className="master-content"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                transition={{ duration: 0.4 }}
                            >
                                {EXTENDED_TEAMS.map((team, index) => (
                                    <div
                                        key={team.id}
                                        className={`team-accordion ${openExtendedTeams.has(team.id) ? 'open' : ''}`}
                                    >
                                        <button
                                            className="team-header"
                                            onClick={() => toggleExtendedTeam(team.id)}
                                            aria-expanded={openExtendedTeams.has(team.id)}
                                        >
                                            <div className="team-title-group">
                                                <span className="team-emoji">{team.icon}</span>
                                                <h4 className="team-title">{team.title}</h4>
                                                <span className="team-count">({team.count})</span>
                                            </div>
                                            {openExtendedTeams.has(team.id) ? (
                                                <ChevronDown className="team-toggle" size={20} />
                                            ) : (
                                                <ChevronRight className="team-toggle" size={20} />
                                            )}
                                        </button>

                                        {openExtendedTeams.has(team.id) && (
                                            <motion.div
                                                className="team-content"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="team-members-grid">
                                                    {team.members.map((member, idx) => (
                                                        <motion.div
                                                            key={idx}
                                                            className="team-member-tag"
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                                                        >
                                                            <span className="member-name">{member.name}</span>
                                                            {member.society && (
                                                                <span className="member-society">({member.society})</span>
                                                            )}
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </div>
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
