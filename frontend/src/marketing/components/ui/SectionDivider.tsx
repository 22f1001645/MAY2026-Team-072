import { motion } from 'framer-motion'
import './section-divider.css'

interface SectionDividerProps {
    className?: string
}

/**
 * Mobile-only section divider with teal glow
 * Provides visual separation between major content sections
 */
export function SectionDivider({ className = '' }: SectionDividerProps) {
    return (
        <div className={`section-divider-wrapper ${className}`}>
            <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="section-divider"
                aria-hidden="true"
            />
        </div>
    )
}
