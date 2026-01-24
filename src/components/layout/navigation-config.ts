/**
 * Navigation Configuration
 * 
 * Centralized navigation data for the dual-layer navigation system.
 * This file contains all primary nav items, secondary (section) nav items,
 * and page labels for the Tomorrowland-inspired navigation.
 */

import { LucideIcon } from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NavItem {
    label: string
    href: string
    icon?: string
    type: 'link' | 'dropdown' | 'dropdown-link' // dropdown-link: click navigates, hover shows preview
}

export interface SectionLink {
    label: string
    target: string
}

export interface EditionNavItem {
    name: string
    city: string
    slug: string
    status: 'completed' | 'upcoming' | 'planned'
    date?: string
}

// ============================================================================
// PRIMARY NAVIGATION
// ============================================================================

export const PRIMARY_NAV: NavItem[] = [
    { label: 'Home', href: '/', icon: '🏠', type: 'link' },
    { label: 'About', href: '/about', icon: '📖', type: 'link' },
    { label: 'Editions', href: '/editions', icon: '🎪', type: 'dropdown-link' },
    { label: 'Partner', href: '/partner-with-us', icon: '🤝', type: 'link' },
    { label: 'Sponsor', href: '/sponsor', icon: '💰', type: 'link' },
]

// ============================================================================
// SECONDARY NAVIGATION (Per-Page Section Links)
// ============================================================================

export const SECONDARY_NAV: Record<string, SectionLink[]> = {
    '/': [
        { label: 'Our Story', target: '#origin-story' },
        { label: 'What is EKATVA', target: '#identity-reveal' },
        { label: 'Our Vision', target: '#ripple' },
        { label: 'Testimonials', target: '#testimonials' },
        { label: 'Join Us', target: '#build-with-us' },
    ],
    '/about': [
        { label: 'Intro', target: '#hero' },
        { label: 'Our Beliefs', target: '#our-beliefs' },
        { label: 'Why EKATVA', target: '#the-story' },
        { label: 'Our Philosophy', target: '#philosophy' },
        { label: 'How It Works', target: '#how-ekatva-works' },
        { label: 'The Vision', target: '#the-vision' },
        { label: 'Get Involved', target: '#get-involved' },
    ],
    // Partner and Sponsor pages have no section nav for now
}

// ============================================================================
// PAGE LABELS (For Secondary Nav Display)
// ============================================================================

export const PAGE_LABELS: Record<string, string> = {
    '/': 'EKATVA HOME',
    '/about': 'ABOUT EKATVA',
    '/partner-with-us': 'PARTNER WITH US',
    '/sponsor': 'SPONSOR EKATVA',
}

// ============================================================================
// EDITIONS DROPDOWN ITEMS
// ============================================================================

export const EDITIONS_NAV: EditionNavItem[] = [
    {
        name: 'Hyderabad',
        city: 'Hyderabad',
        slug: 'hyderabad-2025',
        status: 'completed',
        date: 'Feb 2025',
    },
    {
        name: 'Delhi',
        city: 'Delhi',
        slug: 'delhi-2025',
        status: 'planned',
        date: 'Q2 2025',
    },
    {
        name: 'Bangalore',
        city: 'Bangalore',
        slug: 'bangalore-2025',
        status: 'planned',
        date: 'Q4 2025',
    },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a page has secondary navigation
 */
export function hasSecondaryNav(pathname: string): boolean {
    return pathname in SECONDARY_NAV && SECONDARY_NAV[pathname].length > 0
}

/**
 * Get secondary nav items for a page
 */
export function getSecondaryNav(pathname: string): SectionLink[] {
    return SECONDARY_NAV[pathname] || []
}

/**
 * Get page label for secondary nav display
 */
export function getPageLabel(pathname: string): string {
    // Handle dynamic routes like /editions/[slug]
    if (pathname.startsWith('/editions/')) {
        const slug = pathname.replace('/editions/', '')
        const edition = EDITIONS_NAV.find(e => e.slug === slug)
        return edition ? `EKATVA ${edition.name.toUpperCase()}` : 'EKATVA EDITION'
    }
    return PAGE_LABELS[pathname] || 'EKATVA'
}

/**
 * Check if a nav item is active
 */
export function isNavActive(itemHref: string, pathname: string): boolean {
    if (itemHref === '/') {
        return pathname === '/'
    }
    return pathname.startsWith(itemHref)
}
