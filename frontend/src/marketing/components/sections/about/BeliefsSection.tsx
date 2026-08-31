import { motion } from 'framer-motion'
import { Heart, Users, Lightbulb, Zap, LucideIcon } from 'lucide-react'
import { Card } from '../../ui'
import { fadeInUp, staggerContainer } from '../../../lib/animations'

interface Belief {
    icon: LucideIcon
    headline: string
    body: string
}

const BELIEFS: Belief[] = [
    {
        icon: Heart,
        headline: 'Unity Through Oneness',
        body: 'Cities, batches, houses disappear. At Ekatva Hyderabad, 230+ students from 10+ student bodies stopped being usernames and started being a community.',
    },
    {
        icon: Users,
        headline: 'Belonging Without Barriers',
        body: "Free transport. Free food. Free entry. Not a budget decision — a belief that money should never decide who belongs.",
    },
    {
        icon: Lightbulb,
        headline: 'By Students, For Students',
        body: "Not faculty-run, not one leader's project. A system built to scale past any single person who started it.",
    },
    {
        icon: Zap,
        headline: 'Designed to Connect Humans',
        body: "Every activity is built to break the ice, not just fill the schedule. We don't design to entertain. We design to connect.",
    },
]

/** #our-beliefs — the four belief pillars, short form. */
export default function BeliefsSection() {
    return (
        <section id="our-beliefs" className="bg-oneness-black py-20 md:py-28">
            <div className="container-custom">
                <motion.header
                    className="mx-auto mb-12 max-w-2xl text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="font-serif text-fluid-h2 font-bold text-white">What We Stand For</h2>
                    <p className="mt-3 text-fluid-body text-white/70">
                        These aren&apos;t values we chose. They&apos;re the foundations EKATVA was built on.
                    </p>
                </motion.header>

                <motion.div
                    className="grid gap-5 sm:grid-cols-2"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={staggerContainer}
                >
                    {BELIEFS.map((belief) => (
                        <motion.div key={belief.headline} variants={fadeInUp}>
                            <Card hover className="h-full">
                                <belief.icon className="mb-4 h-9 w-9 text-ekatva-teal" strokeWidth={1.5} />
                                <h3 className="mb-2 text-xl font-semibold text-white">{belief.headline}</h3>
                                <p className="text-sm leading-relaxed text-white/70">{belief.body}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    )
}
