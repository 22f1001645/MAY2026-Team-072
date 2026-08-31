import { useEffect, useRef, useCallback } from 'react'
import { useOrbitalStore } from '../store/orbitalStore'
import {
    calculateOrbitalPosition,
    updateAngle,
    calculateOrbitScale,
    calculatePlanetSize,
} from '../lib/orbital-math'

/**
 * Custom hook for orbital animation
 *
 * Uses requestAnimationFrame for smooth 60fps animation
 * Respects prefers-reduced-motion
 * Updates Zustand store each frame
 */
export function useOrbitalAnimation() {
    const animationRef = useRef<number | null>(null)
    const lastTimeRef = useRef<number>(0)

    const {
        planets,
        isAnimating,
        orbitScale,
        updatePlanetAngle,
        updatePlanetPosition,
        setOrbitScale,
        setPlanetSize,
        setCenterPosition,
    } = useOrbitalStore()

    // Animation loop
    const animate = useCallback(
        (timestamp: number) => {
            if (!lastTimeRef.current) {
                lastTimeRef.current = timestamp
            }

            const deltaTime = (timestamp - lastTimeRef.current) / 1000 // Convert to seconds
            lastTimeRef.current = timestamp

            // Update each planet
            planets.forEach((planet) => {
                // Calculate new angle
                const newAngle = updateAngle(
                    planet.currentAngle,
                    planet.orbital.speed,
                    deltaTime
                )

                // Calculate new position with scaled radius
                const scaledRadius = planet.orbital.radius * orbitScale
                const position = calculateOrbitalPosition(
                    scaledRadius,
                    newAngle,
                    planet.orbital.eccentricity
                )

                // Update store
                updatePlanetAngle(planet.id, newAngle)
                updatePlanetPosition(planet.id, position)
            })

            // Continue animation loop
            animationRef.current = requestAnimationFrame(animate)
        },
        [planets, orbitScale, updatePlanetAngle, updatePlanetPosition]
    )

    // Start/stop animation based on isAnimating state
    useEffect(() => {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches

        if (isAnimating && !prefersReducedMotion) {
            lastTimeRef.current = 0
            animationRef.current = requestAnimationFrame(animate)
        } else {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
                animationRef.current = null
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [isAnimating, animate])

    // Handle resize
    useEffect(() => {
        let resizeTimeout: NodeJS.Timeout

        const handleResize = () => {
            // Throttle resize events
            clearTimeout(resizeTimeout)
            resizeTimeout = setTimeout(() => {
                const width = window.innerWidth
                const height = window.innerHeight

                // Update scale and size
                setOrbitScale(calculateOrbitScale(width))
                setPlanetSize(calculatePlanetSize(width))

                // Update center position (center of viewport minus some offset)
                const centerX = width / 2
                const centerY = Math.min(height * 0.5, 450)
                setCenterPosition(centerX, centerY)
            }, 100)
        }

        // Initial calculation
        handleResize()

        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            clearTimeout(resizeTimeout)
        }
    }, [setOrbitScale, setPlanetSize, setCenterPosition])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [])
}
