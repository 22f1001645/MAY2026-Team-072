import { useState } from 'react'
import india from '@svg-maps/india'

/**
 * IndiaMapSVG - Accurate India Map using @svg-maps/india
 * 
 * Based on accurate geographic coordinates from svg-maps package
 * ViewBox: 612x696 (original package dimensions)
 * Light teal fill with subtle white stroke
 */
export default function IndiaMapSVG() {
    const [hoveredState, setHoveredState] = useState<string | null>(null)

    return (
        <svg
            viewBox={india.viewBox}
            className="w-full h-auto"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Map of India showing EKATVA cities"
            style={{
                filter: 'drop-shadow(0 0 40px rgba(125, 211, 192, 0.2))'
            }}
        >
            <defs>
                {/* Gradient for map fill */}
                <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8FE8D4" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#5CC4B0" stopOpacity="0.85" />
                </linearGradient>

                {/* Hover gradient */}
                <linearGradient id="mapGradientHover" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#A8F0E0" stopOpacity="1" />
                    <stop offset="100%" stopColor="#72D4C0" stopOpacity="0.95" />
                </linearGradient>

                {/* Glow effect */}
                <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Render all Indian states/territories from the package */}
            {india.locations.map((location: any) => (
                <path
                    key={location.id}
                    id={location.id}
                    d={location.path}
                    fill={hoveredState === location.id ? 'url(#mapGradientHover)' : 'url(#mapGradient)'}
                    stroke="rgba(255, 255, 255, 0.35)"
                    strokeWidth="0.5"
                    strokeLinejoin="round"
                    onMouseEnter={() => setHoveredState(location.id)}
                    onMouseLeave={() => setHoveredState(null)}
                    style={{
                        transition: 'fill 0.3s ease',
                        cursor: 'default'
                    }}
                    aria-label={location.name}
                />
            ))}
        </svg>
    )
}

// Export the viewBox dimensions for coordinate calculations
export const INDIA_MAP_VIEWBOX = {
    width: 612,
    height: 696
}
