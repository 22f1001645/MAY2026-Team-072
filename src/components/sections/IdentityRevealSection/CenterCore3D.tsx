'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'
import { HARMONICS } from '@/lib/orbital-math'
import { useOrbitalStore } from '@/store/orbitalStore'

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
 * CenterCore3D - 3D EKATVA center core (Harmonic Breathing V3)
 *
 * HARMONIC ANIMATION SYSTEM:
 * - Core breathes at BASE_PERIOD (4s) - the "sun" sets the rhythm
 * - Outer ring at √φ relationship (~3.14s) - slightly faster
 * - All motions derived from Golden Ratio for natural polyrhythm
 *
 * AMPLITUDE PHILOSOPHY:
 * - Subtle, not exaggerated: 5% core, 10% ring, 15% glow
 * - Creates "living" feel without "explosion" effect
 *
 * MOBILE TOUCH OPTIMIZATIONS:
 * - 2x invisible hitbox for easier tap targets
 * - Touch-aware cursor handling (no 'grab' on mobile)
 */
export default function CenterCore3D() {
    const glowRef = useRef<THREE.Mesh>(null)
    const pulseRef = useRef<THREE.Mesh>(null)
    const [isHovered, setIsHovered] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const { setCoreActive } = useOrbitalStore()

    useEffect(() => {
        setIsMobile(isMobileDevice())
    }, [])

    const coreColor = new THREE.Color('#5CE6C9')
    const coreSize = 1.62 // Matches Golden Ratio (1.618)

    // Tap target size - 2x for touch devices (WCAG 44px minimum)
    const hitboxSize = isMobile ? coreSize * 2 : coreSize

    // Harmonic breathing animation - mathematically derived from φ
    useFrame((state) => {
        const t = state.clock.elapsedTime

        // Inner glow: Core frequency, 15% amplitude
        // Intensify on hover for discoverability (0.3 → 0.45)
        if (glowRef.current) {
            const glowPulse = 1 + Math.sin(t * HARMONICS.OMEGA_CORE) * HARMONICS.AMP_CORE_GLOW
            glowRef.current.scale.setScalar(isHovered ? glowPulse * 1.15 : glowPulse)

            // Subtle opacity modulation - intensified on hover
            const material = glowRef.current.material as THREE.MeshBasicMaterial
            const baseOpacity = isHovered ? 0.45 : HARMONICS.OPACITY_CORE_GLOW_BASE
            material.opacity = baseOpacity +
                Math.sin(t * HARMONICS.OMEGA_CORE) * HARMONICS.OPACITY_CORE_GLOW_AMP
        }

        // Outer ring: √φ frequency relationship, 10% amplitude
        if (pulseRef.current) {
            const ringPulse = 1 + Math.sin(t * HARMONICS.OMEGA_RING) * HARMONICS.AMP_RING_SCALE
            pulseRef.current.scale.setScalar(ringPulse * 1.3)
        }
    })

    return (
        <group
            position={[0, 0, 0]}
            onClick={(e) => {
                e.stopPropagation()
                setCoreActive()
            }}
            onPointerOver={(e) => {
                e.stopPropagation()
                setIsHovered(true)
                document.body.style.cursor = 'pointer'
            }}
            onPointerOut={(e) => {
                e.stopPropagation()
                setIsHovered(false)
                // Only show 'grab' cursor on desktop (indicates drag rotation)
                document.body.style.cursor = isMobile ? 'default' : 'grab'
            }}
        >
            {/* Invisible hitbox for larger tap targets on touch devices */}
            {isMobile && (
                <Sphere
                    args={[hitboxSize, 16, 16]} // Lower poly since invisible
                    raycast={() => null} // Let parent group handle raycasting
                >
                    <meshBasicMaterial transparent opacity={0} />
                </Sphere>
            )}
            {/* Outer pulse ring */}
            <Sphere
                ref={pulseRef}
                args={[coreSize * 1.5, 32, 32]}
            >
                <meshBasicMaterial
                    color={coreColor}
                    transparent
                    opacity={0.12} // Slight boost
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>

            {/* Inner glow */}
            <Sphere
                ref={glowRef}
                args={[coreSize * 1.25, 32, 32]}
            >
                <meshBasicMaterial
                    color={coreColor}
                    transparent
                    opacity={0.3} // Stronger base glow (was 0.2)
                    side={THREE.BackSide}
                    depthWrite={false}
                />
            </Sphere>

            {/* Core sphere */}
            <Sphere args={[coreSize, 64, 64]}>
                <meshStandardMaterial
                    color="#050505"
                    emissive={coreColor}
                    emissiveIntensity={0.35} // Slightly brighter core
                    metalness={0.8}
                    roughness={0.2}
                />
            </Sphere>

            {/* Devanagari text - एकत्व */}
            <Text
                position={[0, 0.15, coreSize + 0.05]} // Moved up slightly
                fontSize={0.35}
                color="#5CE6C9"
                anchorX="center"
                anchorY="middle"
            >
                एकत्व
            </Text>

            {/* English text - EKATVA (Brand Polish) */}
            <Text
                position={[0, -0.28, coreSize + 0.05]} // Moved down to spacing
                fontSize={0.16} // Increased from 0.12 -> 0.16
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
                letterSpacing={0.25} // Cinematic wide tracking
                fillOpacity={0.9}
            >
                EKATVA
            </Text>

        </group>
    )
}
