import { motion } from 'framer-motion'
import { fadeInUp, scaleIn } from '../../../lib/animations'

/**
 * About Hero — the oneness mission statement.
 *
 * Keeps to the same visual language as the home page's HeroSection (font-serif
 * display type, teal/gold accents on oneness-black) without porting the
 * reference's morphing-script animation machinery — that's a lot of
 * `about.css` and per-language cycling state for a page whose real job here
 * is the blended copy, not a second animation showcase.
 */
export default function AboutHeroSection() {
    return (
        <section
            id="hero"
            className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-oneness-black via-deep-teal/15 to-oneness-black px-fluid-xs py-24 text-center"
            aria-label="About EKATVA"
        >
            <motion.div variants={fadeInUp} initial="initial" animate="animate" className="mb-4">
                <span className="text-[0.7rem] uppercase tracking-[0.25em] text-ekatva-teal/80 md:text-xs">
                    एकत्व · Sanskrit for Oneness
                </span>
            </motion.div>

            <motion.h1
                variants={scaleIn}
                initial="initial"
                animate="animate"
                className="font-serif text-fluid-h1 leading-[1.1] text-white"
                style={{ textShadow: '0 4px 40px rgba(92, 230, 201, 0.2)' }}
            >
                EKATVA. <span className="text-unity-gold italic">Oneness.</span>
            </motion.h1>

            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mx-auto mt-6 max-w-2xl text-fluid-body text-white/80"
            >
                A movement uniting 34,000+ IITM BS students across India — one city,
                one fest, one community at a time.
            </motion.p>
        </section>
    )
}
