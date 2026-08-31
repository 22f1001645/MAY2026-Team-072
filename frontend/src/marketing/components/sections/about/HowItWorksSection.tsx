import { motion } from 'framer-motion'
import {
    Users,
    Hammer,
    Sparkles,
    Megaphone,
    PartyPopper,
    Compass,
    CheckCircle2,
    BellRing,
    UserCheck,
    Wallet,
    LucideIcon,
} from 'lucide-react'
import { Card } from '../../ui'
import { fadeInUp, staggerContainer, staggerItem } from '../../../lib/animations'

interface Step {
    icon: LucideIcon
    headline: string
    body: string
}

const STEPS: Step[] = [
    { icon: Users, headline: 'Unite the Community', body: 'Student societies align; the Governing Body reviews and greenlights.' },
    { icon: Hammer, headline: 'Build the Foundation', body: 'Interest forms, venues, sponsors, budgets — locked in.' },
    { icon: Sparkles, headline: 'Design the Experience', body: 'Every activity engineered to connect strangers, not perform for them.' },
    { icon: Megaphone, headline: 'Spread the Word', body: 'One message, everywhere: free transport, free food, real people.' },
    { icon: PartyPopper, headline: 'Create Lasting Memories', body: 'Strangers arrive. Friend groups leave.' },
]

const DEPARTMENTS = ['Content', 'Cultural', 'Technical', 'Transport', 'Volunteers', 'Sponsor', 'Media']

interface OsFeature {
    icon: LucideIcon
    headline: string
    body: string
}

const OS_FEATURES: OsFeature[] = [
    { icon: Compass, headline: 'Discovery feed', body: 'Replaces the group-chat guesswork of "is this happening?"' },
    { icon: CheckCircle2, headline: 'Proposal → approval', body: 'Replaces the email chain with a visible, audited yes.' },
    { icon: BellRing, headline: 'Registration & reminders', body: 'Turns a maybe into a headcount you can plan food and buses around.' },
    { icon: UserCheck, headline: 'Attendance check-in', body: 'Replaces the sign-in sheet — and quietly powers points and fee utilisation.' },
    { icon: Wallet, headline: 'Reimbursement pipeline', body: 'Submitted → verified → approved → paid, instead of a 15–30 day wait.' },
]

/**
 * #how-ekatva-works — the 5-step blueprint, the org structure, and the
 * "how EKATVA OS carries it forward" thread woven in as a continuation of
 * the same how-it-works story rather than a separate product-pitch block.
 */
export default function HowItWorksSection() {
    return (
        <section id="how-ekatva-works" className="bg-oneness-black py-20 md:py-28">
            <div className="container-custom">
                <motion.header
                    className="mx-auto mb-14 max-w-2xl text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8 }}
                >
                    <h2 className="font-serif text-fluid-h2 font-bold text-white">How EKATVA Works</h2>
                    <p className="mt-3 text-fluid-body text-white/70">
                        A movement run by the community, for the community — and now, running on
                        infrastructure built to outlast any one handover.
                    </p>
                </motion.header>

                {/* 5-step blueprint */}
                <motion.div
                    className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, margin: '-50px' }}
                    variants={staggerContainer}
                >
                    {STEPS.map((step, i) => (
                        <motion.div key={step.headline} variants={staggerItem} className="relative">
                            <Card className="h-full">
                                <span className="text-xs font-bold uppercase tracking-widest text-ekatva-teal/60">
                                    Step {i + 1}
                                </span>
                                <step.icon className="my-3 h-7 w-7 text-ekatva-teal" strokeWidth={1.5} />
                                <h3 className="mb-1 text-base font-semibold text-white">{step.headline}</h3>
                                <p className="text-xs leading-relaxed text-white/65">{step.body}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Org structure */}
                <motion.div
                    className="mx-auto mt-14 max-w-3xl text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-50px' }}
                    transition={{ duration: 0.6 }}
                >
                    <p className="text-sm font-semibold uppercase tracking-widest text-unity-gold/80">
                        The org
                    </p>
                    <p className="mt-2 text-fluid-body text-white/80">
                        Governing Body <span className="text-white/40">(12 UHC Houses + 20+ Societies)</span>{' '}
                        <span className="mx-2 text-ekatva-teal">→</span> City Chapters{' '}
                        <span className="mx-2 text-ekatva-teal">→</span> 7 cross-functional teams
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {DEPARTMENTS.map((dept) => (
                            <span
                                key={dept}
                                className="rounded-full border border-divider-gray/60 bg-white/[0.03] px-3 py-1 text-xs font-medium text-white/70"
                            >
                                {dept}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-white/50">
                        Flat, student-led, built to repeat without depending on any one person.
                    </p>
                </motion.div>

                {/* How EKATVA OS carries it forward */}
                <motion.div
                    className="mx-auto mt-20 max-w-4xl"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.8 }}
                >
                    <h3 className="text-center font-serif text-2xl font-bold text-white md:text-3xl">
                        How EKATVA OS Carries It Forward
                    </h3>
                    <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/70">
                        Every one of those five steps used to run on borrowed tools — WhatsApp for
                        coordination, Forms for interest, Sheets for budgets, email for approvals, and one
                        outgoing Secretary&apos;s memory for everything nobody wrote down. It worked, city
                        by city, because students made it work. But belonging shouldn&apos;t run on a
                        colander.
                    </p>

                    <motion.div
                        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
                        initial="initial"
                        whileInView="animate"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                    >
                        {OS_FEATURES.map((feature) => (
                            <motion.div key={feature.headline} variants={fadeInUp}>
                                <Card hover className="h-full">
                                    <feature.icon className="mb-3 h-6 w-6 text-unity-gold" strokeWidth={1.5} />
                                    <h4 className="mb-1 text-sm font-semibold text-white">{feature.headline}</h4>
                                    <p className="text-xs leading-relaxed text-white/65">{feature.body}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    <p className="mt-8 text-center text-sm font-medium text-ekatva-teal">
                        Same movement. Same five steps. Just nothing gets lost at handover anymore.
                    </p>
                </motion.div>
            </div>
        </section>
    )
}
