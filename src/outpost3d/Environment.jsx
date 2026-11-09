import { useEffect, useMemo } from 'react'
import { Stars } from '@react-three/drei'
import { PlaneGeometry } from 'three'
import Structures from './Structures.jsx'
import Equipment from './Equipment.jsx'
import LandedSpacecraft from './LandedSpacecraft.jsx'
import { groundHeight, canWalk } from './world.js'
import { Label } from './Equipment.jsx'

export default function Environment({ solarOperational = false, spacecraftObjectives = [], resourceVisuals }) {
  const terrain = useMemo(() => {
    const geometry = new PlaneGeometry(190, 190, 180, 180)
    geometry.rotateX(-Math.PI / 2)
    const positions = geometry.attributes.position
    for (let i = 0; i < positions.count; i++) positions.setY(i, groundHeight(positions.getX(i), positions.getZ(i)))
    geometry.computeVertexNormals()
    return geometry
  }, [])
  useEffect(() => () => terrain.dispose(), [terrain])
  const rocks = useMemo(() => Array.from({ length: 120 }, (_, i) => {
    const x = Math.sin(i * 127.1 + 8) * 62
    const z = Math.cos(i * 311.7 + 2) * 62
    return { x, z, size: 0.12 + (i % 9) * 0.065 }
  }).filter(({ x, z }) => canWalk(x, z) && Math.hypot(x, z - 8) > 5), [])

  return <>
    <color attach="background" args={['#020308']} />
    <Stars radius={150} depth={70} count={1800} factor={2} saturation={0} fade speed={0} />
    <ambientLight intensity={0.3} />
    <directionalLight position={[30, 18, 25]} intensity={3.2} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={40} shadow-camera-bottom={-40}
      shadow-camera-far={150} shadow-normalBias={0.04} />
    <mesh geometry={terrain} receiveShadow><meshStandardMaterial color="#777979" roughness={1} /></mesh>
    {rocks.map(({ x, z, size }, i) => <mesh key={i} position={[x, groundHeight(x, z) + size * 0.3, z]} rotation={[i, i * 0.7, 0]} scale={[size * 1.4, size * 0.7, size]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial color={i % 2 ? '#626565' : '#96948d'} roughness={1} />
    </mesh>)}
    <Structures />
    <Equipment solarOperational={solarOperational} resourceVisuals={resourceVisuals} />
    {resourceVisuals?.storm && <Label text="RADIATION STORM / SHELTER" position={[0, 3.6, -0.65]} width={3} color="#ffc16e" />}
    <LandedSpacecraft recorded={spacecraftObjectives} />
    {Array.from({ length: 7 }, (_, i) => <group key={i} position={[i % 2 ? -2.5 : 2.5, groundHeight(0, i * 2), i * 2]}>
      <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.045, 0.06, 0.5, 6]} /><meshStandardMaterial color="#a0a8b5" /></mesh>
      <mesh position={[0, 0.52, 0]}><sphereGeometry args={[0.075, 8, 8]} /><meshStandardMaterial color={resourceVisuals?.storm ? '#ffc16e' : '#7ed5ee'} emissive={resourceVisuals?.storm ? '#e09b42' : '#43b8dd'} emissiveIntensity={resourceVisuals?.storm ? 2 : 1} /></mesh>
    </group>)}
  </>
}
