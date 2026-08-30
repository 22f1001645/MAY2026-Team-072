import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { cardHover } from '../../lib/animations'
import type { CardProps } from '../../types'

/**
 * Card component with optional hover effects and gradient background
 * Matches EKATVA Brand Kit styling
 */
export default function Card({
    children,
    className,
    hover = false,
    gradient = false
}: CardProps) {


    const cardStyles = cn(
        'rounded-2xl p-6',
        gradient
            ? 'bg-gradient-to-br from-deep-teal to-gradient-dark'
            : 'bg-gradient-dark',
        'border border-divider-gray',
        className
    )

    if (hover) {
        return (
            <motion.div
                className={cardStyles}
                variants={cardHover}
                initial="initial"
                whileHover="hover"
            >
                {children}
            </motion.div>
        )
    }

    return (
        <div className={cardStyles}>
            {children}
        </div>
    )
}
