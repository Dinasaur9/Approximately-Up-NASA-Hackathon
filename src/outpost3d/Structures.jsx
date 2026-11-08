import { groundHeight } from './world.js'
import { Label, Beacon, Part } from './Equipment.jsx'

function Box({ position, size, color = '#c6c9c8', ...props }) {
  return <mesh position={position} castShadow receiveShadow {...props}><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={0.7} metalness={0.3} /></mesh>
}

function SolarArray({ x }) {
  return <group position={[x, groundHeight(x, -5), -5]}>
    {[ -4.5, 0, 4.5 ].map((z) => <group key={z} position={[0, 0, z]}>
      <Box position={[0, 1, 0]} size={[0.18, 2, 0.18]} color="#9b9fa3" />
      <group position={[0, 2.1, 0]} rotation={[-0.3, 0, 0]}>
        <Box size={[6.5, 0.12, 3.8]} color="#a6b1bd" />
        {Array.from({ length: 12 }, (_, i) => <Box key={i} position={[(i % 6 - 2.5) * 1.05, 0.09, (Math.floor(i / 6) - 0.5) * 1.8]} size={[0.98, 0.04, 1.65]} color="#132e63" />)}
      </group>
    </group>)}
  </group>
}

export default function Structures() {
  return <>
    <group position={[0, groundHeight(0, -8), -8]}>
      <Box position={[0, 0.25, 0]} size={[12, 0.5, 8]} color="#535965" />
      <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 2.5, 11, 24]} /><meshStandardMaterial color="#d4d5cb" roughness={0.65} metalness={0.35} />
      </mesh>
      {[-4, -2, 0, 2, 4].map((x) => <mesh key={x} position={[x, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[2.53, 0.065, 6, 32]} /><meshStandardMaterial color="#6b7280" /></mesh>)}
      {[-3.3, 3.3].map((x) => <Box key={x} position={[x, 2.7, 2.35]} size={[1.6, 0.7, 0.15]} color="#152e49" />)}
      <Box position={[0, 3.6, 2.15]} size={[5, 0.23, 0.15]} color="#fc3d21" />
      <Box position={[0, 1.5, 5.5]} size={[3.4, 3, 3]} />
      <Box position={[0, 1.5, 7.05]} size={[2.5, 2.7, 0.15]} color="#46505b" />
      <Box position={[0, 1.5, 7.15]} size={[1.8, 2.25, 0.08]} color="#14202d" />
      <Box position={[0, 2.95, 7.2]} size={[2.8, 0.12, 0.1]} color="#54d4cd" />
      <Label text="AIRLOCK / EVA 01" position={[0, 2.65, 7.25]} width={2.2} />
      <Label text="APPROX UP / HAB 01" position={[-3.4, 3.5, 2.45]} width={2.6} />
      <Beacon position={[-1.4, 2.8, 7.22]} />
      <Beacon position={[1.4, 2.8, 7.22]} color="#ffb65c" />
      <Box position={[0, 0.08, 8.3]} size={[3.5, 0.16, 2]} color="#717780" />
      <Box position={[4.8, 5.8, 0]} size={[0.08, 3, 0.08]} />
      <mesh position={[4.8, 7.4, 0]} rotation={[0.4, 0, 0]}><sphereGeometry args={[0.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#d7d9de" side={2} /></mesh>
    </group>
    <group position={[14, groundHeight(14, -8), -8]}>
      <Box position={[0, 0.35, 0]} size={[8, 0.7, 8]} color="#6c7470" />
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow><sphereGeometry args={[3.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#9ccbb6" transparent opacity={0.4} roughness={0.25} metalness={0.15} depthWrite={false} /></mesh>
      {[0, Math.PI / 3, 2 * Math.PI / 3].map((angle) => <mesh key={angle} position={[0, 0.7, 0]} rotation={[0, angle, 0]}><torusGeometry args={[3.82, 0.07, 6, 32, Math.PI]} /><meshStandardMaterial color="#b7c7c3" /></mesh>)}
      {[-1.5, 0, 1.5].map((x) => <group key={x}><Box position={[x, 0.9, 0]} size={[0.75, 0.35, 4]} color="#353c35" />{[-1, 0, 1].map((z) => <mesh key={z} position={[x, 1.25, z]}><icosahedronGeometry args={[0.4, 0]} /><meshStandardMaterial color="#68a169" /></mesh>)}</group>)}
      <Label text="AGRI / GREENHOUSE" position={[0, 1.2, 4.05]} width={3} color="#ade6b2" />
      {[-2, 2].map((x) => <group key={x}><Part position={[x, 0.6, 3.5]} size={[0.18, 1.2, 0.18]} /><Beacon position={[x, 1.3, 3.5]} /></group>)}
    </group>
    <SolarArray x={-15} /><SolarArray x={-23} />
  </>
}
