'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Html } from '@react-three/drei'
import * as THREE from 'three'
import { PlanetState } from '@/store/orbitalStore'
import { HARMONICS } from '@/lib/orbital-math'

/**
 * Mobile device detection (SSR-safe)
 * Only returns true for ACTUAL mobile devices:
 * - Primary input is touch (pointer: coarse)
 * - AND screen width is small (< 1024px)
 * This ensures touchscreen laptops keep desktop experience
 */
function isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    const isSmallScreen = window.innerWidth < 1024
    return isCoarsePointer && isSmallScreen
}

/**
 * Planet3D - 3D planet component (Harmonic Breathing V3)
 *
 * HARMONIC ANIMATION SYSTEM:
 * - Planets pulse at φ relationship to Core (~2.47s period)
 * - Phase offset by index × (π/3) creates organic wave, not robotic unison
 * - Subtle 3% scale + 8% glow = "shimmer" not "explosion"
 *
 * VISUAL POLISH:
 * - High Emissivity (0.45 base) - planets glow like energy sources
 * - High Polish (Metalness 0.9 / Roughness 0.1) - gem-like reflections
 *
 * MOBILE TOUCH OPTIMIZATIONS:
 * - 2x invisible hitbox for easier tap targets (44px+ WCAG standard)
 * - Persistent labels on touch devices (no hover affordance)
 * - Subtle pulse animation to indicate interactivity
 */
interface Planet3DProps {
    planet: PlanetState
    isHovered: boolean
    isActive: boolean
    orbitScale: number
    onHover: (id: string | null) => void
    onClick: (id: string) => void
    planetIndex?: number // For phase offset calculation
}

export default function Planet3D({
    planet,
    isHovered,
    isActive,
    orbitScale,
    onHover,
    onClick,
    planetIndex = 0,
}: Planet3DProps) {
    const meshRef = useRef<THREE.Mesh>(null)
    const glowRef = useRef<THREE.Mesh>(null)

    // Track mobile device for persistent labels and larger tap targets
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        setIsMobile(isMobileDevice())
    }, [])

    // Planet size - larger on mobile for visibility from top-down view
    const baseSize = isMobile ? 1.0 : 0.6
    const size = isHovered ? baseSize * 1.15 : baseSize

    // Tap target size - 2x for touch devices (WCAG 44px minimum)
    const hitboxSize = isMobile ? baseSize * 2 : baseSize

    // Show label on hover only (persistent labels clutter mobile view)
    const shouldShowLabel = isHovered

    // Scale position: 100px -> 1 unit
    const positionX = (planet.position.x / 100) * orbitScale
    const positionZ = (planet.position.y / 100) * orbitScale
    const positionY = 0

    // Phase offset: Each planet is offset by π/3 (60°) for organic wave
    const phaseOffset = planetIndex * HARMONICS.PLANET_PHASE_OFFSET

    // Harmonic breathing animation - derived from Golden Ratio
    useFrame((state) => {
        const t = state.clock.elapsedTime

        if (glowRef.current) {
            // Planet frequency (φ relationship), subtle amplitude
            // Phase offset creates wave pattern across planets
            const glowPulse = 1 + Math.sin(t * HARMONICS.OMEGA_PLANET + phaseOffset) * HARMONICS.AMP_PLANET_GLOW
            glowRef.current.scale.setScalar(isHovered ? glowPulse * 1.3 : glowPulse)

            // Subtle opacity breathing
            const material = glowRef.current.material as THREE.MeshBasicMaterial
            const baseOpacity = isHovered ? 0.25 : HARMONICS.OPACITY_PLANET_GLOW_BASE
            material.opacity = baseOpacity +
                Math.sin(t * HARMONICS.OMEGA_PLANET + phaseOffset) * HARMONICS.OPACITY_PLANET_GLOW_AMP
        }
    })

    // Parse color
    const color = new THREE.Color(planet.appearance.baseColor)

    return (
        <group position={[positionX, positionY, positionZ]}>
            {/* Outer glow sphere - Atmosphere (larger + brighter on mobile for top-down visibility) */}
            <Sphere
                ref={glowRef}
                args={[size * (isMobile ? 2.0 : 1.6), 32, 32]}
                raycast={() => null}
            >
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={isHovered ? 0.35 : (isMobile ? 0.25 : 0.12)} // More visible glow on mobile
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>

            {/* Invisible hitbox for larger tap targets on touch devices */}
            {isMobile && (
                <Sphere
                    args={[hitboxSize, 16, 16]} // Lower poly since invisible
                    onPointerEnter={(e) => {
                        e.stopPropagation()
                        onHover(planet.id)
                    }}
                    onPointerLeave={(e) => {
                        e.stopPropagation()
                        onHover(null)
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        onClick(planet.id)
                    }}
                >
                    <meshBasicMaterial transparent opacity={0} />
                </Sphere>
            )}

            {/* Main planet sphere - The Jewel */}
            <Sphere
                ref={meshRef}
                args={[size, 64, 64]}
                onPointerEnter={(e) => {
                    e.stopPropagation()
                    onHover(planet.id)
                }}
                onPointerLeave={(e) => {
                    e.stopPropagation()
                    onHover(null)
                }}
                onClick={(e) => {
                    e.stopPropagation()
                    onClick(planet.id)
                }}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isHovered ? 0.8 : 0.45}
                    metalness={0.9}
                    roughness={0.1}
                    envMapIntensity={1.0}
                />
            </Sphere>

            {/* Label (HTML overlay) - persistent on touch, hover on desktop */}
            {shouldShowLabel && (
                <Html
                    center
                    position={[0, -size - 0.4, 0]}
                    style={{
                        pointerEvents: 'none',
                        userSelect: 'none',
                        zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(5, 5, 5, 0.95)',
                            border: `1px solid ${planet.appearance.baseColor}`,
                            borderRadius: '16px',
                            padding: '6px 16px',
                            color: planet.appearance.baseColor,
                            fontSize: isMobile ? '10px' : '12px', // Slightly smaller on mobile
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                            boxShadow: isHovered
                                ? `0 0 20px ${planet.appearance.baseColor}50`
                                : `0 0 10px ${planet.appearance.baseColor}30`, // Subtler glow when not hovered
                            opacity: isHovered ? 1 : 0.85, // Slightly faded when not hovered
                        }}
                    >
                        {planet.name}
                    </div>
                </Html>
            )}
        </group>
    )
}
