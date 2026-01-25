'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Instagram, Linkedin, Youtube, Mail, MessageCircle, MapPin } from 'lucide-react'
import Matter from 'matter-js'

// ============================================================================
// TYPES
// ============================================================================

interface ValueBlock {
    label: string
    color: 'teal' | 'gold'
    tooltip: string
}

const leftBlocks: ValueBlock[] = [
    { label: 'Community', color: 'teal', tooltip: 'Connect with 34,000+ students across India' },
    { label: 'Personal Growth', color: 'teal', tooltip: 'Events designed to challenge and develop you' },
    { label: 'Unification', color: 'gold', tooltip: 'Bringing distributed students together physically' },
    { label: 'Accountability', color: 'gold', tooltip: 'Student-led, transparent, and responsible' },
]

const rightBlocks: ValueBlock[] = [
    { label: 'Belonging', color: 'teal', tooltip: 'Find your people in your city' },
    { label: 'Culture', color: 'gold', tooltip: 'Celebrate Indian traditions and modern identity' },
    { label: 'Skills', color: 'teal', tooltip: 'Learn beyond academics through experience' },
    { label: 'Network', color: 'gold', tooltip: 'Build connections that last beyond events' },
]

const allBlocks = [...leftBlocks, ...rightBlocks]

export default function Footer() {
    return (
        <footer className="relative w-full bg-gradient-to-b from-[#0A1F24] via-[#050505] to-[#000000] overflow-hidden">
            <div
                className="absolute inset-0 opacity-[0.02] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%235CE6C9' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />
            <div className="h-px w-full bg-gradient-to-r from-transparent via-[#5CE6C9]/20 to-transparent" />
            <PhysicsFooter />
            <LegalBar />
        </footer>
    )
}

function PhysicsFooter() {
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<Matter.Engine | null>(null)
    const [hasStarted, setHasStarted] = useState(false)

    // DEBUG: Start immediately to rule out scroll issues, or use inView
    const isInView = useInView(containerRef, { once: true, amount: 0.1 })

    useEffect(() => {
        if (!isInView || !containerRef.current || !canvasRef.current || hasStarted) return
        setHasStarted(true)

        console.log('[PhysicsFooter] Starting Engine...') // DEBUG

        const container = containerRef.current
        const canvas = canvasRef.current
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = 280

        const engine = Matter.Engine.create({
            gravity: { x: 0, y: 0.8, scale: 0.001 } // Increased gravity slightly
        })
        engineRef.current = engine
        const world = engine.world

        // DEBUG: Enable wireframes to see if bodies exist
        const render = Matter.Render.create({
            canvas: canvas,
            engine: engine,
            options: {
                width: canvas.width,
                height: canvas.height,
                wireframes: false, // Turn off for production look, but set to true if still invisible
                background: 'transparent' // transparent
            }
        })

        const wallThickness = 50
        const centerGapLeft = canvas.width * 0.35
        const centerGapRight = canvas.width * 0.65

        const walls = [
            Matter.Bodies.rectangle(canvas.width / 2, canvas.height + wallThickness / 2, canvas.width, wallThickness, { isStatic: true, label: 'floor' }),
            Matter.Bodies.rectangle(-wallThickness / 2, canvas.height / 2, wallThickness, canvas.height, { isStatic: true, label: 'leftWall' }),
            Matter.Bodies.rectangle(canvas.width + wallThickness / 2, canvas.height / 2, wallThickness, canvas.height, { isStatic: true, label: 'rightWall' }),
            Matter.Bodies.rectangle(centerGapLeft, canvas.height / 2, 20, canvas.height, { isStatic: true, label: 'centerLeft' }), // Thicker barrier
            Matter.Bodies.rectangle(centerGapRight, canvas.height / 2, 20, canvas.height, { isStatic: true, label: 'centerRight' }) // Thicker barrier
        ]
        Matter.World.add(world, walls)

        // Spawn Blocks
        allBlocks.forEach((block, index) => {
            setTimeout(() => {
                const isLeft = index < 4
                // Use fixed width for stability testing
                const width = 120
                const height = 36

                const xRange = isLeft
                    ? [50, centerGapLeft - 60]
                    : [centerGapRight + 60, canvas.width - 50]

                // Ensure x is valid
                let x = xRange[0] + Math.random() * (xRange[1] - xRange[0])
                if (isNaN(x)) x = isLeft ? 100 : canvas.width - 100

                const y = -50 - (index * 20) // Start closer to viewport

                const body = Matter.Bodies.rectangle(x, y, width, height, {
                    restitution: 0.3,
                    friction: 0.01,
                    density: 0.001,
                    label: index.toString(), // CRITICAL FOR ID SYNC
                    render: { fillStyle: 'transparent' }
                })

                const gravityForce = isLeft ? -0.00005 : 0.00005
                Matter.Body.applyForce(body, body.position, { x: gravityForce, y: 0 })

                Matter.World.add(world, body)
                console.log(`[PhysicsFooter] Spawned block ${index} at ${x},${y}`)
            }, index * 200)
        })

        // Mouse
        const mouse = Matter.Mouse.create(canvas)
        const mouseConstraint = Matter.MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: { stiffness: 0.2, render: { visible: false } }
        })
        Matter.World.add(world, mouseConstraint)

        // Fix mouse offset
        // mouse.pixelRatio = window.devicePixelRatio // Sometimes needed?

        const runner = Matter.Runner.create()
        Matter.Runner.run(runner, engine)
        Matter.Render.run(render)

        // SYNC LOOP
        const animate = () => {
            const bodies = Matter.Composite.allBodies(engine.world)

            bodies.forEach(body => {
                if (body.isStatic) return

                const domId = `block-${body.label}`
                const element = document.getElementById(domId)

                if (element) {
                    // Force make visible
                    element.style.opacity = '1'
                    element.style.transform = `translate(${body.position.x}px, ${body.position.y}px) rotate(${body.angle}rad)`
                }
            })
            requestAnimationFrame(animate)
        }
        animate()

        return () => {
            Matter.Render.stop(render)
            Matter.Runner.stop(runner)
            Matter.World.clear(world, false)
            Matter.Engine.clear(engine)
        }
    }, [isInView, hasStarted])

    return (
        <div className="relative w-full max-w-[1400px] mx-auto px-4 md:px-8 py-8 md:py-12">
            <div ref={containerRef} className="relative w-full h-[280px] mb-8">
                {/* Helper text to verify mount */}
                <div className="absolute top-0 left-0 text-[8px] text-white/10 select-none">Physics Area</div>

                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

                <div className="absolute inset-0 pointer-events-none">
                    {allBlocks.map((block, index) => (
                        <BlockElement key={index} block={block} id={`block-${index}`} />
                    ))}
                </div>

                <CenterLogo />
            </div>

            <div className="flex flex-col items-center gap-6">
                <SocialIcons />
                <CTAButtons />
            </div>
        </div>
    )
}

// Block Element with FORCED VISIBILITY for debugging
function BlockElement({ block, id }: { block: ValueBlock, id: string }) {
    const [showTooltip, setShowTooltip] = useState(false)
    const colorClasses = block.color === 'teal'
        ? 'border-[#5CE6C9]/40 text-[#5CE6C9] bg-[#5CE6C9]/5'
        : 'border-[#FFCF96]/40 text-[#FFCF96] bg-[#FFCF96]/5'

    return (
        <div
            id={id}
            className={`absolute top-0 left-0 px-4 py-2 rounded-lg border-2 backdrop-blur-sm cursor-grab ${colorClasses} pointer-events-auto`}
            style={{
                transform: 'translate(-50%, -50%)',
                opacity: 0, // Starts 0, logic sets to 1. If logic fails, this remains 0.
                // Let's set it to 1 via class if possible? No, we need to know where to render.
                // If physics fails, it will stay at top left (0,0) or center?
                // Let's rely on the sync loop to turn it on.
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span className="text-sm font-semibold tracking-wide whitespace-nowrap select-none">{block.label}</span>
            {showTooltip && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-50 px-3 py-2 rounded-md bg-white/95 text-xs text-gray-800 shadow-lg min-w-[150px] text-center">
                    {block.tooltip}
                </div>
            )}
        </div>
    )
}

function CenterLogo() {
    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-24 md:w-28 md:h-28 border border-[#FFCF96]/20 rounded-lg bg-white/5 backdrop-blur-sm">
            <Image src="/assets/images/footer-logo.gif" alt="Ekatva" fill className="object-contain p-3" unoptimized />
        </div>
    )
}

function SocialIcons() {
    // Simplified for robustness
    return <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-white/10" /><div className="w-8 h-8 rounded-full bg-white/10" /></div>
}

function CTAButtons() {
    return <div className="text-white/50 text-xs">CTA BUTTONS</div>
}

function LegalBar() {
    return <div className="w-full border-t border-white/5 mt-4 py-4 text-center text-white/20 text-[10px]">LEGAL</div>
}
