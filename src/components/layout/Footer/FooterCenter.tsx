'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Linkedin, Youtube, Mail, MessageCircle, MapPin } from 'lucide-react'

const socials = [
    { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/ekatva_iitm/' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/ekatva-iitmadras/about/' },
    { name: 'YouTube', icon: Youtube, href: 'https://www.youtube.com/@Ekatva-iitmbs' },
    { name: 'Email', icon: Mail, href: 'mailto:ekatva@iitm.ac.in' }
]

const WHATSAPP_LINK = 'https://chat.whatsapp.com/Do3WvVMprMe3xZtcuyfYiW'

export default function FooterCenter() {
    return (
        <div className="flex flex-col items-center gap-8 py-8">
            {/* Premium Logo Section */}
            <div className="flex flex-col items-center gap-3">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="relative w-32 h-32 md:w-36 md:h-36"
                >
                    {/* Enhanced Logo Container */}
                    <motion.div
                        className="absolute inset-0 border-2 border-[#FFCF96]/30 rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl"
                        animate={{
                            scale: [1, 1.02, 1],
                            boxShadow: [
                                '0 8px 32px rgba(255,207,150,0.12)',
                                '0 12px 48px rgba(255,207,150,0.2)',
                                '0 8px 32px rgba(255,207,150,0.12)'
                            ]
                        }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <Image
                        src="/assets/images/footer-logo.gif"
                        alt="Ekatva - Student initiative of IIT Madras BS"
                        fill
                        className="object-contain p-4"
                        unoptimized
                    />
                </motion.div>

                {/* Tagline */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    animate={{
                        opacity: [0.5, 0.7, 0.5]
                    }}
                    className="text-[11px] text-white/50 tracking-[0.1em] font-light text-center"
                    style={{
                        animation: "pulse 6s ease-in-out infinite",
                        animationDelay: "3s"
                    }}
                >
                    Unifying 34,000+ students across India
                </motion.p>
            </div>

            {/* Enhanced Social Icons Grid */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="grid grid-cols-4 gap-3"
            >
                {socials.map((social, index) => {
                    const Icon = social.icon
                    return (
                        <motion.a
                            key={social.name}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, scale: 0, rotate: -20 }}
                            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{
                                delay: 0.6 + (index * 0.1),
                                type: "spring",
                                stiffness: 400,
                                damping: 20
                            }}
                            whileHover={{
                                scale: 1.08,
                                backgroundColor: "rgba(92, 230, 201, 0.1)",
                                borderColor: "rgba(92, 230, 201, 0.5)",
                                boxShadow: "0 8px 24px rgba(92, 230, 201, 0.2)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            className="group relative w-12 h-12 flex items-center justify-center
                                     rounded-full border-2 border-white/10
                                     bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                                     text-white/60 hover:text-[#5CE6C9]
                                     transition-all duration-300 shadow-lg
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CE6C9]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            aria-label={`Visit Ekatva on ${social.name}`}
                        >
                            <motion.div
                                whileHover={{ rotate: -5 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            >
                                <Icon size={22} strokeWidth={1.5} className="relative z-10" />
                            </motion.div>
                        </motion.a>
                    )
                })}
            </motion.div>

            {/* Premium CTAs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.9 }}
                className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-sm px-4"
            >
                {/* Primary CTA - Join WhatsApp */}
                <motion.a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{
                        scale: 1.02,
                        boxShadow: "0 8px 32px rgba(92, 230, 201, 0.25)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="group flex items-center justify-center gap-2 px-8 py-4
                             rounded-full border-2 border-[#5CE6C9]/40
                             bg-gradient-to-r from-[#5CE6C9]/10 via-[#5CE6C9]/15 to-[#5CE6C9]/10
                             backdrop-blur-2xl shadow-[0_4px_24px_rgba(92,230,201,0.15)]
                             text-[#5CE6C9] font-semibold
                             hover:border-[#5CE6C9]/80
                             hover:bg-gradient-to-r hover:from-[#5CE6C9]/20 hover:via-[#5CE6C9]/25 hover:to-[#5CE6C9]/20
                             hover:ring-2 hover:ring-[#5CE6C9]/30 hover:ring-offset-2 hover:ring-offset-transparent
                             transition-all duration-300 w-full sm:w-auto
                             text-[14px] tracking-[0.02em]
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CE6C9]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-label="Join Ekatva WhatsApp Community"
                >
                    <MessageCircle size={20} className="group-hover:translate-x-0.5 transition-transform" />
                    <span>Join WhatsApp</span>
                </motion.a>

                {/* Secondary CTA - Bring to City */}
                <Link href="/editions/bring-ekatva-to-your-city" className="w-full sm:w-auto">
                    <motion.div
                        whileHover={{
                            scale: 1.02,
                            boxShadow: "0 12px 24px rgba(255, 255, 255, 0.1)"
                        }}
                        whileTap={{ scale: 0.98 }}
                        className="group flex items-center justify-center gap-2 px-8 py-4
                                 rounded-full border-2 border-white/15
                                 bg-gradient-to-r from-white/5 to-white/8
                                 backdrop-blur-2xl shadow-lg
                                 text-white/80 font-medium
                                 hover:text-white hover:border-white/40
                                 hover:bg-gradient-to-r hover:from-white/10 hover:to-white/12
                                 hover:ring-2 hover:ring-white/20 hover:ring-offset-2 hover:ring-offset-transparent
                                 transition-all duration-300 w-full sm:w-auto
                                 cursor-pointer
                                 text-[14px] tracking-[0.02em]
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    >
                        <MapPin size={20} className="group-hover:translate-x-0.5 transition-transform" />
                        <span>Bring to City</span>
                    </motion.div>
                </Link>
            </motion.div>
        </div>
    )
}
