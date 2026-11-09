import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial, DoubleSide } from 'three'
import { groundHeight } from './world.js'
import { Part, Strut, Label, Beacon } from './Equipment.jsx'
import { spacecraftInspections } from './spacecraft.js'
import { LANDER_ORIGIN, FOOT_OFFSET, FOOT_RADIUS, legDirections, CHECKLIST_TERMINAL_POSITION } from './spacecraftLayout.js'

function Panel({ position, size, material, rotation }) {
  return <mesh position={position} rotation={rotation} material={material} castShadow receiveShadow><boxGeometry args={size} /></mesh>
}

export default function LandedSpacecraft({ recorded = [] }) {
  const materials = useMemo(() => ({
    cabin: new MeshStandardMaterial({ color: '#cbd0ce', metalness: 0.5, roughness: 0.55 }),
    frame: new MeshStandardMaterial({ color: '#5b6570', metalness: 0.75, roughness: 0.35 }),
    dark: new MeshStandardMaterial({ color: '#202b34', metalness: 0.5, roughness: 0.65 }),
    glass: new MeshStandardMaterial({ color: '#16354b', metalness: 0.7, roughness: 0.15 }),
    gold: new MeshStandardMaterial({ color: '#b39148', metalness: 0.75, roughness: 0.58 }),
    goldLight: new MeshStandardMaterial({ color: '#c1a15d', metalness: 0.7, roughness: 0.65 }),
    goldDark: new MeshStandardMaterial({ color: '#9f7e3d', metalness: 0.75, roughness: 0.5 }),
    nozzle: new MeshStandardMaterial({ color: '#333941', metalness: 0.85, roughness: 0.4, side: DoubleSide }),
  }), [])
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])
  const [originX, originZ] = LANDER_ORIGIN
  const baseY = groundHeight(originX, originZ)
  return <>
    <group position={[originX, baseY, originZ]}>
      <mesh position={[0, 2.4, 0]} material={materials.gold} castShadow receiveShadow><cylinderGeometry args={[2.1, 2.5, 1.6, 8]} /></mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i + 0.5) * Math.PI / 4
        return <group key={i} rotation={[0, angle, 0]}>
          <Panel position={[0, 2.4, 2.16]} size={[1.45, 1.25, 0.05]} material={i % 2 ? materials.goldLight : materials.goldDark} />
          <Panel position={[0, 2.35, 2.21]} size={[0.8, 0.55, 0.04]} material={materials.gold} />
          <Panel position={[0, 3.16, 1.98]} size={[1.6, 0.08, 0.12]} material={materials.frame} />
          <Strut from={[-0.78, 1.62, 2.17]} to={[-0.68, 3.14, 1.91]} radius={0.045} color="#657078" />
        </group>
      })}
      <Panel position={[0, 4.05, 0]} size={[3.2, 2, 2.8]} material={materials.cabin} />
      <mesh position={[0, 5.2, 0]} material={materials.frame} castShadow><cylinderGeometry args={[1.2, 1.8, 0.7, 6]} /></mesh>
      {[-1, 1].map((side) => <group key={side}>
        <Panel position={[side * 1.62, 4.05, 0]} size={[0.05, 1.8, 2.5]} material={materials.frame} />
        <Panel position={[side * 1.66, 4.05, 0]} size={[0.04, 1.65, 2.3]} material={materials.cabin} />
        <Panel position={[side * 1.7, 3.7, 0.35]} size={[0.04, 0.5, 0.8]} material={materials.dark} />
        <Panel position={[side * 0.85, 4.35, 1.45]} size={[1.08, 0.82, 0.14]} material={materials.frame} />
        <Panel position={[side * 0.85, 4.35, 1.54]} size={[0.86, 0.61, 0.05]} material={materials.glass} />
        <Strut from={[side * 0.43, 3.3, 1.72]} to={[side * 0.43, 4.65, 1.72]} radius={0.035} color="#b2bec7" />
        <Beacon position={[side * 1.4, 3.45, 1.5]} />
      </group>)}
      <Panel position={[0, 3.85, 1.48]} size={[0.56, 1.3, 0.14]} material={materials.frame} />
      <Panel position={[0, 3.85, 1.57]} size={[0.43, 1.15, 0.05]} material={materials.cabin} />
      <Part position={[0.1, 3.8, 1.64]} size={[0.08, 0.22, 0.06]} color="#303a43" />
      <Part position={[0, 3.25, 1.49]} size={[2.8, 0.12, 0.1]} color="#fc3d21" />
      <Strut from={[0, 0.3, 2.6]} to={[0, 3.2, 1.8]} radius={0.055} />
      {Array.from({ length: 8 }, (_, i) => <Panel key={i} position={[0, 0.5 + i * 0.35, 2.55 - i * 0.1]} size={[0.8, 0.06, 0.1]} material={materials.frame} />)}
      {/* Stationary engine bell: no exhaust, particles, or active propulsion. */}
      <mesh position={[0, 1.2, 0]} material={materials.nozzle} castShadow><cylinderGeometry args={[0.3, 0.85, 0.95, 20, 1, true]} /></mesh>
      <mesh position={[0, 0.73, 0]} rotation={[Math.PI / 2, 0, 0]} material={materials.frame}><torusGeometry args={[0.85, 0.055, 6, 20]} /></mesh>
      <mesh position={[0, 1.66, 0]} material={materials.dark}><cylinderGeometry args={[0.37, 0.37, 0.15, 12]} /></mesh>
      {[-1, 1].map((side) => <Strut key={side} from={[side * 1.1, 1.7, 0]} to={[side * 0.3, 1.55, 0]} radius={0.07} />)}
      <Panel position={[2.62, 1.8, 0]} size={[0.16, 0.65, 0.85]} material={materials.frame} />
      <Part position={[2.72, 1.7, 0]} size={[0.03, 0.07, 0.6]} color="#dfb64d" />
      {legDirections.map(([x, z]) => {
        const footY = groundHeight(originX + x * FOOT_OFFSET, originZ + z * FOOT_OFFSET) - baseY
        return <group key={`${x}:${z}`}>
          <Panel position={[x * 1.8, 2.9, z * 1.8]} size={[0.4, 0.3, 0.4]} material={materials.frame} />
          <Strut from={[x * 1.8, 2.9, z * 1.8]} to={[x * FOOT_OFFSET, footY + 0.22, z * FOOT_OFFSET]} radius={0.13} />
          <Strut from={[x * 2.35, 2.1, z * 2.35]} to={[x * 2.9, 1.2 + footY * 0.5, z * 2.9]} radius={0.21} color="#bbc4c9" />
          <Strut from={[x, 1.7, z]} to={[x * FOOT_OFFSET, footY + 0.4, z * FOOT_OFFSET]} radius={0.075} />
          <Strut from={[x * 2, 1.75, z]} to={[x * 3.25, footY + 0.65, z * 3.25]} radius={0.055} />
          <mesh position={[x * FOOT_OFFSET, footY + 0.12, z * FOOT_OFFSET]} material={materials.frame} castShadow receiveShadow><cylinderGeometry args={[0.65, FOOT_RADIUS, 0.22, 12]} /></mesh>
          <mesh position={[x * FOOT_OFFSET, footY + 0.245, z * FOOT_OFFSET]} material={materials.dark}><cylinderGeometry args={[0.2, 0.3, 0.1, 10]} /></mesh>
        </group>
      })}
      {/* Rear service housing links to the elevated communications assembly. */}
      <Panel position={[0, 1.4, -2.75]} size={[1.2, 1.1, 0.45]} material={materials.frame} />
      <Strut from={[0, 1.9, -2.6]} to={[0, 4.9, -2.6]} radius={0.045} color="#657c8d" />
      <Strut from={[0, 4.9, -2.6]} to={[1, 5.6, 0]} radius={0.045} color="#657c8d" />
      <Panel position={[1, 5.55, 0]} size={[0.5, 0.3, 0.5]} material={materials.frame} />
      <Strut from={[1, 5.5, 0]} to={[1, 6.35, 0]} radius={0.055} />
      <group position={[1, 6.35, 0]} rotation={[0.8, 0.35, 0]}>
        <mesh material={materials.nozzle} castShadow><sphereGeometry args={[0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        <Strut from={[0, 0, 0]} to={[0, 0.5, 0]} radius={0.025} />
      </group>
      <Beacon position={[1, 6.95, 0]} color="#b8d5e2" />
    </group>
    {/* Compact console sits beside the access path, grounded independently. */}
    <group position={[CHECKLIST_TERMINAL_POSITION[0], groundHeight(...CHECKLIST_TERMINAL_POSITION), CHECKLIST_TERMINAL_POSITION[1]]}>
      <Panel position={[0, 0.09, 0]} size={[0.85, 0.1, 0.65]} material={materials.frame} />
      {[-0.3, 0.3].flatMap((x) => [-0.21, 0.21].map((z) => {
        const footY = groundHeight(CHECKLIST_TERMINAL_POSITION[0] + x, CHECKLIST_TERMINAL_POSITION[1] + z) - groundHeight(...CHECKLIST_TERMINAL_POSITION)
        return <Panel key={`${x}:${z}`} position={[x, footY + 0.025, z]} size={[0.15, 0.05, 0.15]} material={materials.dark} />
      }))}
      <Panel position={[0, 0.53, 0]} size={[0.2, 0.8, 0.2]} material={materials.cabin} />
      <Panel position={[0, 0.6, 0.11]} size={[0.1, 0.4, 0.03]} material={materials.dark} />
      <group position={[0, 1.05, 0]} rotation={[-0.25, 0, 0]}>
        <Panel position={[0, 0, 0]} size={[0.85, 0.5, 0.24]} material={materials.frame} />
        <Panel position={[0, -0.07, 0.13]} size={[0.7, 0.22, 0.04]} material={materials.glass} />
        <Label text="LM-01 Inspection" position={[0, 0.14, 0.155]} width={0.7} />
        {spacecraftInspections.map((entry, i) => <group key={entry.id} position={[(i - 1) * 0.2, -0.09, 0.16]}>
          <Panel position={[0, 0, 0]} size={[0.13, 0.025, 0.025]} material={recorded.includes(entry.objectiveId) ? materials.cabin : materials.dark} />
          <Beacon position={[0, -0.13, 0.03]} color={recorded.includes(entry.objectiveId) ? '#7de0b4' : '#ffc16e'} />
        </group>)}
      </group>
    </group>
    {/* Indicators mount on the footpad or service housing, not freestanding posts. */}
    {spacecraftInspections.map((entry) => <group key={entry.id} position={[entry.markerPosition[0], groundHeight(...entry.markerPosition) + entry.markerHeight, entry.markerPosition[1]]} rotation={[0, entry.markerRotation, 0]}>
      <Part position={[0, 0, 0]} size={[0.65, 0.23, 0.05]} color="#283b47" />
      {entry.objectiveId === 'gear' && <Part position={[0, -0.12, -0.04]} size={[0.06, 0.24, 0.1]} color="#657078" />}
      <Beacon position={[-0.25, 0.02, 0.05]} color={recorded.includes(entry.objectiveId) ? '#7de0b4' : '#ffc16e'} />
      <Label text={entry.marker} position={[0.07, 0.02, 0.04]} width={0.43} />
    </group>)}
  </>
}
