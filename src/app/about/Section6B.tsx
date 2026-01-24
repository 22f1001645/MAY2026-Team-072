'use client';

/**
 * SECTION 6B: THE VISION (WHERE WE'RE GOING)
 *
 * Architecture (Vision 2.0 - Side-by-Side Layout):
 * - Hero: "EKATVA IS BECOMING MORE" (Top Level)
 * - Container: Split View (Evolution Cards Left | Dream Quote Right)
 * - Styling: Preserving original glassmorphism and 2030 Dream aesthetics
 */

import { motion } from 'framer-motion';
import { SolutionsCard } from '@/components/about/SolutionsCard';
import './section6b.css';

// Evolution Areas Data
const EVOLUTION_AREAS = [
    {
        icon: <img src="/assets/icons/academic.png" alt="Academic & Growth" />,
        headline: 'Academic Support & Growth',
        text: 'Beyond fests—study groups, peer learning, and knowledge sharing.'
    },
    {
        icon: <img src="/assets/icons/career.png" alt="Career Mentorship" />,
        headline: 'Career Exploration & Mentorship',
        text: 'Industry connections, guidance, and opportunities shared across the network.'
    },
    {
        icon: <img src="/assets/icons/culture.png" alt="Cultural Platforms" />,
        headline: 'Cultural Expression Platforms',
        text: 'Showcasing talent across cities. Building a reach that goes beyond regional stages.'
    },
    {
        icon: <img src="/assets/icons/belonging.png" alt="Emotional Belonging" />,
        headline: 'Emotional Belonging & Community',
        text: 'Ensuring no student feels alone in their BS journey, no matter where they live.'
    },
    {
        icon: <img src="/assets/icons/travel.png" alt="Travel Coordination" />,
        headline: 'Travel Coordination',
        text: '80 seats booked together. No one travels to a fest alone.'
    },
    {
        icon: <img src="/assets/icons/connect.png" alt="Collaborative Projects" />,
        headline: 'Collaborative Projects',
        text: 'Inter-city initiatives where students build together, learning through unity.'
    }
];

interface Section6BProps {
    className?: string;
}

export function Section6B({ className = '' }: Section6BProps) {
    return (
        <section className={`section-6b ${className}`} id="the-vision">

            {/* 1. HERO: The Core Vision Statement */}
            <div className="section-6b-header">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="block text-teal-400 text-sm md:text-base font-medium tracking-[0.2em] uppercase mb-4">
                        The Future of Student Unity
                    </span>
                    <h2 className="section-6b-title">
                        EKATVA Is Becoming More
                    </h2>
                    <p className="section-6b-subtitle">
                        Not just regional fests. A broader student unity movement.
                    </p>
                </motion.div>
            </div>

            {/* 2. SPLIT LAYOUT: Evolution Cards (Left) + Dream Quote (Right) */}
            <div className="evolution-and-dream-unified">

                {/* LEFT: Evolution Columns */}
                <motion.div
                    className="evolution-column"
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="evolution-grid-duo">
                        {EVOLUTION_AREAS.map((area, index) => (
                            <motion.div
                                key={index}
                                className="evolution-item-compact"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: index * 0.05 }}
                            >
                                <span className="evo-icon-mini">{area.icon}</span>
                                <div className="evo-content">
                                    <h4>{area.headline}</h4>
                                    <p>{area.text}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* RIGHT: Solutions Tower + Dream Anchor */}
                <div className="dream-column-tower">

                    {/* 1. THE SOLUTION (System Anchor) */}
                    <div className="mb-12 w-full">
                        <SolutionsCard />
                    </div>

                    {/* 2. THE DREAM (Vision Anchor) */}
                    <motion.div
                        className="dream-card-elevated"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="dream-label-mini">The 2030 Dream</span>

                        <blockquote className="dream-quote-compact">
                            "We want EKATVA to be a reason someone
                            <strong>chooses IIT Madras BS."</strong>
                        </blockquote>

                        <cite className="dream-attribution-mini">— Ekatva Team</cite>

                        {/* Visual Accent */}
                        <div className="dream-visual-accent" aria-hidden="true">
                            <svg width="80" height="80" viewBox="0 0 80 80">
                                <path
                                    d="M40 0L42 38L80 40L42 42L40 80L38 42L0 40L38 38L40 0Z"
                                    fill="#5CE6C9"
                                    opacity="0.2"
                                />
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="12"
                                    stroke="#5CE6C9"
                                    strokeWidth="2"
                                    fill="none"
                                />
                            </svg>
                        </div>
                    </motion.div>
                </div>

            </div>
        </section>
    );
}

export default Section6B;
