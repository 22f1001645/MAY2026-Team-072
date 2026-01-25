'use client'

import FooterGrid from './FooterGrid'
import FooterLegalBar from './FooterLegalBar'
import styles from './Footer.module.css'

export default function Footer() {
    return (
        <footer className={`relative w-full overflow-hidden ${styles.footerGradient}`}>
            {/* Subtle top divider with glow */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-ekatva-teal/20 to-transparent" />

            {/* Background Texture (Subtle) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235CE6C9' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />

            {/* Main Footer Content */}
            <div className="relative z-10 w-full py-12">
                <FooterGrid />
            </div>

            {/* Legal Bar */}
            <FooterLegalBar />
        </footer>
    )
}
