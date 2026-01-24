'use client'


import FooterLogo from './FooterLogo'
import FooterSocialIcons from './FooterSocialIcons'

import FooterCTAs from './FooterCTAs'
import FooterLegalBar from './FooterLegalBar'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={`relative w-full overflow-hidden ${styles.footerGradient}`}>
      {/* Background Texture (Subtle) */}
      <div className={`absolute inset-0 opacity-20 pointer-events-none ${styles.footerTexture}`} />

      {/* Top Divider with Glow */}
      <div className={styles.glowDivider} />

      <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center pt-16 pb-8">



        {/* 2. Logo (Center Gravity) */}
        <div className="mb-6">
          <FooterLogo />
        </div>

        {/* 3. Social Icons (Minimalist) */}
        <div className="mb-8">
          <FooterSocialIcons />
        </div>


        {/* 5. CTAs (Action) */}
        <div className="mb-8 w-full">
          <FooterCTAs />
        </div>


      </div>

      {/* 6. Legal (Bottom) */}
      <FooterLegalBar />
    </footer>
  )
}
