'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Sparkles, useTexture } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'

function RotatingRing() {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = state.clock.elapsedTime * 0.4
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
    }
  })

  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.15, 0.02, 16, 100]} />
      <meshStandardMaterial color="#D4AF37" emissive="#D4AF37" emissiveIntensity={0.6} />
    </mesh>
  )
}

function AlbumPlane({ coverUrl }: { coverUrl: string }) {
  const ref = useRef<THREE.Mesh>(null)
  const texture = useTexture(coverUrl)

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.15
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
      <mesh ref={ref}>
        <planeGeometry args={[1.8, 1.8]} />
        <meshStandardMaterial map={texture} />
      </mesh>
    </Float>
  )
}

export default function PromotedAlbumAnimation({ coverUrl }: { coverUrl: string }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }} className="!absolute inset-0">
        <ambientLight intensity={0.6} />
        <pointLight position={[2, 2, 2]} intensity={1.2} color="#D4AF37" />
        <AlbumPlane coverUrl={coverUrl} />
        <RotatingRing />
        <Sparkles count={40} scale={3} size={2} speed={0.4} color="#D4AF37" />
      </Canvas>
    </div>
  )
}
