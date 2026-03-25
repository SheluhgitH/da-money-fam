'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function FloatingShape({ position, geometry, color, speed }: {
  position: [number, number, number]
  geometry: 'box' | 'sphere' | 'octahedron'
  color: string
  speed: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const initialPosition = position

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.getElapsedTime() * speed
      meshRef.current.position.x = initialPosition[0] + Math.sin(time) * 2
      meshRef.current.position.y = initialPosition[1] + Math.cos(time * 0.5) * 1.5
      meshRef.current.rotation.x = time * 0.2
      meshRef.current.rotation.y = time * 0.3
    }
  })

  const meshGeometry = useMemo(() => {
    switch (geometry) {
      case 'box':
        return <boxGeometry args={[0.8, 0.8, 0.8]} />
      case 'sphere':
        return <sphereGeometry args={[0.5, 16, 16]} />
      case 'octahedron':
        return <octahedronGeometry args={[0.6]} />
      default:
        return <boxGeometry args={[0.8, 0.8, 0.8]} />
    }
  }, [geometry])

  return (
    <mesh ref={meshRef} position={position}>
      {meshGeometry}
      <meshStandardMaterial
        color={color}
        metalness={0.8}
        roughness={0.2}
        wireframe={false}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

export default function FloatingShapes() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#D4AF37" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#D4AF37" />

        <FloatingShape
          position={[8, 4, -5]}
          geometry="octahedron"
          color="#D4AF37"
          speed={0.3}
        />
        <FloatingShape
          position={[-8, -3, -8]}
          geometry="box"
          color="#E5C15D"
          speed={0.4}
        />
        <FloatingShape
          position={[6, -5, -6]}
          geometry="sphere"
          color="#B8962E"
          speed={0.25}
        />
        <FloatingShape
          position={[-7, 6, -4]}
          geometry="box"
          color="#D4AF37"
          speed={0.35}
        />
        <FloatingShape
          position={[4, 2, -7]}
          geometry="octahedron"
          color="#E5C15D"
          speed={0.45}
        />
        <FloatingShape
          position={[-5, -4, -9]}
          geometry="sphere"
          color="#D4AF37"
          speed={0.2}
        />
      </Canvas>
    </div>
  )
}
