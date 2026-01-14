import { EDITIONS_LIST, EDITIONS_DATA } from '@/data/editions'
import { EditionCard } from '@/components/ui/EditionCard'
import type { DropdownEdition } from '@/types/edition'

/**
 * /editions Listing Page
 * Displays the 10/10 Edition Cards in a grid
 */
export default function EditionsIndex() {
    // Merge list data with detailed data (quotes, etc.)
    const editions = EDITIONS_LIST.map(edition => {
        const detail = EDITIONS_DATA[edition.slug]

        // Smart quote fallback based on status
        let fallbackQuote = "Be part of something bigger"
        if (edition.status === 'upcoming') fallbackQuote = "The campus vibe is coming to you"

        return {
            ...edition,
            cardQuote: detail?.cardQuote || fallbackQuote,
            venue: detail?.hero?.venue || 'Venue TBA'
        }
    })

    return (
        <main className="min-h-screen bg-[#050505] relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-24">
                {/* Header */}
                <div className="text-center mb-20">
                    <span className="text-teal-400 tracking-[0.2em] text-sm font-medium uppercase mb-4 block">
                        Our Journey
                    </span>
                    <h1 className="text-5xl md:text-7xl font-serif text-white mb-6">
                        City Editions
                    </h1>
                    <p className="text-white/60 max-w-2xl mx-auto text-lg no-emoji">
                        Experience the spirit of EKATVA across India.
                        One fest, infinite connections.
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
                    {editions.map((edition, index) => (
                        <EditionCard
                            key={edition.id}
                            edition={edition}
                            index={index}
                        />
                    ))}
                </div>

                {/* NOMINATE YOUR CITY SECTION */}
                <div className="mt-32 w-full max-w-4xl mx-auto">
                    <div className="border border-white/20 p-12 md:p-16 text-center hover:border-white/40 transition-colors duration-500 group cursor-pointer relative overflow-hidden">

                        {/* Background Glow */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />

                        <h3 className="text-xl md:text-2xl font-sans tracking-[0.2em] text-white/80 mb-8 font-light uppercase">
                            Want to bring Ekatva <br className="hidden md:block" />
                            to your city?
                        </h3>

                        <Link href="/editions/bring-ekatva-to-your-city" className="inline-flex items-center gap-3 text-[#FFCF96] tracking-[0.15em] text-sm font-semibold uppercase group-hover:text-white transition-colors">
                            [ Nominate Your City <span className="text-lg leading-none">→</span> ]
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    )
}
import Link from 'next/link'
