'use client'

/**
 * EDITION PAGE - MAIN COMPONENT
 * 
 * Single template for all editions
 * Conditional rendering based on status
 * 
 * Sections:
 * 1. Hero (Video/Image)
 * 2. Impact Stats
 * 3. Photo Gallery
 * 4. Event Timeline
 * 5. Student Testimonials
 * 6. Aftermovie
 * 7. Team
 * 8. Next Edition
 */

import { useEffect } from 'react'
import type { Edition } from '@/types/edition'
import {
    HeroSection,
    StatsSection,
    GallerySection,
    TimelineSection,
    TestimonialsSection,
    AftermovieSection,
    TeamSection,
    NextEditionSection,
} from './sections'
import '@/styles/EditionPage.css'

interface EditionPageProps {
    edition: Edition
}

export function EditionPage({ edition }: EditionPageProps) {
    // Update document title on mount
    useEffect(() => {
        if (edition.seo.metaTitle) {
            document.title = edition.seo.metaTitle
        }
    }, [edition.seo.metaTitle])

    return (
        <div className="edition-page">
            {/* Section 1: Hero */}
            <HeroSection data={edition.hero} status={edition.status} />

            {/* Section 2: Impact Stats */}
            <StatsSection
                data={edition.stats}
                status={edition.status}
                city={edition.city}
            />

            {/* Section 3: Photo Gallery */}
            <GallerySection
                data={edition.gallery}
                status={edition.status}
                city={edition.city}
            />

            {/* Section 4: Event Timeline */}
            <TimelineSection
                data={edition.timeline}
                status={edition.status}
                city={edition.city}
            />

            {/* Section 5: Student Testimonials - Velocity Spotlight */}
            <TestimonialsSection />

            {/* Section 6: Team */}
            <TeamSection
                data={edition.team}
                status={edition.status}
                city={edition.city}
            />

            {/* Section 8: Next Edition */}
            <NextEditionSection
                data={edition.nextEdition}
                currentCity={edition.city}
            />
        </div>
    )
}

export default EditionPage

