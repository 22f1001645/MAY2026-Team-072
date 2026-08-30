/**
 * City Data for Ripple Section
 * 
 * 9 cities with different statuses:
 * - completed: Hyderabad (Feb 2025)
 * - confirmed: Delhi, Bangalore, Mumbai, Patna
 * - exploring: Kolkata, Ahmedabad, Jaipur, Nagpur
 * 
 * Coordinates based on @svg-maps/india viewBox (612x696)
 * Mapped from actual geographic lat/long positions
 */

export interface CityData {
    id: string
    name: string
    status: 'completed' | 'confirmed' | 'exploring'
    coordinates: { x: number; y: number } // Relative to 612x696 viewBox
    revealDelay: number // Seconds after animation starts
    link?: string
    description: string
    studentCount?: number
}

export const cities: CityData[] = [
    {
        id: 'hyderabad',
        name: 'Hyderabad',
        status: 'completed',
        coordinates: { x: 215, y: 485 }, // Central-south India (Telangana)
        revealDelay: 0.5,
        link: '/editions/hyderabad',
        description: 'Completed • Feb 2025',
        studentCount: 600
    },
    {
        id: 'delhi',
        name: 'Delhi',
        status: 'confirmed',
        coordinates: { x: 192, y: 205 }, // North India
        revealDelay: 2.2,
        description: 'Confirmed • Launching Soon'
    },
    {
        id: 'bangalore',
        name: 'Bangalore',
        status: 'confirmed',
        coordinates: { x: 175, y: 575 }, // South India (Karnataka)
        revealDelay: 1.8,
        description: 'Confirmed • Launching Soon'
    },
    {
        id: 'mumbai',
        name: 'Mumbai',
        status: 'confirmed',
        coordinates: { x: 95, y: 430 }, // West coast (Maharashtra)
        revealDelay: 2.0,
        description: 'Confirmed • Launching Soon'
    },
    {
        id: 'patna',
        name: 'Patna',
        status: 'confirmed',
        coordinates: { x: 370, y: 290 }, // North-east (Bihar)
        revealDelay: 2.5,
        description: 'Confirmed • Launching Soon'
    },
    {
        id: 'kolkata',
        name: 'Kolkata',
        status: 'exploring',
        coordinates: { x: 430, y: 350 }, // East India (West Bengal)
        revealDelay: 2.8,
        description: 'Exploring • Express Interest'
    },
    {
        id: 'ahmedabad',
        name: 'Ahmedabad',
        status: 'exploring',
        coordinates: { x: 85, y: 335 }, // West India (Gujarat)
        revealDelay: 2.6,
        description: 'Exploring • Express Interest'
    },
    {
        id: 'jaipur',
        name: 'Jaipur',
        status: 'exploring',
        coordinates: { x: 150, y: 285 }, // North-west (Rajasthan)
        revealDelay: 2.4,
        description: 'Exploring • Express Interest'
    },
    {
        id: 'nagpur',
        name: 'Nagpur',
        status: 'exploring',
        coordinates: { x: 200, y: 395 }, // Central India (Maharashtra)
        revealDelay: 2.3,
        description: 'Exploring • Express Interest'
    }
]

// Hyderabad coordinates (center of ripple) - 612x696 viewBox
export const HYDERABAD_CENTER = { x: 215, y: 485 }

// Map viewBox dimensions (from @svg-maps/india)
export const MAP_VIEWBOX = { width: 612, height: 696 }

// Status colors
export const STATUS_COLORS = {
    completed: '#5CE6C9',  // Ekatva teal
    confirmed: '#FFCF96',  // Ekatva gold
    exploring: 'rgba(255, 255, 255, 0.7)'
}

// Status dot sizes
export const STATUS_SIZES = {
    completed: { dot: 14, glow: 24 },
    confirmed: { dot: 10, glow: 18 },
    exploring: { dot: 8, glow: 14 }
}
