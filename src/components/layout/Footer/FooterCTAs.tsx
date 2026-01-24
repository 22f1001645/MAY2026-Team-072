'use client'

import { motion } from 'framer-motion'
import { MessageCircle, MapPin } from 'lucide-react'
import Link from 'next/link'

const WHATSAPP_LINK = 'https://chat.whatsapp.com/Do3WvVMprMe3xZtcuyfYiW'

export default function FooterCTAs() {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-6">
      <motion.a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="flex items-center gap-2 px-6 py-3 rounded-full border border-ekatva-teal/30 bg-ekatva-teal/5 text-ekatva-teal hover:bg-ekatva-teal/10 hover:border-ekatva-teal transition-all duration-300 w-full sm:w-auto justify-center"
      >
        <MessageCircle size={18} />
        <span className="text-xs md:text-sm font-semibold tracking-wide uppercase">Join WhatsApp</span>
      </motion.a>

      <Link href="/editions/bring-ekatva-to-your-city" className="w-full sm:w-auto">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/50 transition-all duration-300 w-full sm:w-auto justify-center"
        >
          <MapPin size={18} />
          <span className="text-xs md:text-sm font-semibold tracking-wide uppercase">Bring Ekatva to City</span>
        </motion.div>
      </Link>
    </div>
  )
}
