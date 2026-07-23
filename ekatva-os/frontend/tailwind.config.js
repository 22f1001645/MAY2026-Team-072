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
          DEFAULT: '#050505', // Oneness Black — backgrounds, grounding
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
          'radial-gradient(1200px 600px at 20% -10%, rgba(92,230,201,0.18), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(255,207,150,0.12), transparent 55%), linear-gradient(180deg, #050505 0%, #08120f 100%)',
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
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        // Fade-in reveal: 20px upward slide + opacity 0→1 (brand kit §7)
        'fade-up': 'fade-up 0.5s cubic-bezier(0.4, 0, 0.2, 1) both',
        'spin-slow': 'spin-slow 2.4s linear infinite',
      },
    },
  },
  plugins: [],
}
