/**
 * SecondaryNav - Section-Level Navigation (Dark Glass Layer)
 * 
 * Premium dark glass design (Perplexity-validated 9/10):
 * - Dark glass container with teal accent border
 * - Page identifier on the left
 * - Section links with scroll-spy active tracking
 * - Smooth scroll on click
 */

import { useState, useEffect } from 'react'
import { usePathname, Link } from '../../next-compat'
import { motion } from 'framer-motion'
import { getSecondaryNav, getPageLabel, hasSecondaryNav, APP_ROUTES, SectionLink } from './navigation-config'

export default function SecondaryNav() {
    const pathname = usePathname()
    const [activeSection, setActiveSection] = useState<string>('')
    const [isVisible, setIsVisible] = useState(true)

    const sections = getSecondaryNav(pathname ?? '/')
    const pageLabel = getPageLabel(pathname ?? '/')
    const showNav = hasSecondaryNav(pathname ?? '/')

    // Scroll spy - track active section (GSAP-aware using getBoundingClientRect)
    useEffect(() => {
        if (!showNav || sections.length === 0) return

        const handleScroll = () => {
            // Use viewport-relative positioning for GSAP ScrollTrigger compatibility
            // getBoundingClientRect gives us where elements actually ARE on screen
            const viewportThreshold = window.innerHeight * 0.4 // Active when 40% from top

            let activeTarget = sections[0]?.target || ''

            for (const section of sections) {
                const targetId = section.target.replace('#', '')
                const element = document.getElementById(targetId)

                if (element) {
                    const rect = element.getBoundingClientRect()
                    // Section is active if its top is above the threshold
                    if (rect.top <= viewportThreshold) {
                        activeTarget = section.target
                    }
                }
            }

            setActiveSection(activeTarget)
        }

        // Initial check
        handleScroll()

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [sections, showNav])

    // Smooth scroll handler
    const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
        e.preventDefault()
        const targetId = target.replace('#', '')
        const element = document.getElementById(targetId)

        if (element) {
            // Offset for the navigation height (reduced since smart hide)
            const navHeight = 80
            const elementPosition = element.getBoundingClientRect().top + window.scrollY
            const offsetPosition = elementPosition - navHeight

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            })
        }
    }

    if (!showNav || sections.length === 0) {
        return null
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex justify-center px-4"
        >
            <nav
                className="flex max-w-full items-center gap-1 px-2 py-1.5 rounded-full"
                style={{
                    background: 'rgba(15, 15, 15, 0.9)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(92, 230, 201, 0.25)',
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                }}
                role="navigation"
                aria-label="Page sections"
            >
                {/* Page Label */}
                <span
                    className="hidden shrink-0 sm:inline-block px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{
                        color: 'rgba(92, 230, 201, 0.9)',
                        borderRight: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                >
                    {pageLabel}
                </span>

                {/* Section Links */}
                <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto scrollbar-hide px-1">
                    {sections.map((section) => {
                        const isActive = activeSection === section.target

                        return (
                            <a
                                key={section.target}
                                href={section.target}
                                onClick={(e) => handleSectionClick(e, section.target)}
                                className="relative px-3 py-2 text-xs font-medium transition-all duration-200 rounded-full whitespace-nowrap"
                                style={{
                                    color: isActive
                                        ? '#5CE6C9'
                                        : 'rgba(255, 255, 255, 0.7)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)'
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
                                        e.currentTarget.style.background = 'transparent'
                                    }
                                }}
                            >
                                {section.label}

                                {/* Active Background with Teal Glow */}
                                {isActive && (
                                    <motion.div
                                        layoutId="activeSection"
                                        className="absolute inset-0 rounded-full -z-10"
                                        style={{
                                            background: 'rgba(92, 230, 201, 0.15)',
                                            border: '1px solid rgba(92, 230, 201, 0.3)',
                                            boxShadow: '0 0 12px rgba(92, 230, 201, 0.2)',
                                        }}
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </a>
                        )
                    })}
                </div>

                {/* Ekatva OS actions - the handoff from the movement to the product */}
                <div
                    className="flex shrink-0 items-center gap-1 pl-2"
                    style={{ borderLeft: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                    <Link
                        href={APP_ROUTES.logIn}
                        className="px-3 py-2 text-xs font-medium whitespace-nowrap rounded-full transition-colors duration-200 text-white/70 hover:text-white hover:bg-white/5"
                    >
                        Log in
                    </Link>
                    <Link
                        href={APP_ROUTES.signUp}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-full bg-ekatva-teal text-oneness-black transition-all duration-200 hover:bg-accent-turquoise"
                        style={{ boxShadow: '0 0 16px rgba(92, 230, 201, 0.25)' }}
                    >
                        Get Started
                    </Link>
                </div>
            </nav>
        </motion.div>
    )
}
