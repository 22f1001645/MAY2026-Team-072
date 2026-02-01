'use client'

/**
 * SECTION 6A: HOW EKATVA WORKS
 * 
 * Components:
 * - 5-Step Process (Horizontal row with expansion)
 * - Flat Hierarchy Bento Grid (with hover interactions)
 * - 7 Department Cards (with custom icons)
 * 
 * Priority Order:
 * 1. Organization Structure (Bento Grid)
 * 2. Process (5 steps)
 * 3. Department Teams
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './section6a.css';

// Process Step Data
const PROCESS_STEPS = [
    {
        id: 1,
        icon: 'unite',
        headline: 'Unite the Community',
        color: '#5CE6C9',
        shortDesc: 'Student bodies unite. Governing Body reviews the proposal. Regional groups organize across the city.',
        expandedContent: `EKATVA begins when student societies come together with a shared vision. The Governing Body (GB) — consisting of 12 UHC Houses and 20+ Student Societies — evaluates the proposal for feasibility, budget, and impact.

Once approved, students across the target city form regional groups. These groups identify local coordinators, assess venue options, and begin building the foundation for a fest that represents their community.

**Key Activities:**
• Proposal submission to GB
• Cross-society alignment meetings
• Regional coordinator recruitment
• Initial city-wide WhatsApp groups
• Feasibility assessment (venue, date, logistics)

**Timeline:** 4-6 weeks before event`
    },
    {
        id: 2,
        icon: 'build',
        headline: 'Build the Foundation',
        color: '#FFCF96',
        shortDesc: 'Spread the interest form. Find the perfect venue. Organize sponsors. Set up logistics within budget.',
        expandedContent: `With the green light from GB, the real work begins. An interest form is circulated across all IITM BS students in the city to gauge attendance, gather preferences, and build momentum.

Simultaneously, the organizing team scouts venues, reaches out to sponsors, creates detailed budgets, finalizes vendor contracts, and plans transport routes.

**Key Activities:**
• Interest form creation & distribution
• Venue finalization (Capacity: 200-300)
• Sponsor outreach & confirmation
• Budget allocation (Transport 30%, Food 25%, Activities 20%)
• Vendor contracts & logistics planning

**Timeline:** 3-4 weeks before event`
    },
    {
        id: 3,
        icon: 'design',
        headline: 'Design the Experience',
        color: '#5CE6C9',
        shortDesc: 'Plan inclusive activities. Design team-building games. Curate cultural performances matching the theme.',
        expandedContent: `EKATVA isn't about random activities — every element is designed to connect humans, not just entertain them.

The Content & Cultural teams collaborate to plan Speed Conversations, team-based games, cultural performances, food timing, and DJ night. Everything follows four design filters: Maximum Interaction, Radical Inclusivity, Non-Competitive, Cultural Familiarity.

**Key Activities:**
• Activity blueprint creation
• Cultural performance curation
• Team game design & pilot testing
• Material procurement
• Volunteer training

**Timeline:** 2-3 weeks before event`
    },
    {
        id: 4,
        icon: 'spread',
        headline: 'Spread the Word',
        color: '#FFCF96',
        shortDesc: 'Let everyone know. Marketing across platforms. Build excitement, answer questions, confirm attendance.',
        expandedContent: `EKATVA's success depends on one thing: students showing up with open hearts.

The Media & Content teams launch a multi-channel marketing campaign: Instagram Stories & Reels, WhatsApp announcements, email campaigns, posters, and word-of-mouth through Regional Coordinators.

The messaging is simple: "Free transport. Free food. Real people. One unforgettable day."

**Key Activities:**
• Content calendar creation
• Video teasers & promotional reels
• FAQ doc & Q&A sessions
• RSVP tracking & transport confirmation
• Last-minute reminders

**Timeline:** 2 weeks before event`
    },
    {
        id: 5,
        icon: 'memories',
        headline: 'Create Lasting Memories',
        color: '#FFFFFF',
        shortDesc: 'Execute flawlessly. Capture every moment. Let students create bonds that last beyond the fest.',
        expandedContent: `On event day, everything comes together. 230+ students arrive as strangers; they leave as friends, study groups, and lifelong connections.

The execution team ensures transport runs on time, food is abundant, activities flow smoothly, performances feel communal, and photography captures authentic joy. By night's end, students are exchanging numbers and asking "When's the next EKATVA?"

**Post-Event:**
• Aftermovie edited within 48 hours
• Feedback form sent (4.4/5 rating in Hyderabad)
• Memory Wall photos shared
• Debrief with organizing team
• Blueprint updated for next city

**Timeline:** Event day + 1 week post-event wrap-up`
    }
];

// Department Data
const DEPARTMENTS = [
    {
        id: 1,
        name: 'Content Team',
        icon: 'content',
        color: '#FF6B9D',
        skills: [
            'Writing & Storytelling',
            'Copywriting & Messaging',
            'Event Scripts & Narratives',
            'Post-Event Documentation'
        ]
    },
    {
        id: 2,
        name: 'Cultural Team',
        icon: 'cultural',
        color: '#FF8C42',
        skills: [
            'Performance Curation',
            'Artist Coordination',
            'Cultural Activity Design',
            'Stage Management'
        ]
    },
    {
        id: 3,
        name: 'Technical Team',
        icon: 'technical',
        color: '#4A90E2',
        skills: [
            'Website Development',
            'Registration Systems',
            'Tech Infrastructure',
            'Digital Tools & Automation'
        ]
    },
    {
        id: 4,
        name: 'Transport Team',
        icon: 'transport',
        color: '#7ED321',
        skills: [
            'Logistics Planning',
            'Pickup Point Coordination',
            'Travel Safety & Comfort',
            'Venue Selection'
        ]
    },
    {
        id: 5,
        name: 'Volunteers Team',
        icon: 'volunteers',
        color: '#9013FE',
        skills: [
            'On-Ground Support',
            'Attendee Experience',
            'Hospitality & Welcome',
            'Real-Time Problem Solving'
        ]
    },
    {
        id: 6,
        name: 'Sponsor Team',
        icon: 'sponsor',
        color: '#FFCF96',
        skills: [
            'Partnership Outreach',
            'Budget Management',
            'Fundraising Strategy',
            'Vendor Negotiations'
        ]
    },
    {
        id: 7,
        name: 'Media Team',
        icon: 'media',
        color: '#50E3C2',
        skills: [
            'Photography & Videography',
            'Social Media Management',
            'Marketing Campaigns',
            'Aftermovie Production'
        ]
    }
];

interface Section6AProps {
    className?: string;
}

export function Section6A({ className = '' }: Section6AProps) {
    const [expandedStep, setExpandedStep] = useState<number | null>(null);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    return (
        <section className={`section-6a ${className}`} id="how-ekatva-works">
            {/* Section Header */}
            <div className="section-header">
                <motion.h2
                    className="section-title"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    How EKATVA Works
                </motion.h2>
                <motion.p
                    className="section-subtitle"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                >
                    A movement ran by the community, for the community
                </motion.p>
            </div>

            {/* 2-COLUMN GRID: Process (Left) + Network/Flip Cards (Right) */}
            <div className="process-and-structure-grid">
                {/* LEFT COLUMN: 5-STEP PROCESS ACCORDION */}
                <div className="process-section">
                    <motion.h3
                        className="process-headline"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        How EKATVA Happens
                    </motion.h3>
                    <motion.p
                        className="process-subheadline"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        A proven 5-step blueprint, ready to scale.
                    </motion.p>

                    <div className="process-steps">
                        {PROCESS_STEPS.map((step, index) => (
                            <motion.div
                                key={step.id}
                                className={`process-step ${expandedStep === step.id ? 'expanded' : ''}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                                style={{
                                    '--step-color': step.color,
                                    willChange: 'transform, height', // GPU hint
                                    transform: 'translateZ(0)' // Force layer
                                } as React.CSSProperties}
                                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                            >
                                {/* Accordion Header Row */}
                                <div className="step-header">
                                    <div className="step-number">{step.id}</div>
                                    <div className="step-icon">
                                        <StepIcon type={step.icon} color={step.color} />
                                    </div>
                                    <div className="step-content">
                                        <h4 className="step-headline">{step.headline}</h4>
                                        <p className="step-short-desc">{step.shortDesc}</p>
                                    </div>
                                    <button
                                        className="step-expand-btn"
                                        aria-label={expandedStep === step.id ? 'Collapse' : 'Expand'}
                                        aria-expanded={expandedStep === step.id}
                                    >
                                        {expandedStep === step.id ? '−' : '+'}
                                    </button>
                                </div>

                                {/* Expanded Content */}
                                <AnimatePresence>
                                    {expandedStep === step.id && (
                                        <motion.div
                                            className="step-expanded-content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                        >
                                            <div className="expanded-inner">
                                                {step.expandedContent.split('\n\n').map((paragraph, idx) => (
                                                    <p key={idx} className="expanded-paragraph">
                                                        {paragraph}
                                                    </p>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* RIGHT COLUMN: ORGANIZATION NETWORK */}
                <div className="hierarchy-section">
                    <motion.h3
                        className="hierarchy-headline"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                    >
                        Organization Structure
                    </motion.h3>
                    <motion.p
                        className="hierarchy-subheadline"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                    >
                        Student-led, flat hierarchy, community-powered.
                    </motion.p>

                    {/* ANIMATED NETWORK VISUALIZATION */}
                    <motion.div
                        className="network-visualization"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        style={{
                            willChange: 'opacity',
                            transform: 'translateZ(0)'
                        }}
                    >
                        {/* SVG Canvas for connections */}
                        {/* SVG Canvas for connections */}
                        <svg className="network-svg" viewBox="0 0 800 420" preserveAspectRatio="xMidYMid meet">
                            {/* MAIN ORBITAL ELLIPSE - Continuous loop that touches 7 Teams Node center */}
                            {/* Center: (400, 165), Ry: 125 => Bottom Y = 290 */}
                            <ellipse
                                cx="400"
                                cy="165"
                                rx="240"
                                ry="125"
                                fill="none"
                                stroke="rgba(92, 230, 201, 0.12)"
                                strokeWidth="1.5"
                                strokeDasharray="8 4"
                                className="connection-path orbital-ring"
                            />

                            {/* Visual accent connections */}
                            <path className="connection-path" d="M 200 120 Q 200 240 400 290" fill="none" stroke="url(#tealGradient)" strokeWidth="2" strokeDasharray="8 4" opacity="0.6" />
                            <path className="connection-path" d="M 600 120 Q 600 240 400 290" fill="none" stroke="url(#goldGradient)" strokeWidth="2" strokeDasharray="8 4" opacity="0.6" />
                            <path className="connection-path" d="M 240 100 Q 400 40 560 100" fill="none" stroke="url(#peerGradient)" strokeWidth="2.5" strokeDasharray="10 5" opacity="0.8" />

                            {/* AUDIT FIX: Connection Anchor Dots */}
                            <circle cx="200" cy="120" r="3" fill="#5CE6C9" opacity="0.8" />
                            <circle cx="600" cy="120" r="3" fill="#FFCF96" opacity="0.8" />
                            <circle cx="400" cy="290" r="3" fill="white" opacity="0.6" />

                            {/* Gradients */}
                            <defs>
                                <linearGradient id="tealGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#5CE6C9" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#5CE6C9" stopOpacity="0.2" />
                                </linearGradient>
                                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#FFCF96" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#FFCF96" stopOpacity="0.2" />
                                </linearGradient>
                                <linearGradient id="peerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#5CE6C9" stopOpacity="0.6" />
                                    <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="#FFCF96" stopOpacity="0.6" />
                                </linearGradient>

                                {/* Mobile Connector Gradients */}
                                <linearGradient id="connectorGradient1to2" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#5CE6C9" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#FFCF96" stopOpacity="0.8" />
                                </linearGradient>
                                <linearGradient id="connectorGradient2to3" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#FFCF96" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="rgba(255, 255, 255, 0.6)" stopOpacity="0.7" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* TOP LEFT: GOVERNING BODY */}
                        <motion.div
                            className="network-node node-gb"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            <div className="node-glow"></div>
                            {/* FIX 2.3: Sequence Badge for Entry Point */}
                            <div className="node-sequence-badge">01</div>
                            <div className="node-circle">
                                <div className="node-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="5" r="2" />
                                        <circle cx="5" cy="19" r="2" />
                                        <circle cx="19" cy="19" r="2" />
                                        <path d="M12 7v5" strokeLinecap="round" />
                                        <path d="M5 17c0-4 7-4 7-4s7 0 7 4" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                            <div className="node-label">Governing Body</div>
                        </motion.div>

                        {/* NODE: City Chapters */}
                        <motion.div
                            className={`network-node node-city ${hoveredCard === 'city' ? 'active' : ''}`}
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.7, type: 'spring' }}
                            onMouseEnter={() => setHoveredCard('city')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="node-glow"></div>
                            {/* AUDIT FIX: Badge 02 */}
                            <div className="node-sequence-badge">02</div>
                            <div className="node-circle">
                                <svg className="node-icon" viewBox="0 0 48 48" fill="none">
                                    <path d="M24 8 L24 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                                    <circle cx="24" cy="16" r="3" fill="currentColor" />
                                </svg>
                            </div>
                            <span className="node-label">City Chapters</span>
                        </motion.div>

                        {/* NODE: 7 Functional Departments (Center Bottom) */}
                        <motion.div
                            className={`network-node node-departments ${hoveredCard === 'departments' ? 'active' : ''}`}
                            initial={{ scale: 0, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.9, type: 'spring' }}
                            onMouseEnter={() => setHoveredCard('departments')}
                            onMouseLeave={() => setHoveredCard(null)}
                        >
                            <div className="node-glow node-glow-multi"></div>
                            {/* AUDIT FIX: Badge 03 */}
                            <div className="node-sequence-badge">03</div>
                            <div className="node-circle node-circle-large">
                                <span className="dept-count">7</span>
                                <span className="dept-label">TEAMS</span>
                            </div>
                            {/* AUDIT FIX: Semantic Rename */}
                            <span className="node-label">Support System</span>
                        </motion.div>


                        {/* AUDIT FIX: Missing Flow Label */}
                        <div className="flow-label flow-label-peer">PEER-TO-PEER</div>

                        {/* MOBILE CONNECTORS (only visible on mobile) */}
                        {/* Connector 1→2: GB to City Chapters */}
                        <div
                            className="mobile-connector-container"
                            style={{
                                top: '120px', // After first node + badge
                                height: '88px', // Distance to next badge
                            }}
                        >
                            <svg width="2" height="88" style={{ position: 'absolute', left: 0, top: 0 }}>
                                <line
                                    x1="1" y1="0"
                                    x2="1" y2="88"
                                    className="mobile-connector-line connector-draw connector-1-2"
                                />
                            </svg>
                            <div className="connector-particle particle-1 teal" />
                            <div className="connector-particle particle-2 teal" />
                        </div>

                        {/* Connector 2→3: City Chapters to Teams */}
                        <div
                            className="mobile-connector-container"
                            style={{
                                top: '232px', // After second node + badge
                                height: '88px', // Distance to next badge
                            }}
                        >
                            <svg width="2" height="88" style={{ position: 'absolute', left: 0, top: 0 }}>
                                <line
                                    x1="1" y1="0"
                                    x2="1" y2="88"
                                    className="mobile-connector-line connector-draw connector-2-3"
                                />
                            </svg>
                            <div className="connector-particle particle-1 gold" />
                            <div className="connector-particle particle-2 gold" />
                        </div>
                    </motion.div>

                    {/* SUMMARY ROW - FLIP CARDS */}
                    <motion.div
                        className="network-summary-row"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: 1.2 }}
                    >
                        {/* GB Flip Card */}
                        <FlipCard
                            type="gb"
                            title="Governing Body"
                            frontDescription="12 UHC Houses. 20+ Student Societies. One Governing Body."
                            backContent={[
                                "Co-equal partnership of all student bodies",
                                "Democratic decision-making process",
                                "Rotating leadership roles",
                                "Shared resources & cross-society support",
                                "Brand standards & quality assurance"
                            ]}
                            accentColor="#5CE6C9"
                            isHighlighted={hoveredCard === 'gb'}
                        />

                        {/* City Chapters Flip Card */}
                        <FlipCard
                            type="city"
                            title="City Chapters"
                            frontDescription="Regional Coordinators leading local execution."
                            backContent={[
                                "Regional Coordinators per city",
                                "Local volunteers & ground support",
                                "7 Department Heads in each chapter",
                                "Centralized blueprint adaptation",
                                "Cross-city mentorship & sharing"
                            ]}
                            accentColor="#FFCF96"
                            isHighlighted={hoveredCard === 'city'}
                        />

                        {/* Departments Flip Card */}
                        <FlipCard
                            type="departments"
                            title="7 Departments"
                            frontDescription="Cross-functional teams supporting every edition."
                            backContent={[
                                "Content • Cultural • Technical",
                                "Transport • Volunteers • Sponsor • Media",
                                "Each team has city-level heads",
                                "Cross-functional collaboration",
                                "Blueprint templates for all cities"
                            ]}
                            accentColor="#FFFFFF"
                            isHighlighted={hoveredCard === 'departments'}
                        />
                    </motion.div>

                    {/* INTEGRATED DEPARTMENTS (Inside Right Column) */}
                    <div className="departments-integrated">
                        <div className="departments-divider">
                            7 Cross-Functional Teams
                        </div>
                        <div className="departments-grid">
                            {DEPARTMENTS.map((dept, index) => (
                                <motion.div
                                    key={dept.id}
                                    className="department-card"
                                    transition={{ duration: 0.4, delay: index * 0.03 }}
                                    style={{
                                        '--dept-accent-color': dept.color,
                                        willChange: 'transform',
                                        transform: 'translateZ(0)'
                                    } as React.CSSProperties}
                                >
                                    <div className="dept-icon">
                                        <DepartmentIcon type={dept.icon} color={dept.color} />
                                    </div>
                                    <h4 className="dept-name">{dept.name}</h4>
                                    <span className="dept-hover-hint">Hover</span>
                                    <ul className="dept-skills">
                                        {dept.skills.map((skill, idx) => (
                                            <li key={idx}>{skill}</li>
                                        ))}
                                    </ul>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ICON COMPONENTS

function StepIcon({ type, color }: { type: string; color: string }): React.ReactElement | null {
    const icons: Record<string, React.ReactElement> = {
        unite: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="30" stroke={color} strokeWidth="2" />
                <circle cx="25" cy="35" r="8" stroke={color} strokeWidth="2" />
                <circle cx="55" cy="35" r="8" stroke={color} strokeWidth="2" />
                <circle cx="40" cy="50" r="8" stroke={color} strokeWidth="2" />
                <circle cx="30" cy="55" r="6" stroke={color} strokeWidth="2" />
                <circle cx="50" cy="55" r="6" stroke={color} strokeWidth="2" />
            </svg>
        ),
        build: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="20" y="25" width="40" height="35" rx="4" stroke={color} strokeWidth="2" />
                <path d="M26 35 L34 35" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M26 43 L38 43" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M26 51 L32 51" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <circle cx="48" cy="35" r="4" stroke={color} strokeWidth="2" />
                <circle cx="52" cy="47" r="3" stroke={color} strokeWidth="2" />
            </svg>
        ),
        design: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <path d="M28 28 L40 20 L52 28 L52 52 L40 60 L28 52 Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                <path d="M40 20 L40 60" stroke={color} strokeWidth="2" />
                <path d="M28 28 L52 52" stroke={color} strokeWidth="2" />
                <circle cx="40" cy="40" r="6" stroke={color} strokeWidth="2" />
                <path d="M37 40 L40 43 L43 37" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
        spread: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <path d="M20 40 L32 40 L32 28 L48 40 L32 52 L32 40" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                <circle cx="56" cy="28" r="5" stroke={color} strokeWidth="2" />
                <circle cx="62" cy="40" r="4" stroke={color} strokeWidth="2" />
                <circle cx="56" cy="52" r="3" stroke={color} strokeWidth="2" />
                <path d="M50 25 L53 23" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M56 37 L59 35" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M52 50 L55 48" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        memories: (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="22" y="28" width="36" height="28" rx="4" stroke={color} strokeWidth="2" />
                <circle cx="40" cy="38" r="8" stroke={color} strokeWidth="2" />
                <circle cx="40" cy="38" r="3" fill={color} />
                <path d="M52 28 L48 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M28 60 L32 56 L36 62 L44 50 L52 60" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="28" cy="22" r="2" fill={color} />
                <circle cx="52" cy="20" r="2" fill={color} />
                <circle cx="60" cy="28" r="1.5" fill={color} />
            </svg>
        )
    };

    return icons[type] || null;
}

// CUSTOM SVG ICONS FOR FLIP CARDS (replacing emojis)
function GlobeNetworkIcon({ color }: { color: string }) {
    return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="14" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="20" cy="20" r="8" stroke={color} strokeWidth="1.5" />
            {/* Network nodes */}
            <circle cx="20" cy="6" r="3" fill={color} opacity="0.9" />
            <circle cx="8" cy="26" r="3" fill={color} opacity="0.9" />
            <circle cx="32" cy="26" r="3" fill={color} opacity="0.9" />
            {/* Connections */}
            <path d="M20 9 L20 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 24 L13 22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            <path d="M30 24 L27 22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
            {/* Center dot */}
            <circle cx="20" cy="20" r="2" fill={color} />
        </svg>
    );
}

function LocationPinIcon({ color }: { color: string }) {
    return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
                d="M20 4 C13 4 8 9 8 15.5 C8 25 20 36 20 36 C20 36 32 25 32 15.5 C32 9 27 4 20 4 Z"
                stroke={color}
                strokeWidth="1.5"
                fill="none"
            />
            {/* Inner rings */}
            <circle cx="20" cy="15" r="6" stroke={color} strokeWidth="1.5" />
            <circle cx="20" cy="15" r="2.5" fill={color} />
            {/* Pulse rings */}
            <circle cx="20" cy="15" r="9" stroke={color} strokeWidth="0.75" opacity="0.4" strokeDasharray="2 3" />
        </svg>
    );
}

function BoltIcon({ color }: { color: string }) {
    return (
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            {/* Main bolt */}
            <path
                d="M22 4 L10 22 L18 22 L16 36 L30 16 L22 16 L24 4 Z"
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="none"
            />
            {/* Inner glow */}
            <path
                d="M21 8 L13 20 L18 20 L17 30 L27 18 L22 18 L23 8 Z"
                fill={color}
                opacity="0.2"
            />
            {/* Side sparks */}
            <path d="M8 14 L6 12" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
            <path d="M32 24 L34 26" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        </svg>
    );
}

// FLIP CARD COMPONENT
interface FlipCardProps {
    type: 'gb' | 'city' | 'departments';
    title: string;
    frontDescription: string;
    backContent: string[];
    accentColor: string;
    isHighlighted: boolean;
}

function FlipCard({ type, title, frontDescription, backContent, accentColor, isHighlighted }: FlipCardProps) {
    const [isFlipped, setIsFlipped] = useState(false);

    const IconComponent = {
        gb: GlobeNetworkIcon,
        city: LocationPinIcon,
        departments: BoltIcon
    }[type];

    return (
        <div
            className={`flip-card ${isFlipped ? 'flipped' : ''} ${isHighlighted ? 'highlighted' : ''}`}
            onMouseEnter={() => setIsFlipped(true)}
            onMouseLeave={() => setIsFlipped(false)}
            onClick={() => setIsFlipped(!isFlipped)}
            style={{ '--flip-accent': accentColor } as React.CSSProperties}
        >
            <div className="flip-card-inner">
                {/* FRONT FACE */}
                <div className="flip-card-front">
                    <div className="flip-icon">
                        <IconComponent color={accentColor} />
                    </div>
                    <h4>{title}</h4>
                    <p>{frontDescription}</p>
                    <span className="flip-hint">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                            <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" />
                        </svg>
                        Hover to explore
                    </span>
                </div>

                {/* BACK FACE */}
                <div className="flip-card-back" style={{ borderColor: accentColor }}>
                    <h4 style={{ color: accentColor }}>{title}</h4>
                    <ul>
                        {backContent.map((item, idx) => (
                            <li key={idx}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

function DepartmentIcon({ type, color }: { type: string; color: string }): React.ReactElement | null {
    const icons: Record<string, React.ReactElement> = {
        content: (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M12 14 L36 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M12 22 L32 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M12 30 L28 30" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M28 34 L32 38 L40 30" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="38" cy="18" r="4" stroke={color} strokeWidth="2" />
            </svg>
        ),
        cultural: (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M16 38 L16 18 Q16 10 24 10 Q32 10 32 18 L32 38" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M20 38 L20 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M28 38 L28 22" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M12 38 L36 38" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <circle cx="24" cy="14" r="2" fill={color} />
            </svg>
        ),
        technical: (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="10" y="12" width="28" height="20" rx="2" stroke={color} strokeWidth="2" />
                <path d="M10 32 L10 36 L38 36 L38 32" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                <path d="M18 20 L14 24 L18 28" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M30 20 L34 24 L30 28" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 28 L26 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </svg>
        ),
        transport: (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="10" y="16" width="28" height="18" rx="4" stroke={color} strokeWidth="2" />
                <path d="M14 16 L14 12 L34 12 L34 16" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                <circle cx="16" cy="34" r="3" stroke={color} strokeWidth="2" />
                <circle cx="32" cy="34" r="3" stroke={color} strokeWidth="2" />
                <path d="M10 24 L38 24" stroke={color} strokeWidth="2" />
                <rect x="14" y="18" width="6" height="4" rx="1" stroke={color} strokeWidth="1.5" />
                <rect x="28" y="18" width="6" height="4" rx="1" stroke={color} strokeWidth="1.5" />
            </svg>
        ),
        volunteers: (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="14" r="5" stroke={color} strokeWidth="2" />
                <path d="M14 38 Q14 28 24 26 Q34 28 34 38" stroke={color} strokeWidth="2" fill="none" />
                <circle cx="12" cy="18" r="4" stroke={color} strokeWidth="2" />
                <circle cx="36" cy="18" r="4" stroke={color} strokeWidth="2" />
                <path d="M8 34 Q8 26 12 24" stroke={color} strokeWidth="2" />
                <path d="M40 34 Q40 26 36 24" stroke={color} strokeWidth="2" />
            </svg>
        ),
        sponsor: (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M12 28 Q12 20 20 20 L28 20 Q36 20 36 28" stroke={color} strokeWidth="2" />
                <path d="M20 20 L20 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <path d="M28 20 L28 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <circle cx="24" cy="32" r="6" stroke={color} strokeWidth="2" />
                <path d="M22 30 L24 32 L26 30 L24 34 L22 30" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
        ),
        media: (
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="10" y="14" width="22" height="16" rx="2" stroke={color} strokeWidth="2" />
                <circle cx="21" cy="22" r="5" stroke={color} strokeWidth="2" />
                <path d="M28 14 L32 10" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <rect x="28" y="26" width="10" height="10" rx="2" stroke={color} strokeWidth="2" />
                <path d="M31 31 L35 31 M33 29 L33 33" stroke={color} strokeWidth="2" strokeLinecap="round" />
            </svg>
        )
    };

    return icons[type] || null;
}

export default Section6A;
