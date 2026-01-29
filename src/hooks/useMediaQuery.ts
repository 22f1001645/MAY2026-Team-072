'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook for responsive breakpoint detection
 * @param query - Media query string (e.g., '(max-width: 768px)')
 * @returns boolean - true if media query matches
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(query)

        // Update state immediately
        setMatches(media.matches)

        // Listen for changes
        const listener = () => setMatches(media.matches)
        media.addEventListener('change', listener)

        return () => media.removeEventListener('change', listener)
    }, [query])

    return matches
}
