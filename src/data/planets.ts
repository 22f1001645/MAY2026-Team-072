import { Music, Cpu, Trophy, LucideIcon } from 'lucide-react'

/**
 * ═══════════════════════════════════════════════════════════════
 * EKATVA ORBITAL SIZING SYSTEM - REVISED MATHEMATICAL SPECIFICATION
 * ═══════════════════════════════════════════════════════════════
 *
 * GOLDEN RATIO FOUNDATION:
 * φ (phi) = 1.618033988749895
 *
 * CORE-TO-PLANET RELATIONSHIP:
 * Core Radius = Planet Size × φ
 *
 * RESPONSIVE BREAKPOINTS:
 * ┌──────────────┬─────────────┬─────────────┬───────────────┐
 * │ Viewport     │ Planet Size │ Core Radius │ Safe Distance │
 * ├──────────────┼─────────────┼─────────────┼───────────────┤
 * │ Mobile       │ 60px        │ 97px        │ > 127px       │
 * │ Tablet       │ 80px        │ 129px       │ > 169px       │
 * │ Desktop      │ 100px       │ 162px       │ > 212px       │
 * └──────────────┴─────────────┴─────────────┴───────────────┘
 * 
 * CORRECTED ORBITAL RADII (Base values for Desktop, scaled by viewport):
 * - Previous Plan flaw: Inner Orbit 160px < Safe Distance 212px (COLLISION)
 * - NEW Inner Orbit:  240px (Safe buffer > 212px)
 * - NEW Middle Orbit: 300px (Consistent 60px gap)
 * - NEW Outer Orbit:  360px (Consistent 60px gap)
 *
 * SCALING FACTORS:
 * - Desktop: 1.0 (Radii: 240, 300, 360)
 * - Tablet:  0.8 (Radii: 192, 240, 288) -> Safe (> 169)
 * - Mobile:  0.6 (Radii: 144, 180, 216) -> Safe (> 127)
 *
 * ECCENTRICITY RANGE: 0.08 - 0.12
 * Creates subtle elliptical variation without distortion
 *
 * ═══════════════════════════════════════════════════════════════
 */

export interface PlanetConfig {
    id: string
    name: string
    devanagari: string
    orbital: {
        radius: number
        angle: number // Initial angle in radians
        speed: number // Radians per second
        eccentricity: number // 0 = circle, 0.3 = ellipse
    }
    appearance: {
        baseColor: string
        glowColor: string
        size: number
        glowRadius: number
        icon: LucideIcon
    }
    content: {
        headline: string
        description: string
        activities: string[]
        stats: { value: string; label: string }[]
    }
}

export const PLANET_CONFIGS: PlanetConfig[] = [
    {
        id: 'techno-cultural',
        name: 'Techno-Cultural',
        devanagari: 'तकनीकी-सांस्कृतिक',
        orbital: {
            radius: 240, // Inner orbit (first pillar)
            angle: 0,
            speed: 0.12,
            eccentricity: 0.12,
        },
        appearance: {
            baseColor: '#FFCF96',
            glowColor: 'rgba(255, 207, 150, 0.4)',
            size: 100,
            glowRadius: 30,
            icon: Cpu,
        },
        content: {
            headline: 'Innovation Meets Creativity',
            description:
                'Hackathons, coding battles, robotics, and tech showcases that push the boundaries of what IITM BS students can create.',
            activities: ['Hackathon', 'Coding Battle', 'Robotics', 'AI/ML Contest', 'Tech Talks'],
            stats: [
                { value: '8+', label: 'Competitions' },
                { value: '50+', label: 'Projects' },
                { value: '₹2L+', label: 'Prizes' },
            ],
        },
    },
    {
        id: 'socio-cultural',
        name: 'Socio-Cultural',
        devanagari: 'सामाजिक-सांस्कृतिक',
        orbital: {
            radius: 300, // Middle orbit
            angle: (2 * Math.PI) / 3, // 120 degrees
            speed: 0.15,
            eccentricity: 0.12,
        },
        appearance: {
            baseColor: '#5CE6C9',
            glowColor: 'rgba(92, 230, 201, 0.4)',
            size: 100,
            glowRadius: 30,
            icon: Music,
        },
        content: {
            headline: 'Where Culture Comes Alive',
            description:
                'Music, dance, drama, and art that celebrate the diverse heritage of India. From classical performances to contemporary expressions.',
            activities: ['Live Music', 'Dance Performances', 'Drama', 'Art Exhibition', 'Fashion Show'],
            stats: [
                { value: '12+', label: 'Events' },
                { value: '200+', label: 'Performers' },
                { value: '5', label: 'Stages' },
            ],
        },
    },
    {
        id: 'sports',
        name: 'Sports',
        devanagari: 'खेल',
        orbital: {
            radius: 360, // Outer orbit
            angle: (4 * Math.PI) / 3, // 240 degrees
            speed: 0.18,
            eccentricity: 0.08,
        },
        appearance: {
            baseColor: '#FF6B6B',
            glowColor: 'rgba(255, 107, 107, 0.4)',
            size: 100,
            glowRadius: 30,
            icon: Trophy,
        },
        content: {
            headline: 'Champions Rise Here',
            description:
                'Cricket, football, basketball, and more. Compete, cheer, and celebrate the spirit of sportsmanship with fellow students.',
            activities: ['Cricket', 'Football', 'Basketball', 'Badminton', 'Chess'],
            stats: [
                { value: '6+', label: 'Sports' },
                { value: '100+', label: 'Athletes' },
                { value: '20+', label: 'Matches' },
            ],
        },
    },
]

// Helper to get planet by ID
export const getPlanetById = (id: string): PlanetConfig | undefined =>
    PLANET_CONFIGS.find((p) => p.id === id)
