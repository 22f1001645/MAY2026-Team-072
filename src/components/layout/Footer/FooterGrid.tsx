'use client'

import FooterPillar from './FooterPillar'
import FooterCenter from './FooterCenter'
import FooterValuePill from './FooterValuePill'

const leftValues = [
    { name: 'Community', description: 'Connect with 34,000+ students' },
    { name: 'Growth', description: 'Personal and professional development' },
    { name: 'Unity', description: 'Building bridges across cities' },
    { name: 'Support', description: 'Peer mentorship and guidance' }
]

const rightValues = [
    { name: 'Belonging', description: 'Find your people in your city' },
    { name: 'Culture', description: 'Celebrate diverse traditions' },
    { name: 'Skills', description: 'Workshops and hands-on learning' },
    { name: 'Network', description: 'Professional connections that last' }
]

export default function FooterGrid() {
    return (
        <>
            {/* Desktop Grid Layout */}
            <div className="hidden lg:grid lg:grid-cols-[280px_1fr_280px] gap-8 items-center max-w-7xl mx-auto px-8">
                <FooterPillar position="left" values={leftValues} />
                <FooterCenter />
                <FooterPillar position="right" values={rightValues} />
            </div>

            {/* Mobile Stack Layout */}
            <div className="lg:hidden flex flex-col items-center px-6 pb-8">
                <FooterCenter />

                {/* Values in 2x4 grid on mobile - Foundation Block */}
                <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-md">
                    {[...leftValues, ...rightValues].map((value, index) => (
                        <FooterValuePill
                            key={value.name}
                            value={value.name}
                            description={value.description}
                            theme={index % 2 === 0 ? 'teal' : 'gold'}
                            delay={0.05 * index}
                        />
                    ))}
                </div>
            </div>
        </>
    )
}
