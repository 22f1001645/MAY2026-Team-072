'use client'

import { motion } from 'framer-motion'
import { Zap, Check, ArrowRight, Star, Cpu, GraduationCap, Briefcase } from 'lucide-react'
import Link from 'next/link'

export function SolutionsCard() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="group relative w-full h-[540px] rounded-2xl overflow-hidden cursor-pointer border border-white/5 hover:border-teal-500/30 transition-colors duration-500"
        >
            {/* LINK WRAPPER */}
            <Link href="/solutions" className="block w-full h-full relative">

                {/* 1. BASE GRADIENT BACKGROUND (Teal/Dark System Theme) */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f2e2a] via-[#05181c] to-[#000000] transition-colors duration-500 group-hover:from-[#133833]" />

                {/* 2. ORNATE PATTERN OVERLAY (Inline SVG) */}
                <div className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none group-hover:opacity-[0.12] transition-opacity duration-500">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="solution-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M0 20 L40 20 M20 0 L20 40" stroke="currentColor" strokeWidth="0.5" className="text-teal-200" />
                                <rect x="19" y="19" width="2" height="2" fill="currentColor" className="text-teal-400" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#solution-grid)" />
                    </svg>
                </div>

                {/* 3. VIGNETTE & SHADOWS */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-90" />

                {/* 4. CONTENT CONTAINER */}
                <div className="relative h-full flex flex-col items-center justify-between p-10 text-center z-10 transition-transform duration-500 group-hover:-translate-y-2">

                    {/* TOP SECTION: BADGES */}
                    <div className="w-full flex justify-between items-center">
                        {/* Universal Badge */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-teal-400/30 bg-teal-400/5 backdrop-blur-md">
                            <Star size={10} className="text-teal-300 fill-teal-300" />
                            <span className="text-[10px] font-semibold tracking-[0.15em] text-teal-200/90 uppercase">
                                FOR EVERY STUDENT
                            </span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-teal-500/10 border border-teal-500/40">
                            <Cpu size={12} className="text-teal-400" />
                            <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-teal-400">
                                SYSTEM • LIVE
                            </span>
                        </div>
                    </div>

                    {/* MIDDLE SECTION: HERO TYPOGRAPHY */}
                    <div className="flex flex-col items-center gap-6 mt-4">
                        <div className="flex flex-col items-center gap-2">
                            <h3 className="text-xl font-bold tracking-[0.25em] text-white/60 font-sans uppercase">
                                The Ecosystem
                            </h3>
                            {/* Animated Underline */}
                            <div className="h-[1px] w-[80px] bg-gradient-to-r from-transparent via-teal-500 to-transparent origin-center transform scale-x-50 group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                        </div>

                        <div className="relative">
                            <h2 className="text-[56px] lg:text-[64px] font-serif font-normal text-white leading-[0.9] tracking-tight drop-shadow-2xl">
                                EKATVA
                                <span className="block text-[42px] lg:text-[48px] text-teal-100/90 italic mt-1">
                                    Solutions.
                                </span>
                            </h2>
                        </div>

                        {/* Meta Info */}
                        <div className="flex flex-wrap justify-center gap-3 text-white/70 mt-2">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                <GraduationCap size={14} className="text-teal-400" />
                                <span className="text-[11px] font-medium tracking-wide uppercase">ACADEMIC EXCELLENCE</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                <Briefcase size={14} className="text-teal-400" />
                                <span className="text-[11px] font-medium tracking-wide uppercase">PROFESSIONAL GROWTH</span>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM SECTION: QUOTE & CTA */}
                    <div className="flex flex-col items-center gap-8 w-full">
                        {/* Functional Quote */}
                        <p className="text-sm font-sans font-light text-white/70 leading-relaxed max-w-[280px] opacity-90">
                            "Customized support systems designed specifically for the IITM BS journey. Helping you succeed in both exams and careers."
                        </p>

                        {/* CTA Button */}
                        <div className="px-8 py-3 border border-teal-500/50 text-teal-400 rounded-lg text-sm font-semibold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 group-hover:bg-teal-500 group-hover:text-black group-hover:border-teal-500 shadow-[0_0_20px_rgba(92,230,201,0.1)] group-hover:shadow-[0_0_30px_rgba(92,230,201,0.4)]">
                            Explore Solutions
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

                {/* 5. HOVER GLOW EFFECT */}
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at 50% 100%, rgba(92, 230, 201, 0.15), transparent 70%)`
                    }}
                />
            </Link>
        </motion.div>
    )
}
