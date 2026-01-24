'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export default function FooterLogo() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="relative mx-auto"
    >
      <motion.div
        animate={{
          boxShadow: [
            '0 0 30px -10px rgba(255,207,150,0.05)',  // Idle (Almost off)
            '0 0 60px -5px rgba(255,207,150,0.15)',   // Peak (Subtle bloom)
            '0 0 30px -10px rgba(255,207,150,0.05)'   // Return
          ],
          borderColor: [
            'rgba(255,207,150,0.15)',
            'rgba(255,207,150,0.35)',
            'rgba(255,207,150,0.15)'
          ],
          scale: [1, 1.01, 1] // Micro-scale breathing
        }}
        transition={{
          duration: 6, // Slower cycle (Ritualistic)
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative w-52 h-52 md:w-64 md:h-64 p-4 border border-unity-gold/20 rounded-lg bg-white/5 backdrop-blur-sm overflow-hidden"
      >
        {/* Reflection Sheen */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut",
            repeatDelay: 2
          }}
          className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none z-0"
        />

        <div className="relative w-full h-full z-10">
          <Image
            src="/assets/images/footer-logo.gif"
            alt="Ekatva Identity"
            fill
            className="object-contain"
            unoptimized // Allow GIF to play
          />
        </div>

        {/* Decorative corner accents - Static stability amidst the breathing */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-unity-gold/60 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-unity-gold/60 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-unity-gold/60 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-unity-gold/60 rounded-br-lg" />
      </motion.div>
    </motion.div>
  )
}
