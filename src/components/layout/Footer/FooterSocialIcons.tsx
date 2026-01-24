'use client'

import { motion } from 'framer-motion'
import { Instagram, Linkedin, Youtube, Mail } from 'lucide-react'

const socials = [
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/ekatva_iitm/' },
  { name: 'LinkedIn', icon: Linkedin, href: 'https://www.linkedin.com/company/ekatva-iitmadras/about/' },
  { name: 'YouTube', icon: Youtube, href: 'https://www.youtube.com/@Ekatva-iitmbs' },
  { name: 'Email', icon: Mail, href: 'mailto:ekatva@iitm.ac.in' }
]

export default function FooterSocialIcons() {
  return (
    <div className="flex items-center justify-center gap-6 md:gap-8">
      {socials.map((social) => {
        const Icon = social.icon
        return (
          <motion.a
            key={social.name}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{
              scale: 1.1,
              y: -3,
              backgroundColor: "rgba(255, 255, 255, 0.1)", // Brighter on hover
              borderColor: "rgba(92, 230, 201, 0.3)",      // Teal tint border
              boxShadow: "0 0 25px rgba(92, 230, 201, 0.25)"
            }}
            initial={{
              backgroundColor: "rgba(255, 255, 255, 0.02)", // Permanent Faint Glass
              borderColor: "rgba(255, 255, 255, 0.05)"      // Permanent Faint Border
            }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="relative p-4 rounded-full border text-white/60 hover:text-ekatva-teal transition-all duration-500 group"
            aria-label={social.name}
          >
            <Icon size={24} strokeWidth={1.5} className="relative z-10" />
          </motion.a>
        )
      })}
    </div>
  )
}
