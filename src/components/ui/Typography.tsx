import { ElementType, HTMLAttributes, ReactNode, createElement } from 'react'
import { cn } from '@/lib/utils'

/**
 * Typography variant types with their responsive fluid ranges
 *
 * @typedef {Object} TypographyVariants
 * @property {string} h1-hero - Ultra-large hero headlines (3.5rem - 10rem)
 * @property {string} h1-section - Section headings (2.75rem - 7rem)
 * @property {string} h2 - Sub-headings (2rem - 4rem)
 * @property {string} h3 - Smaller headings (1rem - 1.25rem)
 * @property {string} body - Body text (1rem - 1.25rem)
 * @property {string} caption - Captions and labels (0.875rem - 1rem)
 * @property {string} cta - Call-to-action buttons (fixed size for consistency)
 */
interface TypographyProps extends HTMLAttributes<HTMLElement> {
    /**
     * Typography variant to apply
     * - `h1-hero`: Ultra-large hero headlines (3.5rem - 10rem)
     * - `h1-section`: Section headings (2.75rem - 7rem)
     * - `h2`: Sub-headings (2rem - 4rem)
     * - `h3`: Smaller headings (1rem - 1.25rem)
     * - `body`: Body text (1rem - 1.25rem)
     * - `caption`: Captions and labels (0.875rem - 1rem)
     * - `cta`: Call-to-action buttons (fixed)
     */
    variant?: 'h1-hero' | 'h1-section' | 'h2' | 'h3' | 'body' | 'caption' | 'cta'
    /** Override the default HTML element */
    component?: ElementType
    /** Component children */
    children: ReactNode
}

/**
 * Fluid typography component using clamp()-based scaling for smooth responsive text
 *
 * This component provides a consistent typography system using fluid utilities defined
 * in `tailwind.config.ts`. Text scales smoothly across all viewport sizes using CSS
 * clamp() instead of stepped breakpoints, creating a more polished responsive experience.
 *
 * @example
 * // Hero headline
 * <Typography variant="h1-hero">Welcome to Ekatva</Typography>
 *
 * @example
 * // Section heading
 * <Typography variant="h1-section">Our Services</Typography>
 *
 * @example
 * // Sub-heading
 * <Typography variant="h2">About the Team</Typography>
 *
 * @example
 * // Body text
 * <Typography variant="body">
 *   This is a paragraph of body text that scales fluidly.
 * </Typography>
 *
 * @example
 * // Custom element with override
 * <Typography variant="h2" component="h3" className="text-primary">
 *   Semantic h3 with h2 styling
 * </Typography>
 *
 * @remarks
 * - Maintains backward compatibility with existing code
 * - All variants preserve their original API
 * - Fluid utilities reference: tailwind.config.ts
 * - Scales smoothly from 375px to 1920px viewports
 */
export default function Typography({
    variant = 'body',
    component,
    className,
    children,
    ...props
}: TypographyProps) {
    const tag = component ||
        (variant.startsWith('h1') ? 'h1' :
            variant === 'h2' ? 'h2' :
                variant === 'h3' ? 'h3' : 'p')

    const styles: Record<string, string> = {
        'h1-hero': 'text-fluid-h1 font-bold leading-tight',
        'h1-section': 'text-fluid-h2 font-bold leading-tight',
        'h2': 'text-fluid-h3 font-semibold leading-snug',
        'h3': 'text-fluid-body font-semibold leading-normal',
        'body': 'text-fluid-body font-normal leading-relaxed',
        'caption': 'text-fluid-caption font-normal leading-snug',
        'cta': 'text-sm font-bold uppercase tracking-wide',
    }

    return createElement(
        tag,
        { className: cn(styles[variant], className), ...props },
        children
    )
}

/**
 * Extract the variant type for external use
 */
export type TypographyVariant = TypographyProps['variant']

/**
 * Mapping of Typography variants to Tailwind fluid utility classes
 * Reference this object to understand which fluid class each variant uses
 */
export const FLUID_TYPOGRAPHY_MAP = {
    'h1-hero': 'text-fluid-h1',      // clamp(3.5rem, 8vw + 1rem, 10rem)
    'h1-section': 'text-fluid-h2',   // clamp(2.75rem, 6vw + 1rem, 7rem)
    'h2': 'text-fluid-h3',            // clamp(2rem, 5vw + 0.5rem, 4rem)
    'h3': 'text-fluid-body',          // clamp(1rem, 2.5vw + 0.25rem, 1.25rem)
    'body': 'text-fluid-body',        // clamp(1rem, 2.5vw + 0.25rem, 1.25rem)
    'caption': 'text-fluid-caption',  // clamp(0.875rem, 2vw, 1rem)
    'cta': 'text-sm',                 // Fixed size (0.875rem)
} as const

