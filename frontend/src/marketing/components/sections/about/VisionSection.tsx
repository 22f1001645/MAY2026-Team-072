import { motion } from 'framer-motion'
import { Link } from '../../../next-compat'
import {
    GraduationCap,
    Briefcase,
    Palette,
    Heart,
    Plane,
    Users2,
    LucideIcon,
} from 'lucide-react'
import { APP_ROUTES } from '../../layout/navigation-config'

interface EvolutionArea {
    icon: LucideIcon
    headline: string
    body: string
}

const EVOLUTION_AREAS: EvolutionArea[] = [
    { icon: GraduationCap, headline: 'Academic Support & Growth', body: 'Study groups and peer learning, not just fest weekends.' },
    { icon: Briefcase, headline: 'Career Exploration & Mentorship', body: 'Industry connections shared across the network.' },
    { icon: Palette, headline: 'Cultural Expression Platforms', body: 'Talent that reaches beyond one regional stage.' },
    { icon: Heart, headline: 'Emotional Belonging & Community', body: 'No student alone in their BS journey, wherever they live.' },
    { icon: Plane, headline: 'Travel Coordination', body: 'Seats booked together; no one travels to a fest alone.' },
    { icon: Users2, headline: 'Collaborative Projects', body: 'Inter-city work, students building together.' },
]

/** #the-vision — the "becoming more" 2030 vision, closing dream quote and CTA. */
export default function VisionSection() {
    return (
        <section id="the-vision" className="bg-gradient-dark py-20 md:py-28">
            <div className="container-custom">
                <motion.header
                    className="mx-auto mb-14 max-w-2xl text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8 }}
                >
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-ekatva-teal">
                        The Future of Student Unity
                    </span>
                    <h2 className="mt-3 font-serif text-fluid-h2 font-bold text-white">
                        EKATVA Is Becoming More
                    </h2>
                    <p className="mt-3 text-fluid-body text-white/70">
                        Not just regional fests. A broader student unity movement.
                    </p>
                </motion.header>

                <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
                    {/* Evolution areas */}
                    <motion.div
                        className="grid gap-4 sm:grid-cols-2"
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ duration: 0.6 }}
                    >
                        {EVOLUTION_AREAS.map((area) => (
                            <div key={area.headline} className="flex items-start gap-3">
                                <area.icon className="mt-0.5 h-5 w-5 shrink-0 text-unity-gold" strokeWidth={1.5} />
                                <div>
                                    <h3 className="text-sm font-semibold text-white">{area.headline}</h3>
                                    <p className="mt-0.5 text-xs leading-relaxed text-white/65">{area.body}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* Dream quote + CTA */}
                    <motion.div
                        className="rounded-2xl border border-ekatva-teal/25 bg-white/[0.03] p-8 text-center"
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ duration: 0.8 }}
                    >
                        <span className="text-xs font-semibold uppercase tracking-widest text-unity-gold">
                            The 2030 Dream
                        </span>
                        <blockquote className="mt-4 font-serif text-xl leading-snug text-white md:text-2xl">
                            &ldquo;We want EKATVA to be a reason someone{' '}
                            <span className="text-unity-gold italic">chooses IIT Madras BS.&rdquo;</span>
                        </blockquote>
                        <cite className="mt-3 block text-xs not-italic text-white/50">— Ekatva Team</cite>

                        <p className="mt-6 text-sm text-white/70">
                            Belonging is an operational problem wearing an emotional mask. This is the
                            system for it.
                        </p>

                        <Link
                            href={APP_ROUTES.signUp}
                            className="mt-6 inline-block rounded-full bg-ekatva-teal px-6 py-3 text-xs font-bold uppercase tracking-wider text-oneness-black transition-all hover:scale-[1.02] hover:bg-accent-turquoise"
                        >
                            Create Your Account
                        </Link>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
