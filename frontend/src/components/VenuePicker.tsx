import { useEffect, useId, useRef, useState } from 'react'

import { api } from '../lib/api'
import { cx } from '../lib/format'
import type { VenueSuggestion } from '../lib/types'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

/** Venue field with search-as-you-type suggestions.
 *
 *  The typed text is ALWAYS the value. Picking a suggestion is a convenience,
 *  never a gate: with no Mappls credentials configured the endpoint answers 501,
 *  `api.venueAutocomplete` resolves to [], and this quietly behaves like the
 *  plain input it replaced. Same for an upstream timeout — a suggestion service
 *  having a bad day must not look like a form error.
 *
 *  Keyboard model is the ARIA combobox one, because this is a required field
 *  and a keyboard-only user has to be able to reach every option:
 *
 *      ↓ / ↑    move the active option
 *      Enter    take the active option (only when one is active)
 *      Esc      close the list, keep what was typed
 */
export function VenuePicker({
  value,
  onChange,
  onBlur,
  placeholder,
  required,
}: {
  value: string
  onChange: (venue: string) => void
  onBlur?: () => void
  placeholder?: string
  required?: boolean
}) {
  const [suggestions, setSuggestions] = useState<VenueSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // A picked suggestion must not immediately re-query with its own name.
  const skipNextQuery = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

  useEffect(() => {
    if (skipNextQuery.current) {
      skipNextQuery.current = false
      return
    }
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setOpen(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setOpen(true)
    const timer = setTimeout(async () => {
      const results = await api.venueAutocomplete(value.trim())
      if (cancelled) return
      setSuggestions(results)
      setActiveIndex(-1)
      setLoading(false)
      // Nothing to show and nothing loading: an empty dropdown is noise.
      if (results.length === 0) setOpen(false)
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const pick = (suggestion: VenueSuggestion) => {
    skipNextQuery.current = true
    onChange(suggestion.address ? `${suggestion.name}, ${suggestion.address}` : suggestion.name)
    setOpen(false)
    setSuggestions([])
    setActiveIndex(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      // Only swallow Enter when an option is actually active, so Enter with
      // the list merely open still submits the form.
      e.preventDefault()
      pick(suggestions[activeIndex])
    }
  }

  const activeId = activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined

  return (
    <div className="relative" ref={rootRef}>
      <input
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
      />

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-onyx-overlay/90 shadow-[0_8px_32px_rgba(14,47,54,0.5)] backdrop-blur-3xl"
        >
          {loading
            ? // Skeletons at the height real rows will occupy, so the list does
              // not jump when the results land.
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-white/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
                    <div className="h-2.5 w-3/4 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))
            : suggestions.map((s, i) => (
                <button
                  key={`${s.name}-${i}`}
                  id={`${listboxId}-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(s)}
                  className={cx(
                    'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors',
                    i === activeIndex ? 'bg-teal/15' : 'hover:bg-white/5',
                  )}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="mt-0.5 shrink-0 text-graytext-mid"
                    aria-hidden
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-offwhite">{s.name}</span>
                    {s.address && (
                      <span className="block truncate text-caption text-graytext-mid">{s.address}</span>
                    )}
                  </span>
                </button>
              ))}
        </div>
      )}
    </div>
  )
}
