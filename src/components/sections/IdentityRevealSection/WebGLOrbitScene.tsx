'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import { useOrbitalStore } from '@/store/orbitalStore'
import { useOrbitalAnimation } from '@/hooks/useOrbitalAnimation'
import { useOrbitalInteraction } from '@/hooks/useOrbitalInteraction'
import Planet3D from './Planet3D'
import CenterCore3D from './CenterCore3D'
import OrbitTrails3D from './OrbitTrails3D'
import ParticleField3D from './ParticleField3D'

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
 * WebGLOrbitScene - The actual Three.js/R3F scene
 *
 * Performance optimizations:
 * ✅ DPR clamped to [1, 2] - prevents 9x pixel rendering on high-DPI
 * ✅ resize={{ scroll: false, offsetSize: true }} - efficient resize
 * ✅ onCreated callback for smooth fade-in
 * ✅ powerPreference: 'high-performance'
 *
 * Mobile Touch Optimizations:
 * ✅ Drag rotation disabled on touch devices (prevents scroll conflict)
 * ✅ Auto-rotate stays enabled for ambient motion
 */

interface WebGLOrbitSceneProps {
    onReady?: () => void
}

export default function WebGLOrbitScene({ onReady }: WebGLOrbitSceneProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    // Track mobile device for interaction changes only
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        setIsMobile(isMobileDevice())
    }, [])

    const {
        planets,
        hoveredPlanetId,
        orbitScale,
        setHoveredPlanet,
        setActivePlanet,
        setOrbitScale,
    } = useOrbitalStore()

    // Scale down orbits on mobile so planets fit in narrow viewport
    useEffect(() => {
        if (isMobile) {
            setOrbitScale(0.5) // Half size on mobile
        } else {
            setOrbitScale(1) // Full size on desktop
        }
    }, [isMobile, setOrbitScale])

    // Initialize animation and keyboard controls
    useOrbitalAnimation()
    useOrbitalInteraction()

    // Handle WebGL context loss
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const handleContextLost = (e: Event) => {
            console.warn('WebGL context lost')
            e.preventDefault()
        }

        const handleContextRestored = () => {
            console.log('WebGL context restored')
        }

        canvas.addEventListener('webglcontextlost', handleContextLost)
        canvas.addEventListener('webglcontextrestored', handleContextRestored)

        return () => {
            canvas.removeEventListener('webglcontextlost', handleContextLost)
            canvas.removeEventListener('webglcontextrestored', handleContextRestored)
        }
    }, [])

    return (
        <Canvas
            ref={canvasRef}
            // CRITICAL: Clamp DPR to prevent overheating on high-DPI mobile
            dpr={[1, 2]}
            // Efficient resize handling
            resize={{ scroll: false, offsetSize: true }}
            // Canvas ready callback
            onCreated={() => {
                // Small delay to ensure shaders are compiled
                setTimeout(() => {
                    onReady?.()
                }, 100)
            }}
            gl={{
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                // Preserve drawing buffer for context restore
                preserveDrawingBuffer: true,
            }}
            style={{
                background: 'transparent',
                width: '100%',
                height: '100%',
                // Show grab cursor only on desktop (indicates drag rotation)
                cursor: isMobile ? 'default' : 'grab',
            }}
        >
            {/* Camera - top-down on mobile (see all orbits as circles), angled on desktop */}
            <PerspectiveCamera
                makeDefault
                position={isMobile ? [0, 10, 0.01] : [0, 5, 10]}
                fov={isMobile ? 55 : 50}
            />

            {/* Orbit Controls - stationary top-down on mobile, interactive on desktop */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                enableRotate={!isMobile}  // Disable drag rotation on mobile
                autoRotate={!isMobile}  // Stationary on mobile, auto-rotate on desktop
                autoRotateSpeed={0.3}
                minPolarAngle={isMobile ? 0 : Math.PI / 4}
                maxPolarAngle={isMobile ? 0.01 : Math.PI / 2.2}
                dampingFactor={0.05}
                enableDamping
            />

            {/* Lighting */}
            <ambientLight intensity={isMobile ? 0.6 : 0.4} />
            <pointLight position={[0, 0, 0]} intensity={2} color="#5CE6C9" />
            <pointLight position={[10, 10, 10]} intensity={0.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.3} />
            {/* Top-down lighting for mobile - illuminates planets from camera angle */}
            {isMobile && (
                <directionalLight
                    position={[0, 15, 0]}
                    intensity={1.5}
                    color="#ffffff"
                />
            )}

            {/* Stars background */}
            <Stars
                radius={50}
                depth={50}
                count={1000}
                factor={3}
                saturation={0}
                fade
                speed={0.5}
            />

            {/* GPU Particle Field */}
            <ParticleField3D count={150} spread={12} />

            {/* Orbit Trails */}
            <OrbitTrails3D
                planets={planets}
                orbitScale={orbitScale}
                hoveredPlanetId={hoveredPlanetId}
            />

            {/* Center Core */}
            <CenterCore3D />

            {/* Planets - with phase offset for harmonic wave animation */}
            {planets.map((planet, index) => (
                <Planet3D
                    key={planet.id}
                    planet={planet}
                    isHovered={hoveredPlanetId === planet.id}
                    isActive={false}
                    orbitScale={orbitScale}
                    onHover={setHoveredPlanet}
                    onClick={setActivePlanet}
                    planetIndex={index}
                />
            ))}
        </Canvas>
    )
}
