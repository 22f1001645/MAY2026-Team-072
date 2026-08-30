/** @type {import('tailwindcss').Config} */
// Brand tokens mapped directly from the EKATVA Brand Kit & Design System v1.0
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* ---------------------------------------------------------------
       * Marketing landing tokens (src/marketing/).
       *
       * The ported EKATVA movement site names the SAME brand palette
       * differently: `ekatva-teal` where this app says `teal`, `oneness-black`
       * where it says `onyx`. Rather than rewrite ~50 components' class names -
       * and lose the ability to re-copy upstream fixes - both vocabularies are
       * registered side by side. Every key added below is new, so no existing
       * app token changes meaning; `sans` in particular is NOT redefined, since
       * the app already maps it to Poppins.
       * ------------------------------------------------------------------- */
      screens: {
        // Height-aware variants the marketing hero uses on short laptop screens.
        short: { raw: '(max-height: 800px)' },
        tall: { raw: '(min-height: 900px)' },
      },
      backgroundSize: {
        '200': '200% 200%',
      },
      colors: {
        // Primary anchors
        teal: {
          DEFAULT: '#5CE6C9', // Ekatva Teal — CTAs, links, highlights
          accent: '#3FD4B6', // Accent Turquoise — hover / secondary CTA
          deep: '#1F4F59', // Deep Teal — section headers, dark UI
          grad: '#0E2F36', // Gradient Dark — card / gradient transitions
        },
        gold: {
          DEFAULT: '#FFCF96', // Unity Gold — headings, accents, celebration
        },
        onyx: {
          DEFAULT: 'oklch(0.13 0.015 175 / <alpha-value>)', // Oneness Black — teal-tinted, not flat gray (~#030907), backgrounds/grounding
          soft: '#111111', // Near Black — text on light
        },
        // Neutrals
        offwhite: '#F8F8F8',
        graytext: {
          light: '#AAAAAA', // captions
          mid: '#666666', // body on light
        },
        divider: '#333333',

        // --- Marketing landing palette (same hexes, upstream's names) ---
        'ekatva-teal': {
          DEFAULT: '#5CE6C9',
          50: 'rgb(92 230 201 / 0.05)',
          100: 'rgb(92 230 201 / 0.1)',
          200: 'rgb(92 230 201 / 0.2)',
          300: 'rgb(92 230 201 / 0.3)',
          400: 'rgb(92 230 201 / 0.4)',
          500: 'rgb(92 230 201 / 0.5)',
          600: 'rgb(92 230 201 / 0.6)',
          700: 'rgb(92 230 201 / 0.7)',
          800: 'rgb(92 230 201 / 0.8)',
          900: 'rgb(92 230 201 / 0.9)',
        },
        'unity-gold': {
          DEFAULT: '#FFCF96',
          50: 'rgb(255 207 150 / 0.05)',
          100: 'rgb(255 207 150 / 0.1)',
          200: 'rgb(255 207 150 / 0.2)',
          300: 'rgb(255 207 150 / 0.3)',
          400: 'rgb(255 207 150 / 0.4)',
          500: 'rgb(255 207 150 / 0.5)',
          600: 'rgb(255 207 150 / 0.6)',
          700: 'rgb(255 207 150 / 0.7)',
          800: 'rgb(255 207 150 / 0.8)',
          900: 'rgb(255 207 150 / 0.9)',
        },
        'oneness-black': {
          DEFAULT: '#050505',
          50: 'rgb(5 5 5 / 0.05)',
          100: 'rgb(5 5 5 / 0.1)',
          200: 'rgb(5 5 5 / 0.2)',
          300: 'rgb(5 5 5 / 0.3)',
          400: 'rgb(5 5 5 / 0.4)',
          500: 'rgb(5 5 5 / 0.5)',
          600: 'rgb(5 5 5 / 0.6)',
          700: 'rgb(5 5 5 / 0.7)',
          800: 'rgb(5 5 5 / 0.8)',
          900: 'rgb(5 5 5 / 0.9)',
          950: 'rgb(5 5 5 / 0.95)',
          980: 'rgb(5 5 5 / 0.98)',
        },
        'deep-teal': '#1F4F59',
        'gradient-dark': '#0E2F36',
        'accent-turquoise': '#3FD4B6',
        // Referenced by the orbital legend but never defined upstream, so the
        // SPORTS dot rendered transparent there. Value taken from the GLORY
        // planet's baseColor in src/marketing/data/planets.ts.
        'glory-coral': '#FF6B6B',
        'off-white': '#F8F8F8',
        'light-gray': '#AAAAAA',
        'mid-gray': '#666666',
        'divider-gray': '#333333',
        'near-black': '#1A1A1A',
      },
      fontFamily: {
        sans: ['Poppins', 'Arial', 'Helvetica', 'sans-serif'],
        // Used only by the marketing landing page (src/marketing/), which sets
        // its headlines in a serif display face. No app surface uses font-serif.
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        // Desktop hierarchy from the brand kit (§3)
        'hero': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'caption': ['12px', { lineHeight: '1.5' }],

        // --- Marketing landing fluid scale ---
        'fluid-h1': 'clamp(2.5rem, 5vw + 0.75rem, 7rem)',
        'fluid-h2': 'clamp(1.75rem, 3vw + 0.5rem, 4.5rem)',
        'fluid-h2-compact': 'clamp(1.5rem, 2.5vw + 0.25rem, 3rem)',
        'fluid-h3': 'clamp(1.5rem, 3.5vw + 0.75rem, 3.5rem)',
        'fluid-body': 'clamp(1rem, 1.5vw + 0.25rem, 1.125rem)',
        'fluid-body-compact': 'clamp(0.9rem, 1.1vh, 1.125rem)',
        'fluid-caption': 'clamp(0.875rem, 2vw, 1rem)',
        'fluid-stat-number': 'clamp(2rem, 4.5vw, 4rem)',
        'fluid-stat-label': 'clamp(0.625rem, 0.8vw, 0.875rem)',
      },

      spacing: {
        // --- Marketing landing rhythm ---
        micro: '8px',
        small: '16px',
        medium: '24px',
        large: '40px',
        hero: '80px',
        'fluid-xs': 'clamp(0.5rem, 2vw, 1rem)',
        'fluid-sm': 'clamp(1rem, 3vw, 1.5rem)',
        'fluid-md': 'clamp(1.5rem, 4vw, 2.5rem)',
        'fluid-lg': 'clamp(2rem, 5vw, 4rem)',
        'fluid-xl': 'clamp(3rem, 6vw, 6rem)',
        'fluid-section-y': 'clamp(3rem, 6vh, 6rem)',
        'fluid-gap': 'min(1.5rem, 2vh)',
        'fluid-gap-sm': 'min(1rem, 1.5vh)',
        'fluid-col-gap': 'clamp(2rem, 4vw, 5rem)',
        'fluid-stat-p': 'clamp(0.5rem, 1.5vh, 1.5rem)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1F4F59 0%, #0E2F36 100%)',
        'hero-gradient':
          'radial-gradient(1200px 600px at 20% -10%, rgba(92,230,201,0.18), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(255,207,150,0.12), transparent 55%), linear-gradient(180deg, oklch(0.1 0.012 175) 0%, oklch(0.16 0.018 175) 100%)',
        // --- Marketing landing gradients ---
        'gradient-teal-dark': 'linear-gradient(135deg, #1F4F59 0%, #0E2F36 100%)',
        'gradient-hero-overlay':
          'linear-gradient(135deg, rgba(31,79,89,0.6) 0%, rgba(5,5,5,0.8) 100%)',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)',
        'glow-teal': '0 0 0 1px rgba(92,230,201,0.35), 0 8px 30px rgba(92,230,201,0.15)',
      },
      borderRadius: {
        xl2: '20px',
      },
      transitionTimingFunction: {
        // Material standard easing from the brand kit (§7)
        material: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translate3d(0, 20px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'shake': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(10deg)' },
          '50%': { transform: 'rotate(-10deg)' },
          '75%': { transform: 'rotate(5deg)' },
        },
        'spring-up': {
          '0%': { opacity: '0', transform: 'translate3d(0, 20px, 0) scale(0.98)' },
          '60%': { opacity: '1', transform: 'translate3d(0, -2px, 0) scale(1.01)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0) scale(1)' },
        },
        'aurora': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)', opacity: '0.3' },
          '33%': { transform: 'translate3d(30px, -50px, 0) scale(1.1)', opacity: '0.4' },
          '66%': { transform: 'translate3d(-20px, 20px, 0) scale(0.9)', opacity: '0.2' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(30px, -50px, 0) scale(1.1)' },
          '66%': { transform: 'translate3d(-20px, 20px, 0) scale(0.9)' },
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slideInRight': {
          '0%': { transform: 'translate3d(100%, 0, 0)' },
          '100%': { transform: 'translate3d(0, 0, 0)' },
        },
        'shimmer': {
          '100%': { transform: 'translate3d(100%, 0, 0)' },
        },
        // --- Marketing landing keyframes ---
        'fadeInUp': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideUp': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'gradient-shift': 'gradient-shift 8s ease-in-out infinite',
        // Fade-in reveal: 20px upward slide + opacity 0→1 (brand kit §7)
        'fade-up': 'fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
        'spin-slow': 'spin-slow 2.4s linear infinite',
        'shake': 'shake 0.4s ease-in-out',
        'spring-up': 'spring-up 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1) both',
        'aurora': 'aurora 15s ease-in-out infinite',
        'aurora-drift': 'aurora-drift 15s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
        // --- Marketing landing animations ---
        'fade-in': 'fadeIn 0.8s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
    },
  },
  plugins: [],
}
