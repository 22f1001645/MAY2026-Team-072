import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        // Custom screen variants for height-aware responsiveness
        screens: {
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
            // Height-based variants for laptop screens
            'short': { 'raw': '(max-height: 800px)' },
            'tall': { 'raw': '(min-height: 900px)' },
        },
        extend: {
            colors: {
                // Primary Colors
                'ekatva-teal': '#5CE6C9',
                'unity-gold': '#FFCF96',
                'oneness-black': '#050505',

                // Secondary Colors
                'deep-teal': '#1F4F59',
                'gradient-dark': '#0E2F36',
                'accent-turquoise': '#3FD4B6',

                // Neutral Colors
                'off-white': '#F8F8F8',
                'light-gray': '#AAAAAA',
                'mid-gray': '#666666',
                'divider-gray': '#333333',
                'near-black': '#1A1A1A',
            },
            fontFamily: {
                sans: ['var(--font-poppins)', 'Arial', 'Helvetica', 'sans-serif'],
                serif: ['var(--font-serif)', 'Georgia', 'serif'],
            },
            fontSize: {
                'fluid-h1': 'clamp(2.5rem, 5vw + 0.75rem, 7rem)',
                'fluid-h2': 'clamp(1.75rem, 3vw + 0.5rem, 4.5rem)', // Gentler curve for laptop screens
                'fluid-h2-compact': 'clamp(1.5rem, 2.5vw + 0.25rem, 3rem)', // Even tighter for short screens
                'fluid-h3': 'clamp(1.5rem, 3.5vw + 0.75rem, 3.5rem)',
                'fluid-body': 'clamp(1rem, 1.5vw + 0.25rem, 1.125rem)', // More conservative scaling
                'fluid-body-compact': 'clamp(0.9rem, 1.1vh, 1.125rem)', // Height-aware body text (physics-tuned)
                'fluid-caption': 'clamp(0.875rem, 2vw, 1rem)',
                // Stats card precision typography
                'fluid-stat-number': 'clamp(2rem, 4.5vw, 4rem)', // Safe minimum 32px, max 64px
                'fluid-stat-label': 'clamp(0.625rem, 0.8vw, 0.875rem)', // Scales down to 10px on small screens
            },
            spacing: {
                'micro': '8px',
                'small': '16px',
                'medium': '24px',
                'large': '40px',
                'hero': '80px',
                'fluid-xs': 'clamp(0.5rem, 2vw, 1rem)',
                'fluid-sm': 'clamp(1rem, 3vw, 1.5rem)',
                'fluid-md': 'clamp(1.5rem, 4vw, 2.5rem)',
                'fluid-lg': 'clamp(2rem, 5vw, 4rem)',
                'fluid-xl': 'clamp(3rem, 6vw, 6rem)',
                // Physics-tuned vertical rhythm for "poster" effect
                'fluid-section-y': 'clamp(3rem, 6vh, 6rem)', // ~46px on 768px, 96px max
                // Gap utilities for bi-dimensional scaling
                'fluid-gap': 'min(1.5rem, 2vh)', // Tightens on short screens
                'fluid-gap-sm': 'min(1rem, 1.5vh)',
                // Column gap for 2-column layouts
                'fluid-col-gap': 'clamp(2rem, 4vw, 5rem)',
                // Stats card padding
                'fluid-stat-p': 'clamp(0.5rem, 1.5vh, 1.5rem)',
            },
            animation: {
                'fade-in': 'fadeIn 0.8s ease-in-out',
                'fade-in-up': 'fadeInUp 0.6s ease-out',
                'slide-up': 'slideUp 0.6s ease-out',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 2s infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            backgroundImage: {
                'gradient-teal-dark': 'linear-gradient(135deg, #1F4F59 0%, #0E2F36 100%)',
                'gradient-hero-overlay': 'linear-gradient(135deg, rgba(31,79,89,0.6) 0%, rgba(5,5,5,0.8) 100%)',
            },
        },
    },
    plugins: [],
}
export default config
