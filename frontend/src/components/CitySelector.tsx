import { useState, useRef, useEffect } from 'react'
import { MapPin, Search } from 'lucide-react'
import { cx } from '../lib/format'
import { useSession } from '../lib/session'

interface CitySelectorProps {
  cities: string[]
  activeCity: string
  setActiveCity: (city: string) => void
  allowAll?: boolean
  allLabel?: string
}

export default function CitySelector({
  cities,
  activeCity,
  setActiveCity,
  allowAll = true,
  allLabel = 'All',
}: CitySelectorProps) {
  const { id: userId, city: userCity } = useSession()
  const storageKey = `ekatva_pinned_cities_${userId || 'guest'}`

  const [pinnedCities, setPinnedCities] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Update when user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      setPinnedCities(stored ? JSON.parse(stored) : [])
    } catch {
      setPinnedCities([])
    }
  }, [storageKey])

  const togglePin = (city: string) => {
    setPinnedCities((prev) => {
      const next = prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allFiltered = cities.filter((c) => c.toLowerCase().includes(searchQuery.toLowerCase()))
  const unpinned = allFiltered.filter((c) => !pinnedCities.includes(c))

  return (
    <div className="mb-8 flex items-center gap-2 flex-wrap">
      {/* Pinned Pills (and All) */}
      <div className="flex items-center gap-2 flex-wrap">
        {allowAll && (
          <button
            onClick={() => setActiveCity(allLabel)}
            className={cx(
              'whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-material',
              activeCity === allLabel
                ? 'border-teal bg-teal text-onyx shadow-glow-teal'
                : 'border-white/10 bg-white/5 text-graytext-light hover:border-teal/40 hover:text-offwhite',
            )}
          >
            {allLabel}
          </button>
        )}

        {/* User's Home City */}
        {userCity && cities.includes(userCity) && (
          <button
            onClick={() => setActiveCity(userCity)}
            className={cx(
              'whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-material flex items-center gap-1.5',
              activeCity === userCity
                ? 'border-teal bg-teal text-onyx shadow-glow-teal'
                : 'border-white/10 bg-white/5 text-graytext-light hover:border-teal/40 hover:text-offwhite',
            )}
          >
            <MapPin size={12} className={activeCity === userCity ? 'text-onyx' : 'text-teal'} />
            {userCity}
          </button>
        )}

        {/* Pinned Cities */}
        {pinnedCities.filter(c => c !== userCity).map((c) => (
          <button
            key={c}
            onClick={() => setActiveCity(c)}
            className={cx(
              'group relative whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-material flex items-center gap-1.5',
              activeCity === c
                ? 'border-teal bg-teal text-onyx shadow-glow-teal'
                : 'border-white/10 bg-white/5 text-graytext-light hover:border-teal/40 hover:text-offwhite',
            )}
          >
            {c}
            <div
              onClick={(e) => {
                e.stopPropagation()
                togglePin(c)
              }}
              className="flex items-center justify-center rounded-full transition-opacity cursor-pointer p-0.5 opacity-100 text-gold"
              title="Unpin city"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 17v5M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-6 0v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </div>
          </button>
        ))}

        {/* Temporary Active City Pill (if selected but not pinned or home) */}
        {activeCity !== allLabel && activeCity !== userCity && !pinnedCities.includes(activeCity) && (
          <button
            className="whitespace-nowrap rounded-full border border-teal bg-teal text-onyx shadow-glow-teal px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-material flex items-center gap-1.5"
          >
            {activeCity}
            <div
              onClick={(e) => {
                e.stopPropagation()
                togglePin(activeCity)
              }}
              className="flex items-center justify-center rounded-full transition-opacity cursor-pointer p-0.5 opacity-100 text-onyx/70 hover:text-onyx"
              title="Pin city"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-6 0v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
              </svg>
            </div>
          </button>
        )}
      </div>

      {/* Dropdown for unpinned cities */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-white/5 text-graytext-light hover:border-teal/40 hover:text-offwhite px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-material"
        >
          <MapPin size={14} />
          + Select City
        </button>

        {dropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-white/10 bg-onyx-overlay/90 backdrop-blur-3xl shadow-[0_8px_32px_rgba(14,47,54,0.5)] z-50 overflow-hidden animate-fade-down origin-top-left">
            <div className="p-2 border-b border-white/5 relative">
              <Search
                size={14}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-graytext-mid"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cities..."
                className="w-full bg-white/5 rounded-lg border-none py-1.5 pl-8 pr-3 text-[13px] text-offwhite placeholder:text-graytext-mid focus:ring-1 focus:ring-teal outline-none"
              />
            </div>
            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {unpinned.length === 0 ? (
                <div className="p-3 text-center text-[12px] text-graytext-mid">
                  No cities found
                </div>
              ) : (
                unpinned.map((c) => (
                  <div
                    key={c}
                    className="flex items-center justify-between group px-3 py-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => {
                      setActiveCity(c)
                      setDropdownOpen(false)
                      setSearchQuery('')
                    }}
                  >
                    <span
                      className={cx(
                        'text-[13px]',
                        activeCity === c ? 'text-teal font-semibold' : 'text-graytext-light group-hover:text-offwhite',
                      )}
                    >
                      {c}
                    </span>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePin(c)
                      }}
                      className="opacity-0 group-hover:opacity-100 text-graytext-mid hover:text-gold transition-all"
                      title="Pin city"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 17v5M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.68V6a3 3 0 0 0-6 0v4.68a2 2 0 0 1-1.11 1.87l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
