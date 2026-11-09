import { availableCollectibles } from './collectibles.js'
import { groundHeight } from './world.js'
import { Part, Beacon } from './Equipment.jsx'

export default function Collectibles({ location, collectedIds }) {
  return availableCollectibles(location, collectedIds).map((object) => {
    const [x, z] = object.position
    const y = (location === 'exterior' ? groundHeight(x, z) : 0) + 0.15
    return <group key={object.id} position={[x, y, z]}>
      <Part position={[0, 0, 0]} size={[0.65, 0.2, 0.65]} color="#334a5a" />
      {object.itemId === 'filter' && <group position={[0, 0.3, 0]}>
        <Part size={[0.35, 0.45, 0.18]} color="#d1dad9" />
        {[-0.12, 0, 0.12].map((dy) => <Part key={dy} position={[0, dy, 0.1]} size={[0.28, 0.035, 0.03]} color="#5d8c9c" />)}
      </group>}
      {object.itemId === 'tool' && <group position={[0, 0.32, 0]} rotation={[0, 0, 0.4]}><Part size={[0.1, 0.45, 0.1]} color="#eea858" /><Part position={[0, 0.22, 0]} size={[0.35, 0.1, 0.12]} color="#b9c7d1" /></group>}
      {object.itemId === 'cell' && <group position={[0, 0.3, 0]}><Part size={[0.3, 0.4, 0.22]} color="#6f9bd0" /><Part position={[0, 0.23, 0]} size={[0.15, 0.06, 0.12]} color="#c5d3e0" /></group>}
      {object.itemId === 'nutrient' && Array.from({ length: object.quantity }, (_, i) => <mesh key={i} position={[(i - (object.quantity - 1) / 2) * 0.24, 0.3, 0]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.4, 10]} /><meshStandardMaterial color="#9fc67f" metalness={0.3} roughness={0.4} /></mesh>)}
      <Beacon position={[0.25, 0.16, 0.25]} color="#ffdc86" />
    </group>
  })
}
