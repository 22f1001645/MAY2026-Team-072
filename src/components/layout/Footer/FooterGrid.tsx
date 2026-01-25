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
            {/* Desktop Grid Layout - Enhanced Spacing */}
            <div className="hidden lg:grid lg:grid-cols-[280px_1fr_280px] gap-12 items-center max-w-7xl mx-auto px-12 py-16">
                <FooterPillar position="left" values={leftValues} />
                <FooterCenter />
                <FooterPillar position="right" values={rightValues} />
            </div>

            {/* Mobile Stack Layout - Optimized 2-Column Grid */}
            <div className="lg:hidden flex flex-col items-center px-6 py-12">
                <FooterCenter />

                {/* Theme-organized 2-column grid: Left=Teal, Right=Gold */}
                <div className="grid grid-cols-2 gap-3 mt-10 w-full max-w-md">
                    {/* Left Column - All Teal Pills */}
                    <div className="flex flex-col gap-3">
                        {leftValues.map((value, index) => (
                            <FooterValuePill
                                key={value.name}
                                value={value.name}
                                description={value.description}
                                theme="teal"
                                delay={0.1 * index}
                            />
                        ))}
                    </div>

                    {/* Right Column - All Gold Pills */}
                    <div className="flex flex-col gap-3">
                        {rightValues.map((value, index) => (
                            <FooterValuePill
                                key={value.name}
                                value={value.name}
                                description={value.description}
                                theme="gold"
                                delay={0.1 * (index + 0.5)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
