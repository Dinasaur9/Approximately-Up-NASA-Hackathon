import { groundHeight } from './world.js'
import { Part, Strut, Label, Beacon } from './Equipment.jsx'

export default function LandedSpacecraft() {
  return <group position={[25, groundHeight(25, -10), -10]}>
    <mesh position={[0, 2.4, 0]} castShadow receiveShadow><cylinderGeometry args={[2.1, 2.5, 1.6, 8]} /><meshStandardMaterial color="#b4944c" metalness={0.75} roughness={0.45} /></mesh>
    <Part position={[0, 4.05, 0]} size={[3.2, 2, 2.8]} color="#d4d6d2" />
    <mesh position={[0, 5.2, 0]} castShadow><cylinderGeometry args={[1.2, 1.8, 0.7, 6]} /><meshStandardMaterial color="#a1abb5" metalness={0.8} roughness={0.3} /></mesh>
    <mesh position={[0, 1.25, 0]} castShadow><cylinderGeometry args={[0.35, 0.8, 0.8, 16, 1, true]} /><meshStandardMaterial color="#333c47" metalness={0.8} roughness={0.3} side={2} /></mesh>
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => {
      const footY = groundHeight(25 + x * 3.6, -10 + z * 3.6) - groundHeight(25, -10)
      return <group key={`${x}:${z}`}>
        <Strut from={[x * 1.8, 2.9, z * 1.8]} to={[x * 3.6, footY + 0.2, z * 3.6]} radius={0.13} />
        <Strut from={[x, 1.7, z]} to={[x * 3.6, footY + 0.4, z * 3.6]} radius={0.075} />
        <mesh position={[x * 3.6, footY + 0.12, z * 3.6]} castShadow><cylinderGeometry args={[0.65, 0.8, 0.22, 12]} /><meshStandardMaterial color="#8e959a" metalness={0.8} roughness={0.4} /></mesh>
      </group>
    }))}
    {[-0.85, 0.85].map((x) => <group key={x}><Part position={[x, 4.35, 1.43]} size={[0.9, 0.65, 0.1]} color="#183c5d" /><Beacon position={[x * 1.6, 3.5, 1.5]} /></group>)}
    <Label text="APPROX UP / LM-01" position={[0, 3.45, 1.5]} width={2.7} />
    <Part position={[0, 2.9, 1.45]} size={[2.8, 0.18, 0.12]} color="#fc3d21" />
    <Strut from={[0, 0.3, 2.6]} to={[0, 3.1, 1.8]} radius={0.05} />
    {Array.from({ length: 7 }, (_, i) => <Part key={i} position={[0, 0.5 + i * 0.35, 2.55 - i * 0.1]} size={[0.8, 0.06, 0.1]} />)}
    <Strut from={[1, 5.4, 0]} to={[1, 6.4, 0]} radius={0.03} /><Beacon position={[1, 6.4, 0]} color="#fba36c" />
  </group>
}
