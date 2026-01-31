'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { slideInLeft, slideInRight, staggerContainer, staggerItem } from '@/lib/animations'
import { StatCard } from '@/components/ui'
import type { MemoryWallImage, Stat } from '@/types'

// Memory wall images - Using Cloudinary URLs from reference templates
const memoryWallImages: MemoryWallImage[] = [
    {
        src: 'https://res.cloudinary.com/davgdsnyd/image/upload/v1759319481/IMG_4010_z5sunm.jpg',
        alt: 'The Ekatva Family - Students celebrating together',
        caption: 'The Ekatva Family: From batchmates to lifelong friends'
    },
    {
        src: 'https://res.cloudinary.com/davgdsnyd/image/upload/v1759318199/DSC09936_bnzt6o.jpg',
        alt: 'Beyond the Stage - Cricket and activities',
        caption: 'Beyond the Stage: From dance floors to cricket pitches'
    },
    {
        src: 'https://res.cloudinary.com/davgdsnyd/image/upload/v1759317743/Screenshot_2025-09-28_191317_f1fmj4.png',
        alt: 'Akord Band performing live',
        caption: 'Cultural Connections: Where traditions meet technology'
    },
    {
        src: 'https://res.cloudinary.com/davgdsnyd/image/upload/v1759317740/Screenshot_2025-09-28_191136_qltuu7.png',
        alt: 'DJ night at EKATVA Hyderabad',
        caption: 'DJ NIGHT: When Pravaha made everyone dance'
    },
    {
        src: 'https://res.cloudinary.com/davgdsnyd/image/upload/v1759318450/Screenshot_2025-09-28_193007_og7798.png',
        alt: 'Students sharing a meal together',
        caption: 'Community Building: Every meal, every conversation mattered'
    },
    {
        src: 'https://res.cloudinary.com/davgdsnyd/image/upload/v1759321693/Screenshot_2025-09-28_191944_u2ejlb.png',
        alt: 'Students laughing together',
        caption: 'The Energy: 230 students, one unforgettable night'
    },
]

const stats: Stat[] = [
    { value: '34,000+', label: 'Students Nationwide', color: 'teal' },
    { value: '10+', label: 'Cities Planned', color: 'gold' },
    { value: '600+', label: 'BS Students Reached', color: 'white' },
]

/**
 * Origin Story Section - Antigravity Refactor (V7)
 * 
 * Features:
 * - Single Viewport Fit: Uses clamp + svh to fit 1366x768.
 * - Balanced Typography: Harmonized headings and body text.
 * - Safety Padding: Ensures stats are visually contained.
 */
export default function OriginStorySection() {
    const sectionRef = useRef(null)
    const isInView = useInView(sectionRef, { once: true, amount: 0.2 })

    return (
        <section
            id="origin-story"
            ref={sectionRef}
            className="relative min-h-[clamp(650px,100svh,900px)] flex flex-col justify-center bg-gradient-to-b from-oneness-black via-deep-teal/20 to-gradient-dark overflow-hidden"
            aria-labelledby="origin-story-title"
        >
            {/* Dynamic Padding: Asymmetric to protect bottom stats */}
            <div className="py-[clamp(3rem,6vh,6rem)] container-custom h-full flex flex-col justify-center">
                <div className="grid xl:grid-cols-2 gap-fluid-gap xl:gap-[clamp(2rem,4vw,5rem)] items-center">

                    {/* Memory Wall - Left Side */}
                    <motion.div
                        variants={slideInLeft}
                        initial="initial"
                        animate={isInView ? 'animate' : 'initial'}
                        className="order-2 lg:order-1"
                    >
                        <motion.div
                            variants={staggerContainer}
                            initial="initial"
                            animate={isInView ? 'animate' : 'initial'}
                            className="grid grid-cols-2 md:grid-cols-3 gap-fluid-gap"
                        >
                            {memoryWallImages.map((image, index) => (
                                <motion.div
                                    key={index}
                                    variants={staggerItem}
                                    whileHover={{ scale: 1.05, transition: { duration: 0.3 } }}
                                    className={`
                                        relative overflow-hidden rounded-2xl 
                                        group cursor-pointer
                                        ${index === 0 || index === 5 ? 'aspect-[4/5]' : 'aspect-square'}
                                        ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}
                                    `}
                                >
                                    <Image
                                        src={image.src}
                                        alt={image.alt}
                                        fill
                                        className="object-cover brightness-125 saturate-[1.15] contrast-105 group-hover:scale-110 transition-transform duration-500"
                                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-oneness-black via-oneness-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 md:p-5">
                                        <p className="text-sm md:text-base text-white font-medium leading-relaxed">
                                            {image.caption}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>

                    {/* Narrative - Right Side */}
                    <motion.div
                        variants={slideInRight}
                        initial="initial"
                        animate={isInView ? 'animate' : 'initial'}
                        className="order-1 lg:order-2 space-y-[clamp(1rem,3vh,2rem)]"
                    >
                        {/* Heading */}
                        <h2
                            id="origin-story-title"
                            className="font-serif text-fluid-h2 short:text-fluid-h2-compact font-bold text-unity-gold leading-[1.1]"
                            style={{
                                textShadow: '0 4px 30px rgba(255, 207, 150, 0.35)'
                            }}
                        >
                            The Story Behind EKATVA
                        </h2>

                        {/* Body Text: Compressed for Laptop */}
                        <div className="space-y-[clamp(0.75rem,2.5vh,1.5rem)] text-[clamp(0.9rem,1.1vh,1.125rem)] leading-[1.6] text-white/90 max-w-2xl">
                            <p>
                                Most IITM BS students have never met. We&apos;re spread across cities,
                                connecting through screens, assignments, and Zoom lectures. For many,
                                the &ldquo;IIT Madras experience&rdquo; exists only in stories from Chennai campus students.
                            </p>

                            <p>
                                But what if we could change that? What if distance didn&apos;t define our
                                community? What if every city had its own celebration—its own moment
                                to transform digital classmates into lifelong friends?
                            </p>

                            {/* Key Statement */}
                            <p
                                className="text-fluid-h2 short:text-fluid-h2-compact font-semibold text-ekatva-teal py-[clamp(0.5rem,1.5vh,1rem)]"
                                style={{
                                    textShadow: '0 0 40px rgba(92, 230, 201, 0.5), 0 0 80px rgba(92, 230, 201, 0.3)'
                                }}
                            >
                                EKATVA changes that.
                            </p>

                            <p>
                                From Hyderabad to Delhi, Mumbai to Bangalore—we&apos;re bringing the fest
                                to you. No long journeys. No barriers. Just pure connection, culture,
                                and celebration in your city.
                            </p>
                        </div>

                        {/* Stats Bar (Refactored Layout) */}
                        <div className="pt-[clamp(1.5rem,4vh,3rem)] border-t border-white/10">
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                {stats.map((stat, index) => (
                                    <div key={index} className="h-full">
                                        <StatCard
                                            value={stat.value}
                                            label={stat.label}
                                            color={stat.color}
                                            className="w-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
