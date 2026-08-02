import json
import os

md_path = r"C:\Users\Kavya Jain\.gemini\antigravity\brain\f38ab064-8b54-470a-9897-7c8feae85bdb\.system_generated\steps\1581\content.md"
with open(md_path, 'r') as f:
    lines = f.readlines()

path_lines = [l.strip() for l in lines if l.strip() and not l.startswith('Title:') and not l.startswith('Description:') and not l.startswith('Source:') and not l.startswith('---') and not l.startswith('<')]
path_data = ' '.join(path_lines).replace('z', '') + ' z'

tsx_content = f"""import React from 'react'
import {{ cx }} from './ui'

export interface Region {{
  id: string
  name: string
}}

interface IndiaMapProps {{
  regions: Region[]
  selectedRegionId: string | null
  onSelect: (id: string) => void
}}

const MARKERS: Record<string, {{ top: string; left: string }}> = {{
  'Delhi (Delhi-NCR)': {{ top: '25%', left: '33%' }},
  'Chandigarh (Punjab, HP, RJ, J&K)': {{ top: '15%', left: '30%' }},
  'Lucknow (UP, Gwalior)': {{ top: '35%', left: '48%' }},
  'Patna (Bihar, Jharkhand, Chhattisgarh)': {{ top: '42%', left: '60%' }},
  'Kolkata (WB, NE, Odisha)': {{ top: '50%', left: '70%' }},
  'Mumbai (Maharashtra, Gujarat)': {{ top: '55%', left: '20%' }},
  'Hyderabad (AP & Telangana)': {{ top: '65%', left: '35%' }},
  'Bengaluru (Karnataka, Kerala)': {{ top: '80%', left: '33%' }},
  'Chennai (Tamil Nadu)': {{ top: '78%', left: '42%' }},
  'International': {{ top: '15%', left: '85%' }},
}}

export function IndiaMap({{ regions, selectedRegionId, onSelect }}: IndiaMapProps) {{
  return (
    <div className="relative w-full max-w-[500px] aspect-[4/5] mx-auto bg-transparent">
      {{/* Base Map SVG */}}
      <svg 
        className="absolute inset-0 w-full h-full drop-shadow-2xl opacity-60"
        viewBox="0 0 1024 1024"
        fill="#1e3a40" 
        stroke="#2dd4bf"
        strokeWidth="3"
      >
        <g transform="translate(0,1024) scale(0.1,-0.1)">
          <path d="{path_data}" />
        </g>
      </svg>

      {{/* Interactive Markers */}}
      {{regions.map((region) => {{
        const pos = MARKERS[region.name]
        if (!pos) return null
        
        const isSelected = selectedRegionId === region.id
        
        return (
          <div
            key={{region.id}}
            className="absolute group cursor-pointer"
            style={{{{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)' }}}}
            onClick={{() => onSelect(region.id)}}
          >
            <div className={{cx(
              "relative flex items-center justify-center rounded-full transition-all duration-300",
              isSelected ? "w-6 h-6 bg-teal shadow-[0_0_20px_rgba(45,212,191,0.8)]" : "w-4 h-4 bg-teal/50 hover:bg-teal hover:scale-125"
            )}}>
              {{isSelected && <div className="absolute inset-0 rounded-full animate-ping bg-teal opacity-40" />}}
            </div>
            
            {{/* Tooltip */}}
            <div className={{cx(
              "absolute left-1/2 -translate-x-1/2 -top-10 px-3 py-1.5 rounded-lg bg-onyx border border-white/10 text-offwhite text-[13px] font-medium whitespace-nowrap transition-all duration-200 pointer-events-none z-10 shadow-xl",
              isSelected ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
            )}}>
              {{region.name}}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[-5px] border-[5px] border-transparent border-t-onyx" />
            </div>
          </div>
        )
      }})}}
    </div>
  )
}}
"""

out_path = r"c:\Users\Kavya Jain\OneDrive\Desktop\ekatva-os\ekatva-os\frontend\src\components\IndiaMap.tsx"
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(tsx_content)

print(f"Generated {out_path}")
