import { motion } from 'framer-motion'
import { HYDERABAD_CENTER, MAP_VIEWBOX } from '../../../data/cities'

/**
 * RippleWave - Expanding Circle Animation from Hyderabad
 * 
 * Creates the visual "ripple" effect spreading across India
 * Multiple instances with different delays create depth
 */
interface RippleWaveProps {
    delay?: number
    duration?: number
    opacity?: number
}

export default function RippleWave({
    delay = 1.5,
    duration = 4,
    opacity = 0.6
}: RippleWaveProps) {
    // Convert Hyderabad coordinates to percentage based on viewBox
    const centerX = (HYDERABAD_CENTER.x / MAP_VIEWBOX.width) * 100
    const centerY = (HYDERABAD_CENTER.y / MAP_VIEWBOX.height) * 100

    return (
        <motion.div
            className="absolute pointer-events-none z-10"
            style={{
                left: `${centerX}%`,
                top: `${centerY}%`,
                transform: 'translate(-50%, -50%)'
            }}
        >
            {/* Primary ripple wave - Teal ring */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    border: '4px solid #5CE6C9',
                    left: '50%',
                    top: '50%',
                    boxShadow: '0 0 30px rgba(92, 230, 201, 0.4)'
                }}
                initial={{
                    width: 0,
                    height: 0,
                    x: '-50%',
                    y: '-50%',
                    opacity: opacity
                }}
                animate={{
                    width: ['0px', '1400px'],
                    height: ['0px', '1400px'],
                    opacity: [opacity, 0],
                    borderWidth: ['4px', '1px']
                }}
                transition={{
                    duration: duration,
                    ease: [0.25, 0.1, 0.25, 1],
                    delay: delay
                }}
            />

            {/* Secondary glow wave */}
            <motion.div
                className="absolute rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(92, 230, 201, 0.25) 0%, transparent 70%)',
                    left: '50%',
                    top: '50%'
                }}
                initial={{
                    width: 0,
                    height: 0,
                    x: '-50%',
                    y: '-50%',
                    opacity: opacity * 0.6
                }}
                animate={{
                    width: ['0px', '1000px'],
                    height: ['0px', '1000px'],
                    opacity: [opacity * 0.6, 0]
                }}
                transition={{
                    duration: duration * 0.85,
                    ease: [0.25, 0.1, 0.25, 1],
                    delay: delay
                }}
            />
        </motion.div>
    )
}
