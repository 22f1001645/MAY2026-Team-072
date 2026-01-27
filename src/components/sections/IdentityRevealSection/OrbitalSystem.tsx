'use client'

import { Suspense, useState, useCallback, useEffect, Component, ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { validateOrbitalSystem } from '@/lib/orbital-math'
import { PLANET_CONFIGS } from '@/data/planets'

/**
 * OrbitalSystem - WebGL-Only with Static Fallback
 * 
 * Architecture:
 * ✅ Static fallback image as INITIAL state (no black flash)
 * ✅ WebGL Canvas fades in when ready (onCreated)
 * ✅ ErrorBoundary catches context loss / crashes
 * ✅ DPR clamped to [1, 2] for mobile performance
 * ✅ Graceful degradation: fallback stays visible on error
 */

// Dynamically import WebGLOrbitScene (client-side only, no SSR)
const WebGLOrbitScene = dynamic(
    () => import('./WebGLOrbitScene'),
    {
        ssr: false,
        loading: () => null // Don't show loading, static image is visible
    }
)

// ===========================================
// INLINE ERROR BOUNDARY (No external dep)
// ===========================================
interface ErrorBoundaryState {
    hasError: boolean
}

interface ErrorBoundaryProps {
    children: ReactNode
    onError?: () => void
    fallback?: ReactNode
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true }
    }

    componentDidCatch(error: Error) {
        console.warn('WebGL Error caught:', error.message)
        this.props.onError?.()
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null
        }
        return this.props.children
    }
}

// ===========================================
// WEBGL SUPPORT DETECTION
// ===========================================
const checkWebGLSupport = (): boolean => {
    if (typeof window === 'undefined') return true // Optimistic SSR
    try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        return !!gl
    } catch {
        return false
    }
}

// ===========================================
// MAIN COMPONENT
// ===========================================
export default function OrbitalSystem() {
    const [isWebGLReady, setIsWebGLReady] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [webGLSupported, setWebGLSupported] = useState(true) // Optimistic
    const [mounted, setMounted] = useState(false)

    // Check WebGL support on mount
    useEffect(() => {
        setMounted(true)
        const supported = checkWebGLSupport()
        setWebGLSupported(supported)
        if (!supported) {
            console.warn('WebGL not supported, showing static fallback')
        }

        // Validate orbital sizing system
        if (process.env.NODE_ENV === 'development') {
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

    // Called when Canvas is ready
    const handleWebGLReady = useCallback(() => {
        setIsWebGLReady(true)
    }, [])

    // Called when ErrorBoundary catches
    const handleError = useCallback(() => {
        setHasError(true)
    }, [])

    // Should we attempt WebGL?
    const shouldRenderWebGL = mounted && webGLSupported && !hasError

    // Is fallback visible?
    const showFallback = !isWebGLReady || hasError || !webGLSupported

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
                    src="/assets/images/orbit-fallback.png"
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

            {/* LAYER 2: WebGL Canvas - Fades in when ready */}
            <AnimatePresence>
                {shouldRenderWebGL && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isWebGLReady ? 1 : 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0"
                    >
                        <WebGLErrorBoundary onError={handleError} fallback={null}>
                            <Suspense fallback={null}>
                                <WebGLOrbitScene onReady={handleWebGLReady} />
                            </Suspense>
                        </WebGLErrorBoundary>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Loading indicator - only show if WebGL is loading */}
            <AnimatePresence>
                {mounted && shouldRenderWebGL && !isWebGLReady && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 2, duration: 0.3 }}
                        className="absolute bottom-6 left-6 text-xs text-mid-gray"
                    >
                        Loading 3D experience...
                    </motion.div>
                )}
            </AnimatePresence>

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
