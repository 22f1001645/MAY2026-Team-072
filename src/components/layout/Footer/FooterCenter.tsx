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
            {/* Logo */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="relative w-28 h-28 md:w-32 md:h-32"
            >
                <div className="absolute inset-0 border border-white/10 rounded-lg bg-white/5 backdrop-blur-sm" />
                <Image
                    src="/assets/images/footer-logo.gif"
                    alt="Ekatva"
                    fill
                    className="object-contain p-4"
                    unoptimized
                />

                {/* Breathing Glow Overlay */}
                <motion.div
                    className="absolute inset-0 rounded-lg pointer-events-none"
                    animate={{
                        boxShadow: [
                            '0 0 20px -5px rgba(255,207,150,0.1)',
                            '0 0 40px 0px rgba(255,207,150,0.2)',
                            '0 0 20px -5px rgba(255,207,150,0.1)'
                        ]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
            </motion.div>

            {/* Social Icons */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="flex items-center gap-4"
            >
                {socials.map((social, index) => {
                    const Icon = social.icon
                    return (
                        <motion.a
                            key={social.name}
                            href={social.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
                            whileHover={{
                                scale: 1.1,
                                y: -3,
                                backgroundColor: "rgba(255, 255, 255, 0.1)",
                                borderColor: "rgba(92, 230, 201, 0.3)",
                                boxShadow: "0 0 20px rgba(92, 230, 201, 0.2)"
                            }}
                            whileTap={{ scale: 0.95 }}
                            className="p-3 rounded-full border border-white/10 bg-white/5
                         text-white/60 hover:text-ekatva-teal
                         transition-colors duration-300 relative group"
                            aria-label={social.name}
                        >
                            <Icon size={20} strokeWidth={1.5} className="relative z-10" />
                        </motion.a>
                    )
                })}
            </motion.div>

            {/* CTAs */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md px-4"
            >
                <motion.a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center justify-center gap-2 px-6 py-3 
                     rounded-full border border-ekatva-teal/30 bg-ekatva-teal/5 
                     text-ekatva-teal hover:bg-ekatva-teal/10 hover:border-ekatva-teal
                     transition-all duration-300 w-full sm:w-auto
                     text-sm font-semibold tracking-wide uppercase shadow-[0_0_15px_rgba(92,230,201,0.1)] hover:shadow-[0_0_20px_rgba(92,230,201,0.3)]"
                >
                    <MessageCircle size={16} />
                    <span>Join WhatsApp</span>
                </motion.a>

                <Link href="/editions/bring-ekatva-to-your-city" className="w-full sm:w-auto">
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center justify-center gap-2 px-6 py-3 
                       rounded-full border border-white/20 
                       text-white/70 hover:text-white hover:border-white/50
                       transition-all duration-300 w-full sm:w-auto
                       cursor-pointer
                       text-sm font-semibold tracking-wide uppercase"
                    >
                        <MapPin size={16} />
                        <span>Bring to City</span>
                    </motion.div>
                </Link>
            </motion.div>
        </div>
    )
}
