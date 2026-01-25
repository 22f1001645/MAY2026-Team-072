'use client'

import { motion } from 'framer-motion'

export default function FooterLegalBar() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.8 }}
      className="w-full border-t border-white/5 mt-8"
    >
      <div className="max-w-7xl mx-auto px-6 py-6 
                      flex flex-col md:flex-row items-center justify-between 
                      gap-3 text-[10px] text-white/30 uppercase tracking-[0.15em]">
        <span className="text-center md:text-left">
          © 2025 Ekatva. A student initiative of IIT Madras BS.
        </span>
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <a href="/privacy" className="hover:text-white/50 transition-colors">
            Privacy
          </a>
          <span className="text-white/10">•</span>
          <a href="/terms" className="hover:text-white/50 transition-colors">
            Terms
          </a>
          <span className="text-white/10">•</span>
          <span>Built with ❤️ by IITM BS</span>
        </div>
      </div>
    </motion.div>
  )
}
