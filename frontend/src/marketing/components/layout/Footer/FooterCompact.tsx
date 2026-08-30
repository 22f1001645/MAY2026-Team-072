import { motion } from 'framer-motion'
import { Image } from '../../../next-compat'
import { Link } from '../../../next-compat'
import { Mail, MessageCircle, UserPlus } from 'lucide-react'
import { Instagram, Linkedin, Youtube } from '../../ui/BrandIcons'
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { marketingUrl } from '../../../lib/asset'

const socials = [
    { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/ekatva_iitm/' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/ekatva-iitmadras/about/' },
    { name: 'YouTube', icon: Youtube, href: 'https://www.youtube.com/@Ekatva-iitmbs' },
    { name: 'Email', icon: Mail, href: 'mailto:ekatva@iitm.ac.in' }
]

const WHATSAPP_LINK = 'https://chat.whatsapp.com/Do3WvVMprMe3xZtcuyfYiW'

export default function FooterCompact() {
    return (
        <>
            {/* Top Divider */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#5CE6C9]/30 to-transparent" />

            {/* Main Footer Content */}
            <div className="max-w-5xl mx-auto px-6 py-10 md:py-12">

                {/* LAYER 1: Mission Statement (HERO) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="relative text-center mb-8"
                >
                    <p className="text-[20px] md:text-[24px] font-light text-white/90 leading-tight">
                        <span className="font-semibold text-[#5CE6C9]">34,000+</span> students
                        {" · "}
                        <span className="font-semibold text-[#FFCF96]">10+</span> cities
                        {" · "}
                        One movement
                    </p>
                </motion.div>

                {/* LAYER 2: Logo + Social Proof */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex flex-col items-center gap-3 mb-6"
                >
                    {/* Logo - 60px */}
                    <div className="relative w-15 h-15">
                        <Image
                            src="/assets/images/footer-logo.gif"
                            alt="Ekatva - Student initiative of IIT Madras BS"
                            fill
                            className="object-contain"
                            unoptimized
                        />
                        {/* Minimal glow */}
                        <div className="absolute inset-0 rounded-full blur-xl bg-[#FFCF96]/8 -z-10" />
                    </div>

                    {/* Social Icons - Inline Below Logo */}
                    <div className="flex gap-2">
                        {socials.map((social, index) => {
                            const Icon = social.icon
                            return (
                                <motion.a
                                    key={social.name}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, scale: 0 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{
                                        delay: 0.4 + (index * 0.05),
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 20
                                    }}
                                    whileHover={{
                                        scale: 1.1,
                                        borderColor: "rgba(92, 230, 201, 0.3)"
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="group relative w-8 h-8 flex items-center justify-center rounded-full
                                             border border-white/15 text-white/50
                                             hover:text-[#5CE6C9] hover:border-[#5CE6C9]/30
                                             transition-colors duration-300
                                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CE6C9]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                    aria-label={`Visit Ekatva on ${social.name}`}
                                >
                                    <Icon size={16} strokeWidth={1.5} />
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2
                                                  px-2 py-1 bg-white/95 rounded text-[10px] text-gray-900
                                                  opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                        {social.name}
                                    </div>
                                </motion.a>
                            )
                        })}
                    </div>
                </motion.div>

                {/* LAYER 3: CTAs - Primary + Secondary Hierarchy */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-col items-center mb-4"
                >
                    {/* CTA Row */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-2">
                        {/* Primary CTA - Join WhatsApp */}
                        <motion.a
                            href={WHATSAPP_LINK}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group flex items-center justify-center gap-2 px-6 py-2.5 rounded-full
                                     border-2 border-[#5CE6C9]/70 bg-[#5CE6C9]/15
                                     text-[#5CE6C9] text-[14px] font-semibold
                                     shadow-[0_0_20px_rgba(92,230,201,0.15)]
                                     hover:shadow-[0_0_30px_rgba(92,230,201,0.25)]
                                     hover:border-[#5CE6C9]
                                     transition-all duration-300
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5CE6C9]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            aria-label="Join Ekatva WhatsApp Community"
                        >
                            <MessageCircle size={18} className="group-hover:translate-x-0.5 transition-transform" />
                            <span>Join WhatsApp</span>
                        </motion.a>

                        {/* Secondary CTA - Join Our Team */}
                        <a
                            href={marketingUrl('/join-us')}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <motion.div
                                whileHover={{
                                    scale: 1.02,
                                    borderColor: "rgba(255, 255, 255, 0.4)",
                                    backgroundColor: "rgba(255, 255, 255, 0.05)"
                                }}
                                whileTap={{ scale: 0.98 }}
                                className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-full
                                         border border-white/25 bg-transparent
                                         text-white/70 text-[13px] font-medium
                                         hover:text-white/90
                                         transition-all duration-300 cursor-pointer
                                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                            >
                                <UserPlus size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                <span>Join Our Team</span>
                            </motion.div>
                        </a>
                    </div>

                    {/* Microcopy under primary CTA */}
                    <p className="text-[11px] text-white/40 text-center">Instant community access</p>
                </motion.div>

                {/* LAYER 4: Compressed Values */}
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="text-center text-[12px] text-white/40 tracking-wider uppercase mb-8"
                >
                    Community · Growth · Belonging · Network
                </motion.p>
            </div>

            {/* LAYER 5: Legal Bar */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="border-t border-white/8 mt-8 pt-6 pb-6"
            >
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center
                              justify-between gap-3 text-[10px] text-white/40 tracking-wide">
                    <span className="italic text-center md:text-left">© 2025 Ekatva · A student initiative of IIT Madras BS</span>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <a
                            href="/privacy"
                            className="hover:text-white/70 transition-colors
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm px-1"
                        >
                            Privacy
                        </a>
                        <span className="text-white/20">•</span>
                        <a
                            href="/terms"
                            className="hover:text-white/70 transition-colors
                                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-sm px-1"
                        >
                            Terms
                        </a>
                        <span className="text-white/20">•</span>
                        <span className="text-white/50">Built with ❤️ by IITM BS</span>
                    </div>
                </div>
            </motion.div>
        </>
    )
}
