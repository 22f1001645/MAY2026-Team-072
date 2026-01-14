'use client'

import { motion } from 'framer-motion'
import { Check, Calendar, MapPin, ArrowRight, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import type { DropdownEdition } from '@/types/edition'

interface EditionCardProps {
    edition: DropdownEdition & { cardQuote?: string; venue?: string; ctaLink?: string }
    index?: number
}

export function EditionCard({ edition, index = 0 }: EditionCardProps) {
    const isCompleted = edition.status === 'completed'

    // Status Configuration
    const statusConfig = isCompleted
        ? {
            label: 'COMPLETED',
            icon: Check,
            color: '#5CE6C9', // Teal
            bg: 'rgba(92, 230, 201, 0.12)',
            border: 'rgba(92, 230, 201, 0.6)',
            glow: 'rgba(92, 230, 201, 0.15)'
        }
        : {
            label: 'UPCOMING',
            icon: Calendar,
            color: '#FFCF96', // Gold
            bg: 'rgba(255, 207, 150, 0.12)',
            border: 'rgba(255, 207, 150, 0.6)',
            glow: 'rgba(255, 207, 150, 0.15)'
        }

    const Icon = statusConfig.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="group relative w-full max-w-[400px] h-[560px] rounded-2xl overflow-hidden cursor-pointer"
        >
            {/* LINK WRAPPER */}
            <Link href={`/editions/${edition.slug}`} className="block w-full h-full relative">

                {/* 1. BASE GRADIENT BACKGROUND */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a3d3a] via-[#0E2F36] to-[#050505] transition-colors duration-500 group-hover:from-[#1E4D49]" />

                {/* 2. ORNATE PATTERN OVERLAY (Inline SVG) */}
                <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none group-hover:opacity-[0.1] transition-opacity duration-500">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="ornate-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-teal-200" />
                                <circle cx="20" cy="20" r="2" fill="currentColor" className="text-gold-200" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#ornate-grid)" />
                    </svg>
                </div>

                {/* 3. VIGNETTE & SHADOWS */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

                {/* 4. CONTENT CONTAINER */}
                <div className="relative h-full flex flex-col items-center justify-between p-10 text-center z-10 transition-transform duration-500 group-hover:-translate-y-2">

                    {/* TOP SECTION: BADGES */}
                    <div className="w-full flex justify-between items-center">
                        {/* Edition Badge */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-teal-400/30 bg-teal-400/5 backdrop-blur-md">
                            <Star size={10} className="text-gold-300 fill-gold-300" />
                            <span className="text-[11px] font-semibold tracking-[0.15em] text-teal-200/90 uppercase">
                                EDITION {edition.id}
                            </span>
                        </div>

                        {/* Status Badge */}
                        <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-colors"
                            style={{
                                backgroundColor: statusConfig.bg,
                                border: `1px solid ${statusConfig.border}`
                            }}
                        >
                            <Icon size={12} color={statusConfig.color} strokeWidth={3} />
                            <span
                                className="text-[10px] font-bold tracking-[0.12em] uppercase"
                                style={{ color: statusConfig.color }}
                            >
                                {statusConfig.label}
                            </span>
                        </div>
                    </div>

                    {/* MIDDLE SECTION: TYPOGRAPHY HIERARCHY */}
                    <div className="flex flex-col items-center gap-6 mt-4">
                        <div className="flex flex-col items-center gap-2">
                            <h3 className="text-2xl font-bold tracking-[0.2em] text-white/90 font-sans">
                                EKATVA
                            </h3>
                            {/* Gold Underline Animation */}
                            <div className="h-[2px] w-[120px] bg-gradient-to-r from-transparent via-[#FFCF96] to-transparent origin-center transform scale-x-50 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                        </div>

                        <h2 className="text-[72px] font-serif font-normal text-white leading-[0.9] tracking-tight drop-shadow-2xl">
                            {edition.city.toUpperCase()}
                        </h2>

                        <div className="flex flex-col items-center gap-2 text-white/80">
                            <span className="text-lg font-medium tracking-wide font-sans">
                                {edition.date || edition.year}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-white/60 font-light tracking-wide uppercase">
                                <MapPin size={14} className="text-teal-400/80" />
                                <span>{edition.venue || 'Venue TBA'}</span>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM SECTION: EMOTION & CTA */}
                    <div className="flex flex-col items-center gap-8 w-full">
                        {/* Quote */}
                        {edition.cardQuote && (
                            <p className="text-sm font-serif italic text-white/60 leading-relaxed max-w-[280px] opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700 delay-100">
                                "{edition.cardQuote}"
                            </p>
                        )}

                        {/* CTA Button */}
                        <div className={`px-8 py-3 border rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-300 flex items-center gap-2
                            ${isCompleted
                                ? 'border-[#FFCF96] text-[#FFCF96] group-hover:bg-[#FFCF96]/10 group-hover:text-white group-hover:border-white'
                                : 'border-white/30 text-white/60 group-hover:border-white group-hover:text-white'
                            }`}>
                            {isCompleted ? 'View Story' : 'Get Alert'}
                            {isCompleted ? (
                                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            ) : (
                                <span className="text-[10px] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">🔔</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. HOVER GLOW EFFECT */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 100%, ${statusConfig.glow}, transparent 70%)`
                    }}
                />
                {/* Conditional Link Wrapper Closing */}
                {isCompleted ? (
                    <span className="absolute inset-0" />
                ) : (
                    <button className="absolute inset-0 w-full h-full cursor-default" onClick={(e) => e.preventDefault()} />
                )}
            </Link>
        </motion.div>
    )
}
