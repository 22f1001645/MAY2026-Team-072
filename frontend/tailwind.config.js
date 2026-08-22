/** @type {import('tailwindcss').Config} */
// Brand tokens mapped directly from the EKATVA Brand Kit & Design System v1.0
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
      },
      fontFamily: {
        sans: ['Poppins', 'Arial', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        // Desktop hierarchy from the brand kit (§3)
        'hero': ['48px', { lineHeight: '1.2', fontWeight: '700' }],
        'h1': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'caption': ['12px', { lineHeight: '1.5' }],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #1F4F59 0%, #0E2F36 100%)',
        'hero-gradient':
          'radial-gradient(1200px 600px at 20% -10%, rgba(92,230,201,0.18), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(255,207,150,0.12), transparent 55%), linear-gradient(180deg, oklch(0.1 0.012 175) 0%, oklch(0.16 0.018 175) 100%)',
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
        }
      },
      animation: {
        // Fade-in reveal: 20px upward slide + opacity 0→1 (brand kit §7)
        'fade-up': 'fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
        'spin-slow': 'spin-slow 2.4s linear infinite',
        'shake': 'shake 0.4s ease-in-out',
        'spring-up': 'spring-up 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1) both',
        'aurora': 'aurora 15s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'slideInRight': 'slideInRight 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
}
