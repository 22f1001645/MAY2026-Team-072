'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * CorePhilosophies - "Atomic Truths" Premium Accordion
 * 
 * Exclusive accordion: only one item open at a time
 * Animation: Apple ease [0.16, 1, 0.3, 1] with 0.5s duration
 */

interface Philosophy {
    id: string
    title: string
    subtitle: string
    content: string
}

const PHILOSOPHIES: Philosophy[] = [
    {
        id: 'unity',
        title: 'Unity',
        subtitle: 'THE SPIRIT OF ONENESS',
        content: 'More than just a festival, Ekatva is the dissolving of boundaries. It is where the distinctions between senior and junior, tech and art, victory and defeat fade away—leaving only the collective heartbeat of the IITM BS community.'
    },
    {
        id: 'imagination',
        title: 'Imagination',
        subtitle: 'WHERE LOGIC MEETS MAGIC',
        content: 'At EKATVA, creativity knows no bounds. We blend technical excellence with artistic expression, turning abstract ideas into tangible experiences that inspire, challenge, and transform every participant.'
    },
    {
        id: 'glory',
        title: 'Glory',
        subtitle: 'THE PURSUIT OF EXCELLENCE',
        content: 'Every event, every performance, every creation is a step toward greatness. EKATVA celebrates the relentless pursuit of mastery, where effort meets recognition and dreams become achievements.'
    }
]

// Apple ease curve - slow, heavy, premium feel
const APPLE_EASE = [0.16, 1, 0.3, 1] as const

export default function CorePhilosophies() {
    const [activeId, setActiveId] = useState<string | null>('unity') // First item open by default

    const toggleItem = (id: string) => {
        setActiveId(prev => prev === id ? null : id)
    }

    return (
        <div className="space-y-[1vh]">
            {PHILOSOPHIES.map((philosophy) => {
                const isActive = activeId === philosophy.id

                return (
                    <motion.div
                        key={philosophy.id}
                        initial={false}
                        className="group"
                    >
                        {/* Accordion Item Container */}
                        <motion.div
                            className="relative rounded-xl overflow-hidden transition-colors duration-300"
                            style={{
                                border: `1px solid ${isActive ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)'}`,
                                background: isActive
                                    ? 'rgba(0, 240, 255, 0.03)'
                                    : 'transparent'
                            }}
                            whileHover={{
                                borderColor: isActive
                                    ? 'rgba(0, 240, 255, 0.6)'
                                    : 'rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            {/* Header - Always visible */}
                            <button
                                onClick={() => toggleItem(philosophy.id)}
                                className="w-full flex items-center justify-between p-[clamp(1rem,1.5vh,1.25rem)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ekatva-teal focus-visible:ring-offset-2 focus-visible:ring-offset-oneness-black"
                                aria-expanded={isActive}
                                aria-controls={`content-${philosophy.id}`}
                            >
                                <div className="space-y-0.5">
                                    {/* Title */}
                                    <h3
                                        className="font-serif text-[clamp(1.1rem,1.2vw,1.5rem)] transition-colors duration-300"
                                        style={{
                                            color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)'
                                        }}
                                    >
                                        {philosophy.title}
                                    </h3>
                                    {/* Subtitle */}
                                    <p
                                        className="text-xs tracking-widest uppercase transition-colors duration-300"
                                        style={{
                                            color: isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.4)'
                                        }}
                                    >
                                        {philosophy.subtitle}
                                    </p>
                                </div>

                                {/* Toggle Icon - Magnetic Circle */}
                                <motion.div
                                    className="relative w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ml-4"
                                    style={{
                                        borderColor: isActive
                                            ? 'rgba(0, 240, 255, 0.6)'
                                            : 'rgba(255, 255, 255, 0.2)'
                                    }}
                                    animate={{
                                        rotate: isActive ? 180 : 0,
                                        backgroundColor: isActive
                                            ? 'rgba(0, 240, 255, 0.1)'
                                            : 'transparent'
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        ease: APPLE_EASE
                                    }}
                                >
                                    {/* Plus Horizontal */}
                                    <motion.span
                                        className="absolute w-3 h-0.5 rounded-full"
                                        style={{
                                            backgroundColor: isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.6)'
                                        }}
                                    />
                                    {/* Plus Vertical - fades out when active */}
                                    <motion.span
                                        className="absolute w-0.5 h-3 rounded-full"
                                        style={{
                                            backgroundColor: isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.6)'
                                        }}
                                        animate={{
                                            opacity: isActive ? 0 : 1,
                                            scaleY: isActive ? 0 : 1
                                        }}
                                        transition={{
                                            duration: 0.3,
                                            ease: APPLE_EASE
                                        }}
                                    />
                                </motion.div>
                            </button>

                            {/* Content - Animated */}
                            <AnimatePresence initial={false}>
                                {isActive && (
                                    <motion.div
                                        id={`content-${philosophy.id}`}
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{
                                            height: 'auto',
                                            opacity: 1,
                                            transition: {
                                                height: { duration: 0.5, ease: APPLE_EASE },
                                                opacity: { duration: 0.4, delay: 0.1, ease: 'easeOut' }
                                            }
                                        }}
                                        exit={{
                                            height: 0,
                                            opacity: 0,
                                            transition: {
                                                height: { duration: 0.4, ease: APPLE_EASE },
                                                opacity: { duration: 0.2, ease: 'easeIn' }
                                            }
                                        }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-[clamp(1rem,1.5vh,1.25rem)] pb-[clamp(1rem,1.5vh,1.25rem)]">
                                            {/* Divider */}
                                            <div
                                                className="h-px mb-[1vh] opacity-20"
                                                style={{
                                                    background: 'linear-gradient(to right, rgba(0, 240, 255, 0.5), transparent)'
                                                }}
                                            />
                                            {/* Content Text */}
                                            <p className="text-fluid-body-compact text-mid-gray leading-snug">
                                                {philosophy.content}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )
            })}
        </div>
    )
}
