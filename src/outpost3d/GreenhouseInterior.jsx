import { Part, Label, Beacon, Strut } from './Equipment.jsx'
import { greenhouseBounds, greenhouseEquipment, GREENHOUSE_HEIGHT } from './greenhouse.js'

function GrowingRack({ x }) {
  return <group position={[x, 0, -3]}>
    {[-0.95, 0.95].flatMap((dx) => [-3.8, 3.8].map((z) => <Part key={`${dx}:${z}`} position={[dx, 1.8, z]} size={[0.08, 3.6, 0.08]} color="#b1bfbc" />))}
    {[0.65, 2.1].map((y) => <group key={y}>
      <Part position={[0, y, 0]} size={[2.2, 0.16, 8]} color="#aabbb6" />
      {[-0.55, 0.55].map((dx) => <Part key={dx} position={[dx, y + 0.15, 0]} size={[0.48, 0.18, 7.6]} color="#334b40" />)}
      {Array.from({ length: 12 }, (_, i) => <group key={i} position={[(i % 2 ? 0.55 : -0.55), y + 0.3, Math.floor(i / 2) * 1.2 - 3]}>
        <Strut from={[0, 0, 0]} to={[0, 0.3, 0]} radius={0.025} color="#579365" />
        {[-1, 1].map((side) => <mesh key={side} position={[side * 0.13, 0.24, 0]} scale={[0.28, 0.07, 0.16]} rotation={[0, 0, side * 0.35]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={i % 3 ? '#71a75d' : '#99bd65'} roughness={0.85} /></mesh>)}
      </group>)}
      <mesh position={[0, y + 1.1, 0]}><boxGeometry args={[1.7, 0.07, 7.5]} /><meshStandardMaterial color="#d4caff" emissive="#b594ff" emissiveIntensity={0.8} /></mesh>
    </group>)}
    <Strut from={[1, 0.3, -3.8]} to={[1, 0.3, 3.8]} radius={0.065} color="#5aa6b6" />
  </group>
}

export default function GreenhouseInterior() {
  const [left, right, back, front] = greenhouseBounds
  return <>
    <color attach="background" args={['#0b1916']} />
    <ambientLight intensity={0.7} />
    <hemisphereLight args={['#e3e6ff', '#355745', 0.8]} />
    {[-5, 1, 4].map((z) => <pointLight key={z} position={[0, 4, z]} intensity={22} distance={12} decay={2} />)}
    <Part position={[0, -0.12, -2]} size={[12, 0.24, 16]} color="#42534e" />
    <Part position={[0, GREENHOUSE_HEIGHT + 0.1, -2]} size={[12, 0.2, 16]} color="#455c58" />
    {[left, right].map((x) => <Part key={x} position={[x, GREENHOUSE_HEIGHT / 2, -2]} size={[0.2, GREENHOUSE_HEIGHT, 16]} color="#7e9a92" />)}
    {[back, front].map((z) => <Part key={z} position={[0, GREENHOUSE_HEIGHT / 2, z]} size={[12, GREENHOUSE_HEIGHT, 0.2]} color="#7e9a92" />)}
    {[-8, -4, 0, 4].map((z) => <group key={z}>
      <Part position={[0, 4.2, z]} size={[12, 0.15, 0.18]} color="#b3c5be" />
      <Part position={[0, 0.015, z]} size={[0.12, 0.02, 1]} color="#a5d5b2" />
    </group>)}
    <GrowingRack x={-3.9} /><GrowingRack x={3.9} />
    {[-4.3, -2.7].map((x) => <group key={x}>
      <mesh position={[x, 1.2, -8.5]} castShadow><cylinderGeometry args={[0.65, 0.65, 2.4, 16]} /><meshStandardMaterial color={x < -3 ? '#6fadb9' : '#c1b983'} metalness={0.4} roughness={0.5} /></mesh>
      <Strut from={[x, 0.25, -8.5]} to={[x, 0.25, -7.7]} radius={0.07} color="#5ba3b5" />
    </group>)}
    <Part position={[-3.5, 0.3, -7.9]} size={[1, 0.6, 0.5]} color="#31596b" /><Beacon position={[-3.5, 0.65, -7.9]} />
    <Part position={[0, 0.65, -8.7]} size={[2.6, 1.3, 1.4]} color="#3d6461" />
    <Part position={[0, 1.7, -9]} size={[2.2, 1, 0.12]} color="#152e2a" />
    <mesh position={[0, 1.7, -8.92]}><planeGeometry args={[1.9, 0.7]} /><meshStandardMaterial color="#6fa897" emissive="#225945" emissiveIntensity={0.5} /></mesh>
    <Label text="ENVIRONMENT / EXHIBIT" position={[0, 2.5, -8.9]} width={2.8} />
    {[2.7, 4.2].map((x) => [0.5, 1.55].map((y) => <Part key={`${x}:${y}`} position={[x, y, -8.5]} size={[1.3, 0.9, 1.4]} color={y < 1 ? '#97a876' : '#b1a67e'} />))}
    <Label text="WATER / NUTRIENTS" position={[-3.5, 3, -9.8]} width={3.3} />
    <Label text="CROP STORAGE" position={[3.5, 3, -9.8]} width={3} />
    <Label text="HYDROPONICS / AGRI 01" position={[0, 3.6, -9.8]} width={4} />
    <Part position={[0, 1.45, 5.8]} size={[2.6, 2.9, 0.15]} color="#263e3c" />
    <group position={[0, 3.1, 5.65]} rotation={[0, Math.PI, 0]}><Label text="EXIT / LUNAR SURFACE" position={[0, 0, 0]} width={3.5} /></group>
    {/* All large equipment remains inside its shared collision footprints. */}
    {greenhouseEquipment.slice(0, 2).map(([a, b, c, d], i) => <Part key={i} position={[(a + b) / 2, 0.1, (c + d) / 2]} size={[b - a, 0.2, d - c]} color="#2c4038" />)}
  </>
}
