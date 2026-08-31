import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { fadeInUp } from '../../lib/animations'

interface PillarCardProps {
    icon: LucideIcon
    title: string
    description: string
    index: number
}

/**
 * PillarCard - Three Pillars of EKATVA
 * 
 * Features:
 * - Icon with glow effect
 * - Hover lift animation (y: -12)
 * - Bottom line animation on hover
 * - Staggered entrance
 */
export default function PillarCard({ icon: Icon, title, description, index }: PillarCardProps) {
    return (
        <motion.div
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: index * 0.2 }}
            whileHover={{ y: -12, transition: { duration: 0.3, ease: 'easeOut' } }}
            className="group text-center cursor-default"
        >
            {/* Icon Container - LARGER for impact */}
            <div className="relative mx-auto w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 mb-8">
                {/* Background glow */}
                <div className="absolute inset-0 bg-ekatva-teal/20 rounded-full blur-2xl group-hover:bg-ekatva-teal/40 transition-all duration-500" />

                {/* Icon circle */}
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-ekatva-teal/10 to-accent-turquoise/10 border border-ekatva-teal/30 flex items-center justify-center group-hover:border-ekatva-teal group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-14 h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 text-ekatva-teal" strokeWidth={1.5} />
                </div>
            </div>

            {/* Title - LARGER */}
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-near-black mb-4 group-hover:text-ekatva-teal transition-colors duration-300">
                {title}
            </h3>

            {/* Description - LARGER */}
            <p className="text-lg md:text-xl text-mid-gray leading-relaxed max-w-sm mx-auto">
                {description}
            </p>

            {/* Decorative bottom line - animates on hover */}
            <div className="h-1 bg-gradient-to-r from-ekatva-teal to-accent-turquoise mx-auto mt-6 rounded-full w-0 group-hover:w-20 transition-all duration-500 ease-out" />
        </motion.div>
    )
}
