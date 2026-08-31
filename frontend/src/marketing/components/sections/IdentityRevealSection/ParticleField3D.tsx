import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * ParticleField3D - GPU-accelerated particle system
 *
 * Uses instanced rendering for performance
 * Creates floating particles with pulsing animation
 */
interface ParticleField3DProps {
    count?: number
    spread?: number
}

export default function ParticleField3D({ count = 200, spread = 15 }: ParticleField3DProps) {
    const meshRef = useRef<THREE.InstancedMesh>(null)

    // Generate random particle positions
    const particles = useMemo(() => {
        const temp = []
        for (let i = 0; i < count; i++) {
            temp.push({
                position: [
                    (Math.random() - 0.5) * spread,
                    (Math.random() - 0.5) * spread * 0.5,
                    (Math.random() - 0.5) * spread,
                ],
                scale: Math.random() * 0.03 + 0.01,
                speed: Math.random() * 0.5 + 0.5,
                offset: Math.random() * Math.PI * 2,
            })
        }
        return temp
    }, [count, spread])

    // Update particle positions each frame
    useFrame((state) => {
        if (!meshRef.current) return

        const time = state.clock.elapsedTime
        const dummy = new THREE.Object3D()

        particles.forEach((particle, i) => {
            // Pulse opacity via scale
            const pulse = Math.sin(time * particle.speed + particle.offset) * 0.5 + 0.5
            const scale = particle.scale * (0.5 + pulse * 0.5)

            dummy.position.set(
                particle.position[0],
                particle.position[1] + Math.sin(time * 0.3 + particle.offset) * 0.1,
                particle.position[2]
            )
            dummy.scale.setScalar(scale)
            dummy.updateMatrix()

            meshRef.current!.setMatrixAt(i, dummy.matrix)
        })

        meshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.6}
            />
        </instancedMesh>
    )
}
