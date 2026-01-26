'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Html } from '@react-three/drei'
import * as THREE from 'three'
import { PlanetState } from '@/store/orbitalStore'
import { HARMONICS } from '@/lib/orbital-math'

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

    // Planet size - Normalized to scene units
    const baseSize = 0.6
    const size = isHovered ? baseSize * 1.15 : baseSize

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
            {/* Outer glow sphere - Atmosphere */}
            <Sphere
                ref={glowRef}
                args={[size * 1.6, 32, 32]}
            >
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={isHovered ? 0.25 : 0.12} // Subtle atmosphere
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>

            {/* Main planet sphere - The Jewel */}
            <Sphere
                ref={meshRef}
                args={[size, 64, 64]} // Higher poly for smooth reflections
                onPointerEnter={() => onHover(planet.id)}
                onPointerLeave={() => onHover(null)}
                onClick={() => onClick(planet.id)}
            >
                <meshStandardMaterial
                    color={color}
                    // Emissive boost: Look like a light source
                    emissive={color}
                    emissiveIntensity={isHovered ? 0.8 : 0.45}
                    // Material polish: Shiny metal/gem look
                    metalness={0.9}
                    roughness={0.1}
                    envMapIntensity={1.0}
                />
            </Sphere>

            {/* Label (HTML overlay) */}
            {isHovered && (
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
                            fontSize: '12px',
                            fontWeight: 600,
                            letterSpacing: '0.05em',
                            whiteSpace: 'nowrap',
                            boxShadow: `0 0 20px ${planet.appearance.baseColor}50`
                        }}
                    >
                        {planet.name}
                    </div>
                </Html>
            )}
        </group>
    )
}
