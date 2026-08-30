/**
 * Orbital Math Utilities
 *
 * Pure functions for calculating orbital positions
 * Used by the animation hook to update planet positions
 */

/**
 * GOLDEN RATIO SIZING SYSTEM
 *
 * Mathematical Foundation:
 * φ (phi) = 1.618033988749895 (Golden Ratio)
 *
 * Core Sizing Formula:
 * CORE_RADIUS = PLANET_SIZE × φ
 *
 * This creates visual harmony where the Ekatva core is proportionally
 * larger than orbiting planets, establishing clear visual hierarchy.
 */
export const GOLDEN_RATIO = 1.618033988749895

/**
 * ═══════════════════════════════════════════════════════════════
 * HARMONIC BREATHING ANIMATION SYSTEM
 * ═══════════════════════════════════════════════════════════════
 *
 * Mathematical Foundation:
 * Instead of arbitrary sine wave speeds, we derive all motions from
 * a Base Frequency using the Golden Ratio (φ). This creates natural,
 * musically harmonic polyrhythms where elements feel "connected".
 *
 * Base Object: The Core (The "Sun")
 * Base Period: 4.0 seconds (A calm, deep breath)
 *
 * Derived Frequencies:
 * - Core Breathing:  T = 4.0s   (f = 0.25 Hz)
 * - Outer Ring:      T = 4.0/√φ ≈ 3.14s (f ≈ 0.318 Hz)
 * - Planet Pulse:    T = 4.0/φ  ≈ 2.47s (f ≈ 0.405 Hz)
 *
 * Derived Amplitudes (Subtle, not exaggerated):
 * - Core Scale:      1.0 → 1.05 (5% expansion - subtle breath)
 * - Core Glow:       1.0 → 1.15 (15% halo expansion)
 * - Planet Scale:    1.0 → 1.03 (3% flutter - shimmer, not explosion)
 *
 * Phase Offsets:
 * - Planets offset by (index × π/3) to create wave, not unison
 *
 * ═══════════════════════════════════════════════════════════════
 */
export const HARMONICS = {
    // Golden Ratio
    PHI: 1.618033988749895,
    SQRT_PHI: Math.sqrt(1.618033988749895), // ≈ 1.272

    // Base timing (seconds)
    BASE_PERIOD: 4.0,

    // Angular frequencies (ω = 2π / T)
    // Core breathes slowest - the "sun" sets the rhythm
    OMEGA_CORE: (2 * Math.PI) / 4.0, // ≈ 1.571 rad/s

    // Outer ring breathes slightly faster (√φ relationship)
    OMEGA_RING: (2 * Math.PI) / (4.0 / Math.sqrt(1.618033988749895)), // ≈ 2.0 rad/s

    // Planets breathe fastest (φ relationship) - satellites orbit faster
    OMEGA_PLANET: (2 * Math.PI) / (4.0 / 1.618033988749895), // ≈ 2.54 rad/s

    // Amplitudes (scale multipliers, subtle not exaggerated)
    AMP_CORE_SCALE: 0.05,      // Core: 1.0 → 1.05 (5% breath)
    AMP_CORE_GLOW: 0.15,       // Core glow: 1.0 → 1.15 (15% halo)
    AMP_RING_SCALE: 0.10,      // Outer ring: 1.0 → 1.10 (10%)
    AMP_PLANET_SCALE: 0.03,    // Planet: 1.0 → 1.03 (3% shimmer)
    AMP_PLANET_GLOW: 0.08,     // Planet glow: subtle atmosphere pulse

    // Phase offset per planet (creates wave, not unison)
    PLANET_PHASE_OFFSET: Math.PI / 3, // 60° offset between planets

    // Opacity modulation (very subtle)
    OPACITY_CORE_GLOW_BASE: 0.25,
    OPACITY_CORE_GLOW_AMP: 0.08,
    OPACITY_PLANET_GLOW_BASE: 0.12,
    OPACITY_PLANET_GLOW_AMP: 0.05,
} as const

/**
 * Calculate harmonic pulse value for a given time and frequency
 * @param time - Elapsed time in seconds
 * @param omega - Angular frequency (rad/s)
 * @param amplitude - Pulse amplitude (0-1)
 * @param phase - Phase offset in radians
 * @returns Pulse value centered at 1.0 (e.g., 0.95 to 1.05 for amplitude 0.05)
 */
export function harmonicPulse(
    time: number,
    omega: number,
    amplitude: number,
    phase: number = 0
): number {
    return 1 + Math.sin(time * omega + phase) * amplitude
}

/**
 * Calculate core radius based on golden ratio
 * @param planetSize - Current planet diameter in pixels
 * @returns Core radius that maintains golden ratio relationship
 */
export function calculateCoreRadius(planetSize: number): number {
    return Math.round(planetSize * GOLDEN_RATIO)
}

/**
 * Validate that orbital radii don't overlap with core
 * @param coreRadius - Radius of the Ekatva core
 * @param minOrbitRadius - Smallest orbital radius
 * @param planetSize - Size of planets
 * @returns true if spacing is safe, false if overlap detected
 */
export function validateOrbitalSpacing(
    coreRadius: number,
    minOrbitRadius: number,
    planetSize: number
): boolean {
    // Minimum safe distance: core radius + planet radius + 20px buffer
    const minSafeDistance = coreRadius + (planetSize / 2) + 20
    return minOrbitRadius >= minSafeDistance
}

export interface OrbitalPosition {
    x: number
    y: number
}

/**
 * Calculate position on an elliptical orbit
 * @param radius - Base orbital radius
 * @param angle - Current angle in radians
 * @param eccentricity - 0 = circle, higher = more elliptical
 * @returns {x, y} position relative to center (0, 0)
 */
export function calculateOrbitalPosition(
    radius: number,
    angle: number,
    eccentricity: number = 0
): OrbitalPosition {
    // Elliptical orbit: x-axis is stretched by (1 + eccentricity)
    // y-axis is compressed by (1 - eccentricity/2)
    const a = radius * (1 + eccentricity * 0.5) // Semi-major axis
    const b = radius * (1 - eccentricity * 0.3) // Semi-minor axis

    const x = a * Math.cos(angle)
    const y = b * Math.sin(angle)

    return { x, y }
}

/**
 * Update angle based on speed and delta time
 * @param currentAngle - Current angle in radians
 * @param speed - Angular velocity (radians per second)
 * @param deltaTime - Time elapsed in seconds
 * @returns New angle in radians
 */
export function updateAngle(
    currentAngle: number,
    speed: number,
    deltaTime: number
): number {
    const newAngle = currentAngle + speed * deltaTime
    // Keep angle in 0-2π range
    return newAngle % (2 * Math.PI)
}

/**
 * Convert relative coordinates to viewport coordinates
 * @param x - Relative x position
 * @param y - Relative y position
 * @param centerX - Center x in viewport
 * @param centerY - Center y in viewport
 * @returns Viewport coordinates
 */
export function toViewportCoords(
    x: number,
    y: number,
    centerX: number,
    centerY: number
): OrbitalPosition {
    return {
        x: centerX + x,
        y: centerY + y,
    }
}

/**
 * Calculate scale factor based on viewport width
 * @param viewportWidth - Current viewport width
 * @returns Scale multiplier for orbits
 */
export function calculateOrbitScale(viewportWidth: number): number {
    if (viewportWidth < 768) return 0.4 // Mobile
    if (viewportWidth < 1024) return 0.6 // Tablet
    if (viewportWidth < 1280) return 0.8 // Small desktop
    return 1 // Large desktop
}

/**
 * Calculate planet size based on viewport width
 * @param viewportWidth - Current viewport width
 * @returns Planet diameter in pixels
 */
export function calculatePlanetSize(viewportWidth: number): number {
    if (viewportWidth < 768) return 60 // Mobile
    if (viewportWidth < 1024) return 80 // Tablet
    return 100 // Desktop
}

/**
 * Calculate both planet and core sizes based on viewport width
 * @param viewportWidth - Current viewport width
 * @returns Object with planetSize and coreRadius
 */
export function calculateSizes(viewportWidth: number): {
    planetSize: number
    coreRadius: number
} {
    const planetSize = calculatePlanetSize(viewportWidth)
    const coreRadius = calculateCoreRadius(planetSize)

    return { planetSize, coreRadius }
}

/**
 * Validate entire orbital system sizing at current viewport
 * Logs warnings if spacing issues detected
 * @param viewportWidth - Current viewport width
 * @param orbitalRadii - Array of orbital radii from planets.ts
 */
export function validateOrbitalSystem(
    viewportWidth: number,
    orbitalRadii: number[]
): void {
    const { planetSize, coreRadius } = calculateSizes(viewportWidth)
    const scale = calculateOrbitScale(viewportWidth)
    const minOrbitRadius = Math.min(...orbitalRadii) * scale

    const isValid = validateOrbitalSpacing(coreRadius, minOrbitRadius, planetSize)

    if (!isValid) {
        console.warn(
            `⚠️ Orbital spacing validation failed at ${viewportWidth}px viewport:`,
            `\n  Core radius: ${coreRadius}px`,
            `\n  Min orbit radius: ${minOrbitRadius}px`,
            `\n  Planet size: ${planetSize}px`
        )
    }

    // Validate golden ratio is maintained
    const actualRatio = coreRadius / planetSize
    const ratioDiff = Math.abs(actualRatio - GOLDEN_RATIO)

    if (ratioDiff > 0.01) {
        console.warn(
            `⚠️ Golden ratio deviation detected:`,
            `\n  Expected: ${GOLDEN_RATIO}`,
            `\n  Actual: ${actualRatio.toFixed(4)}`
        )
    }
}
