import React from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps'
import { cx } from '../lib/format'
import indiaTopoJson from '../data/india.topo.json'

export interface Region {
  id: string
  name: string
}

interface IndiaMapProps {
  regions: Region[]
  selectedRegionId: string | null
  onSelect: (id: string) => void
}

const MARKERS: Record<string, { coordinates: [number, number] }> = {
  'Delhi (Delhi-NCR)': { coordinates: [77.2090, 28.6139] },
  'Chandigarh (Punjab, HP, RJ, J&K)': { coordinates: [76.7794, 30.7333] },
  'Lucknow (UP, Gwalior)': { coordinates: [80.9462, 26.8467] },
  'Patna (Bihar, Jharkhand, Chhattisgarh)': { coordinates: [85.1376, 25.5941] },
  'Kolkata (WB, NE, Odisha)': { coordinates: [88.3639, 22.5726] },
  'Mumbai (Maharashtra, Gujarat)': { coordinates: [72.8777, 19.0760] },
  'Hyderabad (AP & Telangana)': { coordinates: [78.4867, 17.3850] },
  'Bengaluru (Karnataka, Kerala)': { coordinates: [77.5946, 12.9716] },
  'Chennai (Tamil Nadu)': { coordinates: [80.2707, 13.0827] },
  'International': { coordinates: [90.0, 15.0] }, // Bay of Bengal placement
}

export function IndiaMap({ regions, selectedRegionId, onSelect }: IndiaMapProps) {
  return (
    <div className="relative w-full max-w-[600px] mx-auto bg-transparent">
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1000,
          center: [82.5, 22.5], // Center of India
        }}
        width={600}
        height={600}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={indiaTopoJson}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1e3a40"
                stroke="#2dd4bf"
                strokeWidth={0.5}
                className="opacity-60 drop-shadow-lg outline-none"
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none', fill: '#254b52' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>

        {regions.map((region) => {
          const pos = MARKERS[region.name]
          if (!pos) return null

          const isSelected = selectedRegionId === region.id

          return (
            <Marker key={region.id} coordinates={pos.coordinates}>
              <g
                className="group cursor-pointer outline-none"
                onClick={() => onSelect(region.id)}
              >
                {/* Stable hit area to prevent flickering */}
                <circle r={24} fill="transparent" className="pointer-events-auto" />

                {/* Ping animation when selected */}
                {isSelected && (
                  <circle r={14} fill="#2dd4bf" className="animate-ping opacity-40 pointer-events-none" />
                )}
                
                {/* Marker body */}
                <circle
                  r={isSelected ? 10 : 6}
                  fill={isSelected ? '#2dd4bf' : 'rgba(45,212,191,0.5)'}
                  className="transition-all duration-300 group-hover:fill-[#2dd4bf] group-hover:scale-125 pointer-events-none"
                  style={{
                    transformOrigin: '0px 0px',
                    ...(isSelected ? { filter: 'drop-shadow(0 0 10px rgba(45,212,191,0.8))' } : {})
                  }}
                />
                
                {/* Tooltip Background */}
                <rect
                  x="-80"
                  y="-40"
                  width="160"
                  height="26"
                  rx="6"
                  fill="#0d1b1e"
                  pointerEvents="none"
                  className={cx(
                    "transition-all duration-200 drop-shadow-xl stroke-white/10 stroke-1",
                    isSelected ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                  )}
                />
                {/* Tooltip Text */}
                <text
                  textAnchor="middle"
                  y="-22"
                  pointerEvents="none"
                  className={cx(
                    "text-[13px] font-medium fill-offwhite transition-all duration-200",
                    isSelected ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                  )}
                >
                  {region.name}
                </text>
              </g>
            </Marker>
          )
        })}
      </ComposableMap>
    </div>
  )
}
