'use client'

/**
 * TIMELINE SECTION - CINEMATIC ACCORDION
 * 
 * Space-efficient progressive disclosure system that compresses the timeline
 * from ~4500px to ~900px while preserving narrative depth.
 * 
 * Architecture:
 * - Multi-expand accordion (users can open multiple items)
 * - All collapsed by default for scannability
 * - WCAG 2.2 AA compliant with full keyboard navigation
 * - Lazy-loaded images for performance
 */

import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import type { TimelineEvent, EditionStatus } from '@/types/edition'
import { ChevronDown } from 'lucide-react'

interface TimelineSectionProps {
    data: TimelineEvent[]
    status: EditionStatus
    city: string
}

export function TimelineSection({ data, status, city }: TimelineSectionProps) {
    const [openItems, setOpenItems] = useState<Set<number>>(new Set())
    const prefersReducedMotion = useReducedMotion()

    const toggleItem = (index: number) => {
        setOpenItems(prev => {
            const next = new Set(prev)
            next.has(index) ? next.delete(index) : next.add(index)
            return next
        })
    }

    const collapseAll = () => setOpenItems(new Set())

    return (
        <section className="timeline-section">
            {/* Cinematic Divider - Transition from Gallery */}
            <div className="w-[120px] h-[1px] bg-gradient-to-r from-transparent via-[#5CE6C9] to-transparent opacity-50 mx-auto mb-16 shadow-[0_0_15px_rgba(92,230,201,0.6)]" />

            {/* Section Header */}
            <motion.div
                className="timeline-header-wrapper"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <h2 className="section-headline">
                    {status === 'completed' ? 'How the Day Unfolded' : "What's Planned"}
                </h2>

                {/* Collapse All Button */}
                <button
                    onClick={collapseAll}
                    className="collapse-all-btn"
                    style={{
                        opacity: openItems.size > 0 ? 1 : 0.3,
                        pointerEvents: openItems.size > 0 ? 'auto' : 'none',
                    }}
                    aria-label={`Collapse all open items (${openItems.size} open)`}
                >
                    Collapse All {openItems.size > 0 && `(${openItems.size})`}
                </button>
            </motion.div>

            {/* Accordion Timeline */}
            <div className="timeline-accordion" role="region" aria-label="Event timeline">
                {data.map((event, index) => (
                    <AccordionItem
                        key={index}
                        event={event}
                        index={index}
                        isOpen={openItems.has(index)}
                        onToggle={toggleItem}
                        isLast={index === data.length - 1}
                        prefersReducedMotion={prefersReducedMotion}
                    />
                ))}
            </div>

            {/* Note for upcoming events */}
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

// ============================================================================
// ACCORDION ITEM COMPONENT
// ============================================================================

interface AccordionItemProps {
    event: TimelineEvent
    index: number
    isOpen: boolean
    onToggle: (index: number) => void
    isLast: boolean
    prefersReducedMotion: boolean | null
}

function AccordionItem({ event, index, isOpen, onToggle, isLast, prefersReducedMotion }: AccordionItemProps) {
    const contentRef = useRef<HTMLDivElement>(null)
    const [contentHeight, setContentHeight] = useState(0)

    // Calculate content height for smooth animation
    useEffect(() => {
        if (contentRef.current) {
            setContentHeight(contentRef.current.scrollHeight)
        }
    }, [isOpen])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle(index)
        }
    }

    return (
        <div
            className={`timeline-accordion-item ${event.highlight ? 'highlight' : ''}`}
            data-open={isOpen}
        >
            {/* Timeline Connector (Left Spine) */}
            <div className="timeline-connector">
                <div className="timeline-dot" />
                {!isLast && <div className="timeline-line" />}
            </div>

            {/* Accordion Header (Always Visible) */}
            <div className="timeline-accordion-content">
                <button
                    id={`timeline-header-${index}`}
                    className="timeline-accordion-header"
                    aria-expanded={isOpen}
                    aria-controls={`timeline-panel-${index}`}
                    onClick={() => onToggle(index)}
                    onKeyDown={handleKeyDown}
                >
                    <div className="timeline-header-text">
                        <div className="timeline-time">{event.time}</div>
                        <h3 className="timeline-title">{event.title}</h3>
                    </div>

                    {/* Chevron Icon */}
                    <motion.div
                        className="timeline-chevron"
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{
                            duration: prefersReducedMotion ? 0 : 0.3,
                            ease: [0.4, 0, 0.2, 1]
                        }}
                    >
                        <ChevronDown size={24} />
                    </motion.div>
                </button>

                {/* Expandable Panel */}
                <motion.div
                    id={`timeline-panel-${index}`}
                    ref={contentRef}
                    className="timeline-accordion-panel"
                    role="region"
                    aria-labelledby={`timeline-header-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                        height: isOpen ? contentHeight : 0,
                        opacity: isOpen ? 1 : 0,
                    }}
                    transition={{
                        height: {
                            duration: prefersReducedMotion ? 0 : 0.3,
                            ease: [0.4, 0, 0.2, 1]
                        },
                        opacity: {
                            duration: prefersReducedMotion ? 0 : 0.2,
                            delay: isOpen ? 0.1 : 0
                        }
                    }}
                    style={{ overflow: 'hidden' }}
                >
                    <div className="timeline-panel-inner">
                        {/* Description */}
                        <p className="timeline-description">{event.description}</p>

                        {/* Image (Only render when open for lazy loading) */}
                        {isOpen && event.photo && (
                            <motion.div
                                className="timeline-image-reveal"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                    duration: prefersReducedMotion ? 0 : 0.4,
                                    delay: 0.15
                                }}
                            >
                                <Image
                                    src={event.photo}
                                    alt={`${event.title} - ${event.time}`}
                                    width={1600}
                                    height={900}
                                    loading="lazy"
                                    className="timeline-photo"
                                />
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    )
}

export default TimelineSection
