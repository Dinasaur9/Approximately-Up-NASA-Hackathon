import { Stars } from '@react-three/drei'
import LunarScenery from './LunarScenery.jsx'
import Structures from './Structures.jsx'
import Equipment from './Equipment.jsx'
import LandedSpacecraft from './LandedSpacecraft.jsx'
import { groundHeight } from './world.js'
import { Label } from './Equipment.jsx'

export default function Environment({ solarOperational = false, spacecraftObjectives = [], resourceVisuals }) {
  return <>
    <color attach="background" args={['#010102']} />
    <Stars radius={150} depth={70} count={850} factor={0.75} saturation={0} fade speed={0} />
    <ambientLight intensity={0.16} />
    <directionalLight position={[30, 18, 25]} intensity={3.5} castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={40} shadow-camera-bottom={-40}
      shadow-camera-far={150} shadow-normalBias={0.04} />
    <LunarScenery />
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
