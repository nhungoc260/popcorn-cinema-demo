import { useRef, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, MeshDistortMaterial, Float, Stars, Ring, Torus } from '@react-three/drei'
import * as THREE from 'three'

function CinemaOrb() {
  const meshRef = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.2
    meshRef.current.rotation.y += 0.005
  })
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <Sphere ref={meshRef} args={[1.8, 64, 64]}>
        <MeshDistortMaterial
          color="var(--color-primary)"
          distort={0.35}
          speed={2}
          roughness={0.1}
          metalness={0.8}
          transparent
          opacity={0.85}
          emissive="var(--color-primary-dark)"
          emissiveIntensity={0.4}
        />
      </Sphere>
    </Float>
  )
}

function FloatingRing({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    ref.current.rotation.x = state.clock.elapsedTime * speed * 0.3
    ref.current.rotation.z = state.clock.elapsedTime * speed * 0.2
  })
  return (
    <Torus ref={ref} args={[radius, 0.04, 16, 100]} rotation={[Math.PI / 3, 0, 0]}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.5} />
    </Torus>
  )
}

function InnerScene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={2} color="var(--color-primary)" />
      <pointLight position={[-5, -3, -5]} intensity={1} color="#FDE68A" />
      <pointLight position={[0, -5, 3]} intensity={0.8} color="var(--color-primary-light)" />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0.5} fade speed={1} />

      <CinemaOrb />
      <FloatingRing radius={2.8} speed={0.5} color="var(--color-primary)" />
      <FloatingRing radius={3.5} speed={0.3} color="#FDE68A" />
      <FloatingRing radius={4.2} speed={0.2} color="var(--color-primary-light)" />

      {/* Floating particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const r = 4 + Math.random() * 2
        return (
          <Float key={i} speed={1 + Math.random()} floatIntensity={0.5}>
            <Sphere
              args={[0.05 + Math.random() * 0.06, 8, 8]}
              position={[Math.cos(angle) * r, (Math.random() - 0.5) * 4, Math.sin(angle) * r * 0.5]}
            >
              <meshStandardMaterial
                color={i % 2 === 0 ? 'var(--color-primary)' : '#FDE68A'}
                emissive={i % 2 === 0 ? 'var(--color-primary)' : '#FDE68A'}
                emissiveIntensity={1}
              />
            </Sphere>
          </Float>
        )
      })}
    </>
  )
}

export default function HeroScene() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <InnerScene />
        </Suspense>
      </Canvas>
    </div>
  )
}
