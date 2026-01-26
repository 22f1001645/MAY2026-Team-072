'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei'
import { useOrbitalStore } from '@/store/orbitalStore'
import { useOrbitalAnimation } from '@/hooks/useOrbitalAnimation'
import { useOrbitalInteraction } from '@/hooks/useOrbitalInteraction'
import Planet3D from './Planet3D'
import CenterCore3D from './CenterCore3D'
import OrbitTrails3D from './OrbitTrails3D'
import ParticleField3D from './ParticleField3D'
import ContentPanel from './ContentPanel'

/**
 * WebGLOrbit - Main 3D orbital system using Three.js
 * 
 * Features:
 * - True 3D planets with depth
 * - Realistic lighting
 * - GPU-accelerated particles
 * - Orbit controls (rotation only)
 * - Same UX as SVG version
 */
export default function WebGLOrbit() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)

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

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="relative w-full h-[600px] md:h-[700px] lg:h-[800px] bg-oneness-black flex items-center justify-center">
                <div className="text-mid-gray text-sm">Loading 3D Experience...</div>
            </div>
        )
    }

    return (
        <>
            <div
                ref={containerRef}
                className="relative w-full h-[600px] md:h-[700px] lg:h-[800px] overflow-hidden"
                style={{ minHeight: '500px' }}
            >
                <Canvas
                    gl={{
                        antialias: true,
                        alpha: true,
                        powerPreference: 'high-performance',
                    }}
                    style={{ background: '#050505' }}
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
                    <Suspense fallback={null}>
                        <ParticleField3D count={150} spread={12} />
                    </Suspense>

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

                {/* Legend overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6 md:gap-8 z-10">
                    {planets.map((planet, index) => (
                        <div
                            key={planet.id}
                            className="flex items-center gap-2 text-xs md:text-sm"
                        >
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: planet.appearance.baseColor }}
                            />
                            <span className="text-light-gray hidden sm:inline">
                                {planet.name}
                            </span>
                            <span className="text-mid-gray text-[10px] hidden md:inline">
                                ({index + 1})
                            </span>
                        </div>
                    ))}
                </div>

                {/* Instructions */}
                <p className="absolute bottom-20 left-1/2 -translate-x-1/2 text-xs text-mid-gray text-center z-10">
                    Drag to rotate • Click a planet to explore • Press P to pause
                </p>
            </div>

            {/* Content Panel (same as SVG version) */}
            <ContentPanel />
        </>
    )
}
