import { useEffect, useMemo } from 'react'
import { CanvasTexture, Vector3, Quaternion } from 'three'
import { groundHeight } from './world.js'

export function Part({ position, size, color = '#bcc3c7', ...props }) {
  return <mesh position={position} castShadow receiveShadow {...props}><boxGeometry args={size} /><meshStandardMaterial color={color} metalness={0.6} roughness={0.45} /></mesh>
}

export function Strut({ from, to, radius = 0.06, color = '#aab1b6' }) {
  const start = new Vector3(...from)
  const end = new Vector3(...to)
  const difference = end.clone().sub(start)
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), difference.clone().normalize())
  return <mesh position={start.add(end).multiplyScalar(0.5)} quaternion={rotation} castShadow><cylinderGeometry args={[radius, radius, difference.length(), 8]} /><meshStandardMaterial color={color} metalness={0.8} roughness={0.35} /></mesh>
}

// Local canvas lettering avoids font downloads or an external asset pipeline.
export function Label({ text, position, width = 2, color = '#99d9ec' }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 128
    const context = canvas.getContext('2d')
    context.fillStyle = '#101c2b'; context.fillRect(0, 0, 512, 128)
    context.strokeStyle = color; context.lineWidth = 8; context.strokeRect(4, 4, 504, 120)
    context.fillStyle = color; context.font = 'bold 38px monospace'; context.textAlign = 'center'
    context.fillText(text, 256, 80, 480)
    return new CanvasTexture(canvas)
  }, [text, color])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={position}><planeGeometry args={[width, width / 4]} /><meshBasicMaterial map={texture} /></mesh>
}

export function Beacon({ position, color = '#80e9dc' }) {
  return <mesh position={position}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} /></mesh>
}

export default function Equipment({ solarOperational = false }) {
  return <>
    <group position={[7, groundHeight(7, 0), 0]}>
      <Part position={[0, 1, 0]} size={[2, 2, 2]} color="#b9c7cb" />
      <Part position={[0, 1, 1.02]} size={[1.65, 1.6, 0.08]} color="#263b49" />
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 1.35, 0.2]} castShadow><cylinderGeometry args={[0.25, 0.25, 2.4, 12]} /><meshStandardMaterial color="#b3c5ce" metalness={0.75} roughness={0.3} /></mesh>)}
      {[-0.4, 0, 0.4].map((y) => <Part key={y} position={[0, 1 + y, 1.08]} size={[1.2, 0.06, 0.04]} color="#8495a2" />)}
      <Label text="O2 / LIFE SUPPORT" position={[0, 2.4, 1.1]} />
      <Beacon position={[0.7, 1.7, 1.12]} />
    </group>
    <group position={[-15, groundHeight(-15, 3), 3]}>
      {[-1.3, 0, 1.3].map((x) => <group key={x}><Part position={[x, 0.75, 0]} size={[1, 1.5, 1.2]} color="#354c68" /><Part position={[x, 0.75, 0.62]} size={[0.65, 0.8, 0.06]} color="#17232f" /><Beacon position={[x, 1.25, 0.68]} color={solarOperational ? '#7de0b4' : '#ffc16e'} /></group>)}
      <Label text="POWER / BATTERY BANK" position={[0, 1.9, 0.7]} width={3} />
    </group>
    <group position={[20, groundHeight(20, 4), 4]}>
      <Part position={[0, 0.4, 0]} size={[3, 0.8, 2]} color="#7a838d" />
      <Strut from={[0, 0.6, 0]} to={[0, 4, 0]} radius={0.12} />
      <mesh position={[0, 4, 0]} rotation={[0.65, 0, 0]} castShadow><sphereGeometry args={[1.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#cbd0d3" metalness={0.7} roughness={0.35} side={2} /></mesh>
      <Strut from={[0, 4, 0]} to={[0, 5.3, 0.8]} radius={0.045} />
      <Beacon position={[0, 5.3, 0.8]} color="#ff965b" />
      <Label text="COMMS / RELAY 01" position={[0, 1.1, 1.05]} width={2.6} />
    </group>
    <group position={[-7, groundHeight(-7, 6), 6]}>
      {[-1.4, 0, 1.4].map((x, i) => <group key={x}><Part position={[x, 0.65, 0]} size={[1.25, 1.3, 1.8]} color={i === 1 ? '#ac8550' : '#7d878c'} />{[-0.4, 0.4].map((offset) => <Part key={offset} position={[x + offset, 0.65, 0.92]} size={[0.09, 1.3, 0.04]} color="#29323c" />)}</group>)}
      <Label text="CARGO / SUPPLY CACHE" position={[0, 1.7, 0.95]} width={3.5} />
    </group>
  </>
}
