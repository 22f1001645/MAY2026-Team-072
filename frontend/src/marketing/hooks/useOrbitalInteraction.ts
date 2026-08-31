import { useEffect, useCallback } from 'react'
import { useOrbitalStore } from '../store/orbitalStore'

/**
 * Hook for keyboard and touch interactions with orbital system
 *
 * Keyboard controls:
 * - ArrowRight/ArrowDown: Next planet
 * - ArrowLeft/ArrowUp: Previous planet
 * - Enter/Space: Expand active planet
 * - Escape: Close panel
 * - 1/2/3: Jump to specific planet
 * - P: Pause/play animation
 */
export function useOrbitalInteraction() {
    const {
        planets,
        activePlanetId,
        focusNextPlanet,
        focusPrevPlanet,
        focusPlanetByIndex,
        activateFocusedPlanet,
        toggleAnimation,
        closePanel,
    } = useOrbitalStore()

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            // Don't handle if user is typing in an input
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return
            }

            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault()
                    focusNextPlanet()
                    break

                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault()
                    focusPrevPlanet()
                    break

                case 'Enter':
                case ' ':
                    e.preventDefault()
                    if (!activePlanetId) {
                        activateFocusedPlanet()
                    }
                    break

                case 'Escape':
                    if (activePlanetId) {
                        e.preventDefault()
                        closePanel()
                    }
                    break

                case '1':
                case '2':
                case '3':
                    e.preventDefault()
                    const index = parseInt(e.key) - 1
                    if (index < planets.length) {
                        focusPlanetByIndex(index)
                    }
                    break

                case 'p':
                case 'P':
                    e.preventDefault()
                    toggleAnimation()
                    break

                default:
                    break
            }
        },
        [
            activePlanetId,
            planets.length,
            focusNextPlanet,
            focusPrevPlanet,
            focusPlanetByIndex,
            activateFocusedPlanet,
            toggleAnimation,
            closePanel,
        ]
    )

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])
}

/**
 * Touch event handlers for mobile interaction
 */
export function useTouchHandlers(planetId: string) {
    const { setHoveredPlanet, setActivePlanet } = useOrbitalStore()

    const handleTouchStart = useCallback(() => {
        setHoveredPlanet(planetId)
    }, [planetId, setHoveredPlanet])

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            e.preventDefault() // Prevent double-tap zoom
            setActivePlanet(planetId)

            // Haptic feedback if supported
            if (navigator.vibrate) {
                navigator.vibrate(10)
            }
        },
        [planetId, setActivePlanet]
    )

    const handleTouchCancel = useCallback(() => {
        setHoveredPlanet(null)
    }, [setHoveredPlanet])

    return {
        onTouchStart: handleTouchStart,
        onTouchEnd: handleTouchEnd,
        onTouchCancel: handleTouchCancel,
    }
}
