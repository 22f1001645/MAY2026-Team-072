import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '../../../lib/animations'

interface BrokenSystem {
    number: string
    headline: string
    body: string
}

const BROKEN_SYSTEMS: BrokenSystem[] = [
    {
        number: '01',
        headline: 'The paradox',
        body: 'Many dual-degree students miss the one fest built for them — exam overlaps, travel, timing no one accounted for.',
    },
    {
        number: '02',
        headline: 'Passing through, not living it',
        body: 'Of 40,000+ enrolled students, fewer than 1% finish the degree. Not for lack of capability. For lack of community.',
    },
    {
        number: '03',
        headline: 'Meetups without meaning',
        body: "Events happen because it's someone's turn to run one — no framework, no consistency, nothing that outlasts the organizer.",
    },
    {
        number: '04',
        headline: 'Fragmentation',
        body: 'Houses vs. houses. Societies vs. houses. Leaderboards rigged for bragging rights instead of built for belonging.',
    },
]

/** #the-story — why EKATVA had to exist, condensed to the 4 broken systems. */
export default function WhyItExistsSection() {
    return (
        <section id="the-story" className="bg-gradient-dark py-20 md:py-28">
            <div className="container-custom">
                <motion.header
                    className="mx-auto mb-12 max-w-2xl text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="font-serif text-fluid-h2 font-bold text-unity-gold">Why EKATVA Had to Exist</h2>
                    <p className="mt-3 text-fluid-body text-white/70">
                        The moment we realized something was broken.
                    </p>
                </motion.header>

                <motion.div
                    className="mx-auto grid max-w-3xl gap-4"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={staggerContainer}
                >
                    {BROKEN_SYSTEMS.map((system) => (
                        <motion.div
                            key={system.number}
                            variants={staggerItem}
                            className="flex items-start gap-5 rounded-xl2 border border-divider-gray/60 bg-white/[0.03] p-5"
                        >
                            <span className="shrink-0 font-serif text-2xl font-bold text-ekatva-teal/70">
                                {system.number}
                            </span>
                            <div>
                                <h3 className="mb-1 text-lg font-semibold text-white">{system.headline}</h3>
                                <p className="text-sm leading-relaxed text-white/70">{system.body}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
