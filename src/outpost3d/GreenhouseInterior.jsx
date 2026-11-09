import { Part, Label, Beacon, Strut } from './Equipment.jsx'
import { greenhouseBounds, greenhouseEquipment, GREENHOUSE_HEIGHT } from './greenhouse.js'
import { RESOURCE_COLORS } from './resourceVisuals.js'

function GrowingRack({ x, growLightFraction = 0 }) {
  return <group position={[x, 0, -3]}>
    {[-0.95, 0.95].flatMap((dx) => [-3.8, 3.8].map((z) => <Part key={`${dx}:${z}`} position={[dx, 1.8, z]} size={[0.08, 3.6, 0.08]} color="#b1bfbc" />))}
    {[0.65, 2.1].map((y) => <group key={y}>
      <Part position={[0, y, 0]} size={[2.2, 0.16, 8]} color="#aabbb6" />
      {[-0.55, 0.55].map((dx) => <group key={dx}>
        <Part position={[dx, y + 0.12, 0]} size={[0.48, 0.14, 7.6]} color="#334b40" />
        {[-0.24, 0.24].map((edge) => <Part key={edge} position={[dx + edge, y + 0.21, 0]} size={[0.035, 0.14, 7.6]} color="#a1b4aa" />)}
        <mesh position={[dx, y + 1.1, 0]}><boxGeometry args={[0.18, 0.055, 7.5]} /><meshStandardMaterial color={growLightFraction > 0 ? '#eef0e5' : '#53615e'} emissive="#c6bcdb" emissiveIntensity={0.6 * growLightFraction} /></mesh>
      </group>)}
      {Array.from({ length: 12 }, (_, i) => {
        const stage = Math.floor(i / 4)
        const scale = [0.45, 0.7, 1][stage]
        return <group key={i} position={[(i % 2 ? 0.55 : -0.55), y + 0.25, Math.floor(i / 2) * 1.2 - 3]}>
          <mesh><cylinderGeometry args={[0.11, 0.08, 0.12, 8]} /><meshStandardMaterial color="#1a2c24" roughness={1} /></mesh>
          <group scale={scale}>
            <Strut from={[0, 0, 0]} to={[0, 0.3, 0]} radius={0.025} color="#579365" />
            {Array.from({ length: stage === 2 ? 4 : 2 }, (_, leaf) => <group key={leaf} rotation={[0, leaf * Math.PI / 2, 0]}>
              <mesh position={[0.16, 0.24, 0]} scale={[0.28, 0.07, 0.16]} rotation={[0, 0, 0.35]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color={stage === 0 ? '#a1bd79' : '#70a15d'} roughness={0.85} /></mesh>
            </group>)}
          </group>
        </group>
      })}
      <Strut from={[-0.9, y + 0.15, -3.65]} to={[0.9, y + 0.15, -3.65]} radius={0.04} color="#6d9a9b" />
    </group>)}
    <Strut from={[1, 0.3, -3.8]} to={[1, 0.3, 3.8]} radius={0.065} color="#5aa6b6" />
    <Strut from={[1, 0.3, -3.8]} to={[1, 2.4, -3.8]} radius={0.045} color="#5aa6b6" />
    <Part position={[0.95, 3.45, 3.6]} size={[0.16, 0.2, 0.15]} color="#c7d5cd" />
    <Beacon position={[0.95, 3.48, 3.7]} color="#9bc3d0" />
  </group>
}

export default function GreenhouseInterior({ nutrientsReplenished = false, resourceVisuals }) {
  const [left, right, back, front] = greenhouseBounds
  const food = resourceVisuals?.food
  const foodLabels = { off: 'PLAN / FOOD OFF', powered: 'PLAN / FOOD POWERED', partial: 'PLAN / PARTIAL FOOD POWER', unpowered: 'PLAN / NO FOOD POWER', shelter: 'PLAN / SHELTER MODE', ended: 'SIMULATION ENDED' }
  const foodColor = food?.status === 'powered' ? RESOURCE_COLORS.normal : ['partial', 'unpowered'].includes(food?.status) ? RESOURCE_COLORS.warning : RESOURCE_COLORS.standby
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
    <GrowingRack x={-3.9} growLightFraction={food?.poweredFraction ?? 0} /><GrowingRack x={3.9} growLightFraction={food?.poweredFraction ?? 0} />
    {/* One sign per workstation, facing the approach and above its equipment. */}
    <Label text="HYDROPONIC GROWING AREA" position={[-3.9, 3.95, 1.08]} width={3.6} />
    <Label text="WATER / NUTRIENT STATION" position={[-3.5, 3.1, -7.7]} width={2.8} color="#a5d4df" />
    <Label text="ENVIRONMENTAL CONTROL" position={[0, 3.1, -8.05]} width={2.5} />
    <Label text={foodLabels[food?.status] || 'PLAN / FOOD OFF'} position={[0, 3.75, -8.05]} width={2.3} color={foodColor} />
    <Label text="CROP STORAGE AREA" position={[3.5, 3.1, -7.7]} width={2.8} color="#ded3aa" />
    {/* Recessed equipment bays distinguish the three rear workstations. */}
    <Part position={[-3.5, 1.5, -9.25]} size={[2.9, 3, 0.1]} color="#345661" />
    <Part position={[0, 1.5, -9.25]} size={[2.6, 3, 0.1]} color="#304b4c" />
    <Part position={[3.5, 1.5, -9.25]} size={[2.9, 3, 0.1]} color="#585b47" />
    {[-4.3, -2.7].map((x) => <group key={x}>
      <mesh position={[x, 1.2, -8.5]} castShadow><cylinderGeometry args={[0.65, 0.65, 2.4, 16]} /><meshStandardMaterial color={x < -3 ? '#6fadb9' : '#c1b983'} metalness={0.4} roughness={0.5} /></mesh>
      <Strut from={[x, 0.25, -8.5]} to={[x, 0.25, -7.7]} radius={0.07} color="#5ba3b5" />
      <Part position={[x, 2.48, -8.5]} size={[0.32, 0.12, 0.32]} color="#374f59" />
      <Part position={[x, 1.2, -7.84]} size={[0.08, 1.5, 0.04]} color="#d2e2de" />
    </group>)}
    <Strut from={[-4.3, 0.25, -7.7]} to={[-2.7, 0.25, -7.7]} radius={0.05} color="#5ba3b5" />
    <Part position={[-3.5, 0.3, -7.9]} size={[1, 0.6, 0.5]} color="#31596b" /><Beacon position={[-3.5, 0.65, -7.9]} color={nutrientsReplenished ? '#7de0b4' : '#ffc16e'} />
    <Part position={[0, 0.65, -8.7]} size={[2.6, 1.3, 1.4]} color="#3d6461" />
    <Part position={[0, 1.7, -9]} size={[2.2, 1, 0.12]} color="#152e2a" />
    <mesh position={[0, 1.7, -8.92]}><planeGeometry args={[1.9, 0.7]} /><meshStandardMaterial color="#6fa897" emissive="#225945" emissiveIntensity={0.5} /></mesh>
    <Part position={[0, 1.3, -8.9]} size={[2.2, 0.12, 0.2]} color="#c2d2cb" />
    <Beacon position={[1.05, 1.6, -8.9]} color={foodColor} />
    {[2.7, 4.2].map((x) => [0.5, 1.55].map((y) => <group key={`${x}:${y}`}>
      <Part position={[x, y, -8.5]} size={[1.3, 0.9, 1.4]} color={y < 1 ? '#97a876' : '#b1a67e'} />
      <Part position={[x, y + 0.3, -7.78]} size={[1.2, 0.07, 0.03]} color="#37483b" />
      <Part position={[x, y, -7.76]} size={[0.32, 0.08, 0.04]} color="#d3d8c0" />
    </group>))}
    <Part position={[0, 1.45, 5.8]} size={[2.6, 2.9, 0.15]} color="#263e3c" />
    <group position={[0, 3.1, 5.65]} rotation={[0, Math.PI, 0]}><Label text="EXIT / LUNAR SURFACE" position={[0, 0, 0]} width={3.5} /></group>
    {/* All large equipment remains inside its shared collision footprints. */}
    {greenhouseEquipment.slice(0, 2).map(([a, b, c, d], i) => <Part key={i} position={[(a + b) / 2, 0.1, (c + d) / 2]} size={[b - a, 0.2, d - c]} color="#2c4038" />)}
  </>
}
