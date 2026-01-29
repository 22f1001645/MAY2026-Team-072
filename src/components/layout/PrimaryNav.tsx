'use client'

/**
 * PrimaryNav - Page-Level Navigation (Dark Glass Layer)
 * 
 * Features:
 * - Dark glass morphism design
 * - Logo with hover effects
 * - Page navigation links
 * - Editions dropdown integration
 * - Active page indicator
 * - CTA button
 */

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Menu, X } from 'lucide-react'
import { PRIMARY_NAV, EDITIONS_NAV, isNavActive, hasSecondaryNav } from './navigation-config'

interface PrimaryNavProps {
    onMobileMenuToggle: () => void
    isMobileMenuOpen: boolean
}

export default function PrimaryNav({ onMobileMenuToggle, isMobileMenuOpen }: PrimaryNavProps) {
    const pathname = usePathname()
    const [editionsOpen, setEditionsOpen] = useState(false)
    const [showAttentionPulse, setShowAttentionPulse] = useState(true)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Check if current page has secondary nav (affects dropdown position)
    const showSecondary = hasSecondaryNav(pathname ?? '/')
    const dropdownTop = showSecondary ? '160px' : '108px'

    // Stop attention pulse after first hover interaction
    const handleFirstInteraction = () => {
        if (showAttentionPulse) setShowAttentionPulse(false)
    }

    // Delayed hover open (150ms) for intentional interaction
    const handleMouseEnter = () => {
        handleFirstInteraction()
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current)
            leaveTimeoutRef.current = null
        }
        hoverTimeoutRef.current = setTimeout(() => {
            setEditionsOpen(true)
        }, 150)
    }

    // Delayed hover close (200ms) to allow cursor to reach dropdown
    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
        leaveTimeoutRef.current = setTimeout(() => {
            setEditionsOpen(false)
        }, 200)
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setEditionsOpen(false)
            }
        }
        if (editionsOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [editionsOpen])

    return (
        <nav
            className="px-5 py-2.5 rounded-xl border border-white/10"
            style={{
                background: 'rgba(5, 5, 5, 0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
            }}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-ekatva-teal/30 group-hover:border-ekatva-teal transition-colors">
                        <Image
                            src="/assets/images/Ekatva Logo.png"
                            alt="EKATVA"
                            fill
                            className="object-cover"
                        />
                    </div>
                    <span className="font-serif text-xl text-white group-hover:text-ekatva-teal transition-colors hidden sm:block">
                        EKATVA
                    </span>
                </Link>

                {/* Desktop Nav Links */}
                <div className="hidden md:flex items-center gap-1">
                    {PRIMARY_NAV.map((item) => {
                        const isActive = isNavActive(item.href, pathname ?? '/')

                        // Editions Dropdown-Link (Click navigates, Hover shows preview)
                        if (item.type === 'dropdown-link' || item.type === 'dropdown') {
                            return (
                                <div
                                    key={item.href}
                                    ref={dropdownRef}
                                    className="relative"
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    {/* Clickable Link - Navigates to /editions */}
                                    <Link
                                        href={item.href}
                                        className="relative px-4 py-2 text-sm uppercase tracking-wider font-medium transition-all flex items-center gap-1.5 rounded-lg group"
                                        style={{
                                            color: isActive || editionsOpen ? '#5CE6C9' : 'rgba(255, 255, 255, 0.7)',
                                            background: editionsOpen ? 'rgba(92, 230, 201, 0.05)' : 'transparent',
                                        }}
                                        onClick={() => setEditionsOpen(false)} // Close dropdown when navigating
                                    >
                                        {item.label}

                                        {/* Chevron with Attention Pulse Animation */}
                                        <motion.div
                                            animate={showAttentionPulse ? {
                                                y: [0, 2, 0],
                                                opacity: [1, 0.7, 1]
                                            } : {}}
                                            transition={showAttentionPulse ? {
                                                duration: 1.2,
                                                repeat: 2,
                                                delay: 3,
                                                ease: 'easeInOut'
                                            } : {}}
                                        >
                                            <ChevronDown
                                                size={14}
                                                className={`transition-all duration-200 ${editionsOpen ? 'rotate-180 text-ekatva-teal' : 'group-hover:text-ekatva-teal group-hover:translate-y-0.5'}`}
                                            />
                                        </motion.div>

                                        {/* Underline Indicator - Expands on hover, solid when open */}
                                        <motion.div
                                            className="absolute -bottom-0.5 left-1/2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-ekatva-teal to-transparent"
                                            initial={{ width: 0, x: '-50%' }}
                                            animate={{
                                                width: editionsOpen ? '100%' : '0%',
                                                opacity: editionsOpen ? 1 : 0,
                                            }}
                                            whileHover={{ width: '80%', opacity: 0.7 }}
                                            transition={{ duration: 0.2, ease: 'easeOut' }}
                                            style={{ transformOrigin: 'center' }}
                                        />

                                        {/* Active Page Dot (when on /editions) */}
                                        {isActive && !editionsOpen && (
                                            <motion.div
                                                layoutId="activePage"
                                                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-ekatva-teal"
                                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            />
                                        )}
                                    </Link>

                                    {/* World-Class Premium Editions Mega Menu */}
                                    <AnimatePresence>
                                        {editionsOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                                className="fixed left-0 right-0 flex justify-center"
                                                style={{
                                                    top: dropdownTop, // Dynamic: 160px with secondary nav, 108px without
                                                    zIndex: 100,
                                                }}
                                            >
                                                <div className="relative max-w-6xl w-full mx-4">
                                                    {/* VISUAL ANCHOR SYSTEM */}

                                                    {/* 1. The Beam: Full-width top gradient line to separate from Secondary Nav */}
                                                    <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-ekatva-teal/50 to-transparent shadow-[0_0_15px_rgba(92,230,201,0.3)]" />

                                                    {/* 2. The Keystone: Center thick anchor passing through */}
                                                    <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-32 h-[3px] bg-ekatva-teal rounded-full shadow-[0_0_20px_rgba(92,230,201,0.6)] z-20" />

                                                    {/* Main Container - Glass & Spotlight */}
                                                    <div
                                                        className="relative rounded-2xl overflow-hidden"
                                                        style={{
                                                            background: 'linear-gradient(180deg, rgba(18, 18, 18, 0.98) 0%, rgba(8, 8, 8, 0.99) 100%)', // Deep moody dark
                                                            backdropFilter: 'blur(40px)',
                                                            WebkitBackdropFilter: 'blur(40px)',
                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                            boxShadow: `
                                                                0 20px 50px -10px rgba(0, 0, 0, 0.8),
                                                                inset 0 1px 0 rgba(255, 255, 255, 0.1)
                                                            `,
                                                        }}
                                                    >
                                                        {/* Spotlight Effect Top Center */}
                                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-32 bg-ekatva-teal/5 blur-[80px] rounded-full pointer-events-none" />

                                                        {/* Decorative Tech Corners */}
                                                        <div className="absolute top-4 left-4 w-2 h-2 border-t border-l border-white/20" />
                                                        <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/20" />
                                                        <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-white/20" />
                                                        <div className="absolute bottom-4 right-4 w-2 h-2 border-b border-r border-white/20" />

                                                        <div className="relative px-8 py-8">
                                                            {/* Header Row */}
                                                            <div className="flex items-end justify-between mb-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-1 h-12 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
                                                                    <div>
                                                                        <h3 className="text-white font-serif text-3xl tracking-wide leading-none">Editions</h3>
                                                                        <p className="text-white/40 text-sm mt-1.5 font-light tracking-wide">10 cities by 2030 — one fest at a time</p>
                                                                    </div>
                                                                </div>
                                                                <Link
                                                                    href="/editions"
                                                                    className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                                                                    onClick={() => setEditionsOpen(false)}
                                                                >
                                                                    <span className="text-ekatva-teal text-xs font-bold uppercase tracking-widest">View All</span>
                                                                    <span className="text-ekatva-teal group-hover:translate-x-1 transition-transform">→</span>
                                                                </Link>
                                                            </div>

                                                            {/* Cards Grid - Visual Hierarchy */}
                                                            <div className="grid grid-cols-4 gap-6">
                                                                {/* Featured: Hyderabad */}
                                                                <Link
                                                                    href="/editions/hyderabad-2025"
                                                                    className="group relative p-6 rounded-xl border border-white/10 transition-all duration-300 overflow-hidden"
                                                                    onClick={() => setEditionsOpen(false)}
                                                                    onMouseEnter={(e) => {
                                                                        e.currentTarget.style.borderColor = 'rgba(92, 230, 201, 0.5)'
                                                                        e.currentTarget.style.background = 'rgba(92, 230, 201, 0.03)'
                                                                    }}
                                                                    onMouseLeave={(e) => {
                                                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                                                                        e.currentTarget.style.background = 'transparent'
                                                                    }}
                                                                >
                                                                    {/* Card Glow */}
                                                                    <div className="absolute inset-0 bg-gradient-to-br from-ekatva-teal/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                                                    <div className="relative z-10">
                                                                        <div className="flex items-start justify-between mb-4">
                                                                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-ekatva-teal text-oneness-black">
                                                                                Completed
                                                                            </span>
                                                                            <span className="text-ekatva-teal opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                                                                                ↗
                                                                            </span>
                                                                        </div>
                                                                        <h4 className="text-white font-serif text-2xl group-hover:text-ekatva-teal transition-colors">Hyderabad</h4>
                                                                        <div className="flex items-center gap-2 mt-2 text-white/50 text-sm">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-ekatva-teal/50" />
                                                                            Feb 2025
                                                                        </div>
                                                                    </div>
                                                                </Link>

                                                                {/* Upcoming: Delhi */}
                                                                <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                                                                    <div className="flex items-start justify-between mb-4">
                                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-ekatva-gold/20 text-ekatva-gold border border-ekatva-gold/30">
                                                                            Coming Soon
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="text-white/80 font-serif text-2xl">Delhi</h4>
                                                                    <div className="flex items-center gap-2 mt-2 text-white/40 text-sm">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-ekatva-gold/50" />
                                                                        Q2 2025
                                                                    </div>
                                                                </div>

                                                                {/* Planned: Bangalore */}
                                                                <div className="p-6 rounded-xl border border-white/5 bg-white/[0.01]">
                                                                    <div className="flex items-start justify-between mb-4">
                                                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/10 text-white/40">
                                                                            Planned
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="text-white/40 font-serif text-2xl">Bangalore</h4>
                                                                    <div className="flex items-center gap-2 mt-2 text-white/30 text-sm">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                                                        Q4 2025
                                                                    </div>
                                                                </div>

                                                                {/* CTA Card */}
                                                                <Link
                                                                    href="/editions/bring-ekatva-to-your-city"
                                                                    className="group relative p-6 rounded-xl border border-dashed border-white/20 hover:border-ekatva-gold/60 transition-all bg-white/[0.01] hover:bg-ekatva-gold/5 flex flex-col justify-end"
                                                                    onClick={() => setEditionsOpen(false)}
                                                                >
                                                                    <div className="mb-auto">
                                                                        <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform origin-left">🎯</span>
                                                                    </div>
                                                                    <h4 className="text-white font-medium text-lg group-hover:text-ekatva-gold transition-colors leading-tight">
                                                                        Bring EKATVA to Your City
                                                                    </h4>
                                                                    <p className="text-white/40 text-xs uppercase tracking-wider mt-2 group-hover:text-ekatva-gold/70">Host a regional fest</p>
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )
                        }

                        // Regular Links
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative px-4 py-2 text-sm uppercase tracking-wider font-medium transition-colors rounded-lg group hover:bg-ekatva-teal/5"
                                style={{
                                    color: isActive ? '#5CE6C9' : 'rgba(255, 255, 255, 0.7)'
                                }}
                            >
                                <span className="relative z-10 group-hover:text-ekatva-teal transition-colors">
                                    {item.label}
                                </span>

                                {/* Spotlight / Underline Effect */}
                                <motion.div
                                    className="absolute -bottom-0.5 left-1/2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-ekatva-teal to-transparent"
                                    initial={{ width: 0, x: '-50%' }}
                                    animate={{
                                        width: '0%',
                                        opacity: 0,
                                    }}
                                    whileHover={{ width: '80%', opacity: 0.7 }}
                                    transition={{ duration: 0.2, ease: 'easeOut' }}
                                    style={{ transformOrigin: 'center' }}
                                />

                                {isActive && (
                                    <motion.div
                                        layoutId="activePage"
                                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-ekatva-teal"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </Link>
                        )
                    })}
                </div>

                {/* CTA Button with Premium Shimmer Effect */}
                <Link
                    href="/join-us"
                    className="hidden md:inline-flex relative overflow-hidden group px-6 py-2.5 bg-ekatva-teal rounded-full text-oneness-black font-bold text-sm uppercase tracking-wider transition-all duration-300"
                    style={{
                        boxShadow: '0 0 20px rgba(92, 230, 201, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 30px rgba(92, 230, 201, 0.4), 0 6px 18px rgba(0, 0, 0, 0.2)'
                        e.currentTarget.style.transform = 'translateY(-1px)'
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(92, 230, 201, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)'
                        e.currentTarget.style.transform = 'translateY(0)'
                    }}
                >
                    {/* Shimmer sweep overlay - visible on hover */}
                    <span
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                            animation: 'shimmer 2.5s ease-in-out infinite',
                        }}
                    />

                    {/* Persistent subtle shine */}
                    <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                            animation: 'shimmer-subtle 4s ease-in-out infinite',
                        }}
                    />

                    <span className="relative z-10">Join Us</span>
                </Link>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2 text-white hover:text-ekatva-teal transition-colors"
                    onClick={onMobileMenuToggle}
                    aria-label="Toggle menu"
                    aria-expanded={isMobileMenuOpen}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </nav>
    )
}
