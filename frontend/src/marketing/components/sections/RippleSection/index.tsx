import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import IndiaMapSVG from './IndiaMapSVG'
import CityMarker from './CityMarker'
import RippleWave from './RippleWave'
import { cities } from '../../../data/cities'
import { ArrowRight } from 'lucide-react'
import './ripple-section.css'

/**
 * RippleSection - Compact Split-Screen Layout
 * 
 * Premium 55/45 split design:
 * - Left: India Map with city markers
 * - Right: Impact content panel (mission + vision)
 * - Optimized for single viewport
 */
export default function RippleSection() {
    const sectionRef = useRef<HTMLElement>(null)
    const [animationStarted, setAnimationStarted] = useState(false)
    const [hoveredCity, setHoveredCity] = useState<string | null>(null)
    const [isMobile, setIsMobile] = useState(false)

    const isInView = useInView(sectionRef, {
        once: true,
        amount: 0.3
    })

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Start animation when in view
    useEffect(() => {
        if (isInView && !animationStarted) {
            setAnimationStarted(true)
        }
    }, [isInView, animationStarted])

    const handleCityClick = (cityId: string) => {
        const city = cities.find(c => c.id === cityId)
        if (!city) return

        if (city.status === 'completed' && city.link) {
            window.location.href = city.link
        } else {
            window.open('https://www.instagram.com/ekatva_iitm/', '_blank')
        }

        if (isMobile && navigator.vibrate) {
            navigator.vibrate(10)
        }
    }

    // Vision items for the content panel
    const visionItems = [
        "Unite IITM BS students through shared experiences and cultural celebration",
        "Build a lasting tradition of student-led fests across multiple cities",
        "Create a sense of belonging, pride, and community among students"
    ]

    return (
        <section
            ref={sectionRef}
            id="ripple"
            className="ripple-section relative overflow-visible"
            style={{
                background: 'linear-gradient(135deg, #0E2F36 0%, #1A4D4D 50%, #2B5F6F 100%)'
            }}
            aria-label="EKATVA Movement Expansion Map"
        >
            {/* Noise texture overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }}
            />

            {/* Desktop: Main Grid Container */}
            <div className="ripple-grid relative z-10">
                {/* LEFT: Map Container (55%) */}
                <motion.div
                    initial={{ opacity: 0, x: -40 }}
                    animate={animationStarted ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="ripple-map-container relative"
                >
                    <div className="relative w-full max-w-md xl:max-w-lg">
                        <IndiaMapSVG />

                        {/* Ripple Waves */}
                        {animationStarted && (
                            <>
                                <RippleWave delay={1} duration={3} />
                                <RippleWave delay={1.8} duration={3} opacity={0.3} />
                                <RippleWave delay={2.4} duration={3} opacity={0.15} />
                            </>
                        )}

                        {/* City Markers */}
                        {cities.map((city) => (
                            <CityMarker
                                key={city.id}
                                city={city}
                                isAnimating={animationStarted}
                                isHovered={hoveredCity === city.id}
                                isHighlighted={hoveredCity === city.id}
                                onHover={setHoveredCity}
                                onClick={handleCityClick}
                                isMobile={isMobile}
                                showLabel={true}
                            />
                        ))}
                    </div>
                </motion.div>

                {/* RIGHT: Impact Content Panel (45%) */}
                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={animationStarted ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    className="ripple-content-panel"
                >
                    <div className="ripple-glass-card">
                        {/* Heading */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={animationStarted ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="mb-3"
                        >
                            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-2">
                                <span className="text-ekatva-teal">9 Cities.</span>{' '}
                                <span className="text-unity-gold">1 Mission.</span>
                            </h2>
                            <p className="text-sm text-white/60 font-medium tracking-widest uppercase">
                                Limitless Experiences.
                            </p>
                        </motion.div>

                        {/* Divider */}
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={animationStarted ? { scaleX: 1 } : {}}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="h-px bg-gradient-to-r from-ekatva-teal/50 via-white/20 to-transparent mb-3 origin-left"
                        />

                        {/* Mission Statement */}
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={animationStarted ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 1.1 }}
                            className="text-sm text-white/70 leading-relaxed mb-4"
                        >
                            Each year, EKATVA brings the full fest experience to BS students in their
                            own cities—ensuring everyone gets the opportunity to engage, explore, and
                            enjoy the best of student life, regardless of where they are.
                        </motion.p>

                        {/* Divider */}
                        <motion.div
                            initial={{ scaleX: 0 }}
                            animate={animationStarted ? { scaleX: 1 } : {}}
                            transition={{ duration: 0.6, delay: 1.4 }}
                            className="h-px bg-gradient-to-r from-transparent via-white/20 to-unity-gold/50 mb-3 origin-right"
                        />

                        {/* Vision Section */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={animationStarted ? { opacity: 1 } : {}}
                            transition={{ duration: 0.5, delay: 1.6 }}
                        >
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-ekatva-teal mb-2">
                                Our Vision
                            </h3>
                            <ul className="space-y-2">
                                {visionItems.map((item, index) => (
                                    <motion.li
                                        key={index}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={animationStarted ? { opacity: 1, x: 0 } : {}}
                                        transition={{
                                            duration: 0.4,
                                            delay: 1.8 + (index * 0.15)
                                        }}
                                        className="vision-item"
                                    >
                                        <span className="vision-icon" />
                                        <span className="vision-text">{item}</span>
                                    </motion.li>
                                ))}
                            </ul>
                        </motion.div>

                        {/* CTA Button */}
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={animationStarted ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 2.4 }}
                            className="mt-4"
                        >
                            <a
                                href="https://www.instagram.com/ekatva_iitm/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ripple-cta-button group inline-flex items-center gap-2"
                            >
                                Join The Movement
                                <ArrowRight
                                    className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                                    strokeWidth={2.5}
                                />
                            </a>
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {/* Mobile Layout */}
            <div className="ripple-mobile-layout relative z-10">
                {/* Mobile Heading - Streamlined (No Badge) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={animationStarted ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-center pt-5 pb-3 px-4"
                >
                    {/* Main Title - Large, impactful, no badge */}
                    <h2 className="font-serif text-4xl font-bold text-white leading-tight">
                        <span className="text-ekatva-teal">9 Cities.</span>{' '}
                        <span className="text-unity-gold italic">1 Mission.</span>
                    </h2>
                </motion.div>

                {/* Map + Legend side by side */}
                <div className="ripple-mobile-map-area">
                    {/* Map Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={animationStarted ? { opacity: 1, scale: 1 } : {}}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="ripple-mobile-map-wrapper"
                    >
                        <IndiaMapSVG />
                        {animationStarted && (
                            <>
                                <RippleWave delay={0.8} duration={2.5} />
                                <RippleWave delay={1.4} duration={2.5} opacity={0.25} />
                            </>
                        )}
                        {cities.map((city) => (
                            <CityMarker
                                key={city.id}
                                city={city}
                                isAnimating={animationStarted}
                                isHovered={false}
                                isHighlighted={false}
                                onHover={() => { }}
                                onClick={handleCityClick}
                                isMobile={true}
                                showLabel={false}
                            />
                        ))}
                    </motion.div>

                    {/* Legend - side by side with map */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={animationStarted ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.6, delay: 0.8 }}
                        className="ripple-mobile-legend"
                    >
                        {/* Completed */}
                        <div className="ripple-legend-row">
                            <span className="ripple-legend-dot completed" />
                            <div>
                                <span className="ripple-legend-text">Hyderabad</span>
                                <span className="ripple-legend-status">(Completed)</span>
                            </div>
                        </div>
                        {/* Confirmed */}
                        <div className="ripple-legend-row">
                            <span className="ripple-legend-dot confirmed" />
                            <div>
                                <span className="ripple-legend-text">Delhi, Bangalore, Mumbai, Patna</span>
                                <span className="ripple-legend-status">(Confirmed)</span>
                            </div>
                        </div>
                        {/* Exploring */}
                        <div className="ripple-legend-row">
                            <span className="ripple-legend-dot exploring" />
                            <div>
                                <span className="ripple-legend-text">4 More Cities</span>
                                <span className="ripple-legend-status">(Exploring)</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Mobile Mission Text */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={animationStarted ? { opacity: 1 } : {}}
                    transition={{ duration: 0.6, delay: 1.2 }}
                    className="text-sm text-white/70 text-center leading-relaxed px-4 py-3"
                >
                    EKATVA brings the full fest experience to BS students,
                    ensuring everyone gets to engage, explore, and enjoy the best of student life.
                </motion.p>

                {/* Mobile CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={animationStarted ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 1.5 }}
                    className="text-center px-4 pb-4"
                >
                    <a
                        href="https://www.instagram.com/ekatva_iitm/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ripple-cta-button-mobile w-full inline-flex items-center justify-center gap-2 text-sm"
                    >
                        Join The Movement
                        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                    </a>
                </motion.div>
            </div>
        </section>
    )
}
