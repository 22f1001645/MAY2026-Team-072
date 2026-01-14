'use client'

/**
 * TIMELINE SECTION - CLEAN & VISUAL
 * 
 * Simple vertical timeline with prominent, beautiful imagery
 * Inspired by: Clear hierarchy, large images, clean spacing
 */

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { TimelineEvent, EditionStatus } from '@/types/edition'

interface TimelineSectionProps {
    data: TimelineEvent[]
    status: EditionStatus
    city: string
}

export function TimelineSection({ data, status, city }: TimelineSectionProps) {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
        },
    }

    return (
        <section className="timeline-section">
            <motion.h2
                className="section-headline"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                {status === 'completed' ? 'How the Day Unfolded' : "What's Planned"}
            </motion.h2>

            <motion.div
                className="timeline"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
            >
                {data.map((event, index) => (
                    <motion.div
                        key={index}
                        className={`timeline-item ${event.highlight ? 'highlight' : ''}`}
                        variants={itemVariants}
                    >
                        {/* Timeline Connector */}
                        <div className="timeline-connector">
                            <div className="timeline-dot" />
                            {index < data.length - 1 && <div className="timeline-line" />}
                        </div>

                        {/* Content */}
                        <div className="timeline-content-wrapper">
                            <div className="timeline-time">{event.time}</div>
                            <h3 className="timeline-title">{event.title}</h3>
                            <p className="timeline-description">{event.description}</p>

                            {/* Large Prominent Image */}
                            {event.photo && (
                                <div className="timeline-image-card">
                                    <Image
                                        src={event.photo}
                                        alt={event.title}
                                        width={1200}
                                        height={800}
                                        className="timeline-photo"
                                        priority={index < 3}
                                    />
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {status === 'upcoming' && (
                <motion.p
                    className="timeline-note"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                >
                    *Schedule subject to change. Final timeline will be shared 1 week before the event.
                </motion.p>
            )}
        </section>
    )
}

export default TimelineSection
