import { Variants } from 'framer-motion'

/**
 * Standard easing curve matching Material Design
 * cubic-bezier(0.4, 0, 0.2, 1)
 */
export const easeOut = [0.4, 0, 0.2, 1] as const

/**
 * Fade in animation variant
 */
export const fadeIn: Variants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.8, ease: 'easeOut' }
    },
}

/**
 * Fade in and slide up animation
 */
export const fadeInUp: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, ease: 'easeOut' }
    },
}

/**
 * Scale in animation (for logo, important elements)
 */
export const scaleIn: Variants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 1.5, ease: easeOut }
    },
}

/**
 * Slide in from left
 */
export const slideInLeft: Variants = {
    initial: { opacity: 0, x: -50 },
    animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.8, ease: 'easeOut' }
    },
}

/**
 * Slide in from right
 */
export const slideInRight: Variants = {
    initial: { opacity: 0, x: 50 },
    animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.8, ease: 'easeOut' }
    },
}

/**
 * Container for staggered children animations
 */
export const staggerContainer: Variants = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
}

/**
 * Child item for staggered animations
 */
export const staggerItem: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' }
    },
}

/**
 * Bounce animation for scroll indicator
 */
export const bounceAnimation: Variants = {
    initial: { opacity: 0, y: -10 },
    animate: {
        opacity: 1,
        y: [0, -8, 0],
        transition: {
            y: {
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
            },
            opacity: {
                duration: 0.6,
                delay: 1.6,
            },
        },
    },
}

/**
 * Image hover scale effect
 */
export const imageHover: Variants = {
    initial: { scale: 1 },
    hover: {
        scale: 1.05,
        transition: { duration: 0.3, ease: 'easeOut' }
    },
}

/**
 * Card hover lift effect
 */
export const cardHover: Variants = {
    initial: { y: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    hover: {
        y: -4,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        transition: { duration: 0.3, ease: 'easeOut' }
    },
}
