'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import india from '@svg-maps/india'
import '@/app/about/section6b.css' // Reusing the map styles

// Map viewBox dimensions
const MAP_VIEWBOX = { width: 612, height: 696 }

// City Data - Same as Vision Section
const CITIES = [
    {
        id: 1,
        name: 'Hyderabad',
        state: 'Telangana',
        status: 'completed',
        date: 'Feb 2025',
        students: '230+',
        rating: '4.4/5',
        position: { x: 215, y: 485 },
        color: '#5CE6C9',
        description: 'The inaugural edition that proved EKATVA works at scale.',
        link: '/editions/hyderabad-2025'
    },
    {
        id: 2,
        name: 'Delhi',
        state: 'Delhi NCR',
        status: 'planned',
        date: 'Q2 2025',
        students: '300+ expected',
        rating: null,
        position: { x: 192, y: 205 },
        color: '#FFCF96',
        description: "Bringing EKATVA to North India's largest BS community."
    },
    {
        id: 3,
        name: 'Mumbai',
        state: 'Maharashtra',
        status: 'planned',
        date: 'Q3 2025',
        students: '250+ expected',
        rating: null,
        position: { x: 95, y: 430 },
        color: '#FFCF96',
        description: 'Connecting students across Mumbai and Pune regions.'
    },
    {
        id: 4,
        name: 'Bangalore',
        state: 'Karnataka',
        status: 'planned',
        date: 'Q4 2025',
        students: '280+ expected',
        rating: null,
        position: { x: 175, y: 575 },
        color: '#FFCF96',
        description: "India's tech capital meets EKATVA's community spirit."
    },
    {
        id: 5,
        name: 'Patna',
        state: 'Bihar',
        status: 'planned',
        date: 'Q2 2025',
        students: '200+ expected',
        rating: null,
        position: { x: 370, y: 290 },
        color: '#FFCF96',
        description: 'Expanding EKATVA to Eastern India.'
    },
    {
        id: 6,
        name: 'Chennai',
        state: 'Tamil Nadu',
        status: 'future',
        date: '2026',
        students: 'TBD',
        rating: null,
        position: { x: 240, y: 590 },
        color: 'rgba(255, 255, 255, 0.4)',
        description: "Coming home to IIT Madras BS's birthplace."
    },
    {
        id: 7,
        name: 'Kolkata',
        state: 'West Bengal',
        status: 'future',
        date: '2026',
        students: 'TBD',
        rating: null,
        position: { x: 430, y: 350 },
        color: 'rgba(255, 255, 255, 0.4)',
        description: 'Expanding to Eastern India.'
    },
    {
        id: 8,
        name: 'Pune',
        state: 'Maharashtra',
        status: 'future',
        date: '2026',
        students: 'TBD',
        rating: null,
        position: { x: 115, y: 460 },
        color: 'rgba(255, 255, 255, 0.4)',
        description: "Maharashtra's educational hub joins EKATVA."
    },
    {
        id: 9,
        name: 'Ahmedabad',
        state: 'Gujarat',
        status: 'future',
        date: '2027',
        students: 'TBD',
        rating: null,
        position: { x: 85, y: 335 },
        color: 'rgba(255, 255, 255, 0.4)',
        description: 'Western India expansion.'
    },
    {
        id: 10,
        name: 'Jaipur',
        state: 'Rajasthan',
        status: 'future',
        date: '2027',
        students: 'TBD',
        rating: null,
        position: { x: 150, y: 285 },
        color: 'rgba(255, 255, 255, 0.4)',
        description: 'Bringing EKATVA to Rajasthan.'
    },
    {
        id: 11,
        name: 'Nagpur',
        state: 'Maharashtra',
        status: 'future',
        date: '2027',
        students: 'TBD',
        rating: null,
        position: { x: 200, y: 395 },
        color: 'rgba(255, 255, 255, 0.4)',
        description: 'Central India expansion.'
    }
]

export function EditionsMapSection() {
    const [selectedCity, setSelectedCity] = useState(CITIES[0])

    return (
        <section className="editions-map-section py-12 relative">

            {/* Header for Map Context */}
            <div className="text-center mb-12">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-serif text-white mb-4"
                >
                    One Movement, Ten Cities
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-white/60 max-w-2xl mx-auto"
                >
                    Hyderabad was just the beginning. The movement is expanding across India.
                </motion.p>
            </div>

            <div className="map-container max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-12 px-4">
                {/* India Map with Overlay Markers */}
                <motion.div
                    className="india-map w-full lg:w-1/2 max-w-[600px] aspect-[612/696] relative"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="map-wrapper w-full h-full relative">
                        <svg
                            viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
                            className="india-map-svg w-full h-full"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Render all Indian states */}
                            {india.locations.map((location: { id: string; path: string }) => (
                                <path
                                    key={location.id}
                                    d={location.path}
                                    fill="rgba(255, 255, 255, 0.03)"
                                    stroke="rgba(255, 255, 255, 0.15)"
                                    strokeWidth="0.5"
                                    strokeLinejoin="round"
                                    className="transition-colors duration-300 hover:fill-white/5"
                                />
                            ))}

                            {/* Connection Lines */}
                            {CITIES.slice(1, 5).map((city) => (
                                <line
                                    key={`line-${city.id}`}
                                    x1={CITIES[0].position.x}
                                    y1={CITIES[0].position.y}
                                    x2={city.position.x}
                                    y2={city.position.y}
                                    stroke="rgba(92, 230, 201, 0.25)"
                                    strokeWidth="1.5"
                                    strokeDasharray="6 4"
                                />
                            ))}

                            {/* Legend */}
                            <g transform="translate(40, 660)">
                                <circle cx="0" cy="0" r="5" fill="#5CE6C9" />
                                <text x="12" y="4" fill="rgba(255, 255, 255, 0.7)" fontSize="11">Completed</text>

                                <circle cx="95" cy="0" r="5" fill="#FFCF96" />
                                <text x="107" y="4" fill="rgba(255, 255, 255, 0.7)" fontSize="11">Planned 2025</text>

                                <circle cx="215" cy="0" r="5" fill="rgba(255, 255, 255, 0.4)" />
                                <text x="227" y="4" fill="rgba(255, 255, 255, 0.7)" fontSize="11">Future</text>
                            </g>
                        </svg>

                        {/* City Markers */}
                        {CITIES.map((city) => {
                            const leftPercent = (city.position.x / MAP_VIEWBOX.width) * 100
                            const topPercent = (city.position.y / MAP_VIEWBOX.height) * 100
                            const isSelected = selectedCity.id === city.id

                            return (
                                <div
                                    key={city.id}
                                    className={`absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group`}
                                    style={{
                                        left: `${leftPercent}%`,
                                        top: `${topPercent}%`,
                                    }}
                                    onClick={() => setSelectedCity(city)}
                                >
                                    {/* Pulse ring for selected */}
                                    {isSelected && (
                                        <div
                                            className="absolute inset-0 rounded-full animate-ping opacity-75"
                                            style={{
                                                borderColor: city.color,
                                                borderWidth: '2px',
                                                width: '100%',
                                                height: '100%'
                                            }}
                                        />
                                    )}

                                    {/* Main dot */}
                                    <div
                                        className="rounded-full transition-all duration-300"
                                        style={{
                                            backgroundColor: city.color,
                                            width: isSelected ? '16px' : '10px',
                                            height: isSelected ? '16px' : '10px',
                                            boxShadow: `0 0 12px ${city.color}, 0 0 24px ${city.color}40`
                                        }}
                                    />

                                    {/* Label */}
                                    <span
                                        className={`absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs font-medium tracking-wide transition-all duration-300 ${isSelected ? 'opacity-100 translate-x-1' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1'}`}
                                        style={{ color: city.color }}
                                    >
                                        {city.name}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </motion.div>

                {/* City Details Panel */}
                <motion.div
                    className="city-details w-full lg:w-1/3 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm min-h-[300px] flex flex-col justify-center"
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedCity.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-3xl font-serif text-white">{selectedCity.name}</h3>
                                <div className="h-px flex-1 bg-white/10" />
                                <span
                                    className="text-xs uppercase tracking-wider font-bold px-3 py-1 rounded-full"
                                    style={{
                                        backgroundColor: `${selectedCity.color}20`,
                                        color: selectedCity.color
                                    }}
                                >
                                    {selectedCity.status}
                                </span>
                            </div>

                            <p className="text-white/40 uppercase tracking-widest text-xs mb-2 bg-white/5 inline-block px-2 py-1 rounded">
                                {selectedCity.state}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-black/20 p-3 rounded-lg">
                                    <span className="block text-white/40 text-[10px] uppercase tracking-wider mb-1">Timing</span>
                                    <span className="text-white font-medium">{selectedCity.date}</span>
                                </div>
                                <div className="bg-black/20 p-3 rounded-lg">
                                    <span className="block text-white/40 text-[10px] uppercase tracking-wider mb-1">Expected Scale</span>
                                    <span className="text-white font-medium">{selectedCity.students}</span>
                                </div>
                            </div>

                            <p className="text-white/80 leading-relaxed mb-6 font-light">
                                {selectedCity.description}
                            </p>

                            {selectedCity.link && (
                                <Link href={selectedCity.link} className="inline-flex items-center gap-2 text-[#5CE6C9] hover:text-white transition-colors text-sm uppercase tracking-widest font-bold group">
                                    View Edition <span className="group-hover:translate-x-1 transition-transform">→</span>
                                </Link>
                            )}

                            {/* Expansion Strategy - Integrated */}
                            <div className="mt-8 pt-6 border-t border-white/10">
                                <span className="block text-[#FFCF96] text-xs uppercase tracking-widest mb-1">Expansion Strategy</span>
                                <span className="text-white/50 text-xs">2-3 cities/year • Quality-first • Founder-led for first 5</span>
                            </div>

                        </motion.div>
                    </AnimatePresence>
                </motion.div>
            </div>
        </section>
    )
}
