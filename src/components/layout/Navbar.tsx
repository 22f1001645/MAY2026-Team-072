'use client'

/**
 * Navbar - Dual-Layer Navigation System Orchestrator
 *
 * Award-winning navigation with:
 * - Primary Nav (Dark Glass): Page-level navigation, always visible/fixed
 * - Secondary Nav (Dark Glass): Section-level navigation, hidden during hero
 * - Mobile Nav: Combined hamburger menu
 *
 * Smart Behaviors:
 * - Hero Protection: Secondary nav appears after scrolling 80% on pages with heroes
 * - Primary nav is pinned at all times, including inside the hero
 */

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import PrimaryNav from './PrimaryNav'
import SecondaryNav from './SecondaryNav'
import MobileNav from './MobileNav'
import { hasSecondaryNav } from './navigation-config'

export default function Navbar() {
    const pathname = usePathname()
    const [showSecondaryByHero, setShowSecondaryByHero] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    // Pages with hero sections that need scroll-triggered secondary nav visibility
    const pagesWithHero = ['/', '/about']
    const hasHeroSection = pagesWithHero.includes(pathname ?? '/')
    const showSecondary = hasSecondaryNav(pathname ?? '/')

    // HERO PROTECTION: secondary nav only appears once scrolled past the hero
    useEffect(() => {
        const handleScroll = () => {
            if (hasHeroSection) {
                setShowSecondaryByHero(window.scrollY > window.innerHeight * 0.8)
            } else {
                setShowSecondaryByHero(true)
            }
        }

        // Initial check
        handleScroll()

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [hasHeroSection])

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [pathname])

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isMobileMenuOpen])

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50">
                {/* Primary Navigation (Dark Glass) - Always Visible */}
                <motion.div
                    className="mx-4 mt-4"
                    initial={{ y: -80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                    <PrimaryNav
                        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        isMobileMenuOpen={isMobileMenuOpen}
                    />
                </motion.div>

                {/* Secondary Navigation (Dark Glass) - Hidden during hero */}
                <AnimatePresence>
                    {showSecondary && showSecondaryByHero && (
                        <motion.div
                            className="hidden md:block"
                            style={{ marginTop: '12px' }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            layout
                            transition={{ duration: 0.3 }}
                        >
                            <SecondaryNav />
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Mobile Navigation Menu */}
            <MobileNav
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
        </>
    )
}
