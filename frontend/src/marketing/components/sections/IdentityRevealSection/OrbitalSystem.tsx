import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { asset } from '../../../lib/asset'
import { validateOrbitalSystem } from '../../../lib/orbital-math'
import { PLANET_CONFIGS } from '../../../data/planets'

/**
 * OrbitalSystem - static orbital composition.
 *
 * Upstream (Vish2BDev/Ekatva-Website) this renders an interactive WebGL scene
 * with a static image as the pre-load and error fallback. That scene needs
 * @react-three/fiber v9, which requires React 19; Ekatva OS is on React 18, and
 * upgrading it would touch every page and the vitest suite. So the WebGL layer,
 * its error boundary, and its support probe are removed here and the fallback -
 * already a complete, animated composition - is what renders.
 *
 * To restore the 3D scene: install @react-three/fiber + drei, re-copy
 * WebGLOrbitScene.tsx and its Planet3D/OrbitTrails3D/ParticleField3D/CenterCore3D
 * siblings from upstream, and reinstate the LAYER 2 block from the original.
 */

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function OrbitalSystem() {
    // With no canvas to wait on, the static composition is simply always the
    // thing that renders. Kept as named constants so the JSX below stays a
    // line-for-line match with upstream.
    const isWebGLReady = false
    const showFallback = true

    // Dev-time orbital geometry validation (upstream also gated this on dev).
    useEffect(() => {
        // Validate orbital sizing system
        if (import.meta.env.DEV) {
            const orbitalRadii = PLANET_CONFIGS.map(p => p.orbital.radius)
            validateOrbitalSystem(window.innerWidth, orbitalRadii)

            // Re-validate on resize
            const handleResize = () => {
                validateOrbitalSystem(window.innerWidth, orbitalRadii)
            }
            window.addEventListener('resize', handleResize)
            return () => window.removeEventListener('resize', handleResize)
        }
    }, [])


    return (
        <div className="relative w-full h-full min-h-[clamp(450px,60vh,650px)] overflow-hidden">
            {/* LAYER 1: Static Fallback Image - Always rendered first */}
            <motion.div
                initial={{ opacity: 1 }}
                animate={{
                    opacity: showFallback ? 1 : 0,
                    scale: showFallback ? 1 : 1.02
                }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(92, 230, 201, 0.05) 0%, transparent 70%)'
                }}
            >
                <motion.img
                    src={asset("/assets/images/orbit-fallback.png")}
                    alt="EKATVA Orbital System - Pillars of Unity, Imagination, and Glory"
                    className="w-full h-full object-contain"
                    animate={{
                        scale: [1, 1.02, 1],
                    }}
                    transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        filter: 'brightness(0.9) saturate(1.1)',
                    }}
                />

                {/* Fallback Legend */}
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-light-gray text-[11px] uppercase tracking-wider">SOCIO</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-ekatva-teal" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-light-gray text-[11px] uppercase tracking-wider">TECHNO</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-unity-gold" />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-light-gray text-[11px] uppercase tracking-wider">SPORTS</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-glory-coral" />
                    </div>
                </div>
            </motion.div>

            {/* Instructions - Desktop only (mobile has its own hint in index.tsx) */}
            <AnimatePresence>
                {isWebGLReady && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 1.5, duration: 0.5 }}
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 items-center gap-2 text-xs text-mid-gray text-center z-10 hidden md:flex"
                    >
                        {/* Drag Icon */}
                        <svg
                            className="w-4 h-4 opacity-60"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                        <span>Drag to rotate • Click planets or core to explore</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
