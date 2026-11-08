import { Part, Label, Beacon, Strut } from './Equipment.jsx'
import { INTERIOR_HEIGHT, rooms, interiorWalls, doors, doorBounds } from './interior.js'

function Wall({ position, size }) {
  return <Part position={position} size={size} color="#8b9ba5" />
}

function Console({ x, z, rotation = 0 }) {
  return <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
    <Part position={[0, 0.55, 0]} size={[1.5, 1.1, 1.2]} color="#273b50" />
    <Part position={[0, 1.05, 0.3]} size={[1.6, 0.12, 1.4]} color="#576a79" />
    <Part position={[0, 1.6, -0.3]} size={[1.4, 0.9, 0.12]} color="#13202f" />
    <mesh position={[0, 1.6, -0.23]}><planeGeometry args={[1.2, 0.65]} /><meshStandardMaterial color="#4ab6d0" emissive="#1b83a1" emissiveIntensity={0.65} /></mesh>
    {[-0.35, 0, 0.35].map((x) => <Part key={x} position={[x, 1.65, -0.15]} size={[0.18, 0.035, 0.03]} color="#bce9e0" />)}
    <Beacon position={[0.65, 1.1, 0.6]} />
  </group>
}

export default function HabitatInterior({ doorState }) {
  return <>
    <color attach="background" args={['#0c1420']} />
    <ambientLight intensity={0.65} />
    <hemisphereLight args={['#c9e4ff', '#344151', 0.8]} />
    {rooms.map(({ id, name, bounds: [left, right, back, front] }) => {
      const x = (left + right) / 2, z = (back + front) / 2
      return <group key={id}>
        <Part position={[x, -0.12, z]} size={[right - left, 0.24, front - back]} color="#354653" />
        <Part position={[x, INTERIOR_HEIGHT + 0.1, z]} size={[right - left, 0.2, front - back]} color="#465967" />
        <pointLight position={[x, 3.1, z]} intensity={20} distance={11} decay={2} />
        <Part position={[x, 3.45, z]} size={[1.6, 0.08, 0.4]} color="#d7edff" />
        <Label text={name} position={[x, 2.9, back + 0.14]} width={id === 'mission-control' ? 3.8 : 3} />
      </group>
    })}
    {interiorWalls.map(([left, right, back, front], i) => <Wall key={i} position={[(left + right) / 2, 1.8, (back + front) / 2]} size={[right - left, 3.6, front - back]} />)}
    {doors.map((door) => {
      const [left, right, back, front] = doorBounds(door)
      return <group key={door.id}>
        <Part position={[door.x, 3.2, door.z]} size={door.axis === 'x' ? [0.25, 0.8, 2.4] : [2.4, 0.8, 0.25]} color="#4d677d" />
        {!doorState[door.id] && <Part position={[door.x, 1.4, door.z]} size={[right - left, 2.8, front - back]} color="#35516a" />}
        <Beacon position={[door.x, 2.95, door.z + 0.15]} color={doorState[door.id] ? '#7de0b4' : '#ffc16e'} />
      </group>
    })}
    {[-1, 1, 3].map((z) => <Part key={z} position={[0, 0.01, z]} size={[0.12, 0.02, 1]} color="#71c3d7" />)}
    <Part position={[0, 1.4, 7.8]} size={[2.7, 2.8, 0.15]} color="#263b4b" />
    <group position={[0, 2.95, 7.65]} rotation={[0, Math.PI, 0]}><Label text="EXIT TO LUNAR SURFACE" position={[0, 0, 0]} width={2.7} /></group>
    {[-1.8, 0, 1.8].map((x) => <Console key={x} x={x} z={-13} />)}
    <Part position={[3.3, 1.1, -13]} size={[0.5, 2.2, 1]} color="#293b50" />
    {[0.7, 1.1, 1.5].map((y) => <Part key={y} position={[3.3, y, -12.45]} size={[0.35, 0.15, 0.05]} color="#6d9fba" />)}
    <Console x={-8} z={-1.7} rotation={Math.PI / 2} />
    {[-4.6, -3.5].map((z) => <group key={z}>
      <mesh position={[-8, 1.2, z]} castShadow><cylinderGeometry args={[0.42, 0.42, 2.4, 12]} /><meshStandardMaterial color="#aebec6" metalness={0.65} roughness={0.4} /></mesh>
      <Strut from={[-8, 2.5, z]} to={[-7.2, 2.5, z]} radius={0.09} />
    </group>)}
    <Part position={[-8, 1.4, -0.8]} size={[1.4, 2.6, 0.5]} color="#54727b" />
    {[0.6, 1, 1.4, 1.8, 2.2].map((y) => <Part key={y} position={[-7.25, y, -0.8]} size={[0.05, 0.1, 0.35]} color="#172e3e" />)}
    <group position={[8, 0, 3.6]}>
      {[0.5, 1.8].map((height) => <group key={height}>
        <Part position={[0, height, 0]} size={[1.3, 0.15, 2.5]} color="#61778b" />
        <Part position={[0, height + 0.16, 0]} size={[1.2, 0.18, 2.4]} color="#527d8d" />
        <Part position={[0, height + 0.3, -0.8]} size={[1, 0.12, 0.5]} color="#ccd7da" />
        <Beacon position={[-0.5, height + 0.5, -0.9]} />
      </group>)}
    </group>
    <Part position={[8, 1.3, 1.2]} size={[1.3, 2.6, 0.8]} color="#596b7a" />
    <Part position={[7.3, 1.3, 1.2]} size={[0.05, 0.6, 0.08]} color="#c8d9e5" />
    <Console x={8} z={-4} rotation={-Math.PI / 2} />
    <Part position={[8, 0.9, -2]} size={[1.3, 1.8, 2]} color="#4a6870" />
    {[-2.6, -2, -1.4].map((z) => <mesh key={z} position={[7.9, 1.95, z]}><cylinderGeometry args={[0.12, 0.12, 0.3, 8]} /><meshStandardMaterial color="#c9ad76" /></mesh>)}
    <Strut from={[7.5, 2.1, -4.8]} to={[7.5, 2.6, -4.8]} radius={0.06} />
    <Part position={[7.5, 2.65, -4.8]} size={[0.5, 0.15, 0.25]} color="#b0c9d4" />
  </>
}
