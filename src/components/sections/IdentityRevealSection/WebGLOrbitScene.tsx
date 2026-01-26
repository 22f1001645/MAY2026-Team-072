'use client'

import { useEffect, useRef } from 'react'
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
 * WebGLOrbitScene - The actual Three.js/R3F scene
 * 
 * Performance optimizations:
 * ✅ DPR clamped to [1, 2] - prevents 9x pixel rendering on high-DPI
 * ✅ resize={{ scroll: false, offsetSize: true }} - efficient resize
 * ✅ onCreated callback for smooth fade-in
 * ✅ powerPreference: 'high-performance'
 */

interface WebGLOrbitSceneProps {
    onReady?: () => void
}

export default function WebGLOrbitScene({ onReady }: WebGLOrbitSceneProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const {
        planets,
        hoveredPlanetId,
        orbitScale,
        setHoveredPlanet,
        setActivePlanet,
    } = useOrbitalStore()

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
                cursor: 'grab',
            }}
        >
            {/* Camera */}
            <PerspectiveCamera
                makeDefault
                position={[0, 5, 10]}
                fov={50}
            />

            {/* Orbit Controls - rotation only */}
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate
                autoRotateSpeed={0.3}
                minPolarAngle={Math.PI / 4}
                maxPolarAngle={Math.PI / 2.2}
                dampingFactor={0.05}
                enableDamping
            />

            {/* Lighting */}
            <ambientLight intensity={0.4} />
            <pointLight position={[0, 0, 0]} intensity={2} color="#5CE6C9" />
            <pointLight position={[10, 10, 10]} intensity={0.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.3} />

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
