import { canWalk, groundHeight } from './world.js'
import { selectInteraction } from './interactions.js'

export const GREENHOUSE_HEIGHT = 4.5
export const greenhouseBounds = [-6, 6, -10, 6]
export const greenhouseEquipment = [
  [-5, -2.8, -7, 1], [2.8, 5, -7, 1], // Growing racks
  [-5, -2, -9.4, -7.6], // Water and nutrients
  [-1.3, 1.3, -9.4, -8], // Environmental terminal
  [2, 5, -9.4, -7.6], // Crop storage
]
const inside = (x, z, [left, right, back, front], margin = 0) =>
  x >= left - margin && x <= right + margin && z >= back - margin && z <= front + margin

export function canWalkGreenhouse(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false
  const [left, right, back, front] = greenhouseBounds
  const clearance = 0.55 // Player radius plus wall half-thickness.
  return x > left + clearance && x < right - clearance && z > back + clearance && z < front - clearance &&
    !greenhouseEquipment.some((bounds) => inside(x, z, bounds, 0.45))
}

export const greenhouseInteractions = [
  { id: 'greenhouse-exit', name: 'Greenhouse Airlock', action: 'exit-greenhouse', prompt: 'Exit to Lunar Surface', position: [0, 5] },
  {
    id: 'hydroponics', name: 'Hydroponic Growing System', action: 'inspect', domain: 'agriculture', position: [-1.6, -2],
    prompt: 'Hydroponics / Food Controls',
    function: 'Support plant roots with water and dissolved nutrients rather than soil.',
    description: 'Hydroponic channels deliver a nutrient solution to roots. Pumps, root oxygenation, and careful monitoring help plants grow in a controlled module. Recirculating water can reduce waste, but the system still needs energy and maintenance.',
    relationship: 'Plants can supplement food supplies. LED lighting and circulation compete with other equipment for electrical power. The shared food-production setting applies on the next simulated turn; inspection does not grow or harvest crops.',
  },
  {
    id: 'nutrients', name: 'Water and Nutrient Station', action: 'inspect', domain: 'water', position: [-1.8, -7],
    function: 'Store, mix, and circulate water and plant nutrients.',
    description: 'Roots need an appropriate balance of dissolved minerals. Operators monitor water quality and nutrient concentration, while pumps circulate the solution through growing channels. Filters help keep the system clean.',
    relationship: 'Reliable water handling supports food production and protects crops from interrupted circulation. Inspection does not consume water or alter supplies.',
  },
  {
    id: 'greenhouse-control', name: 'Environmental Control Terminal', action: 'inspect', domain: 'environment', position: [0, -6.8],
    function: 'Help operators coordinate the growing environment.',
    description: 'Plant growth depends on light, temperature, humidity, and air circulation. A control terminal helps operators understand these conditions and plan adjustments. The screens here are illustrative displays, not live telemetry.',
    relationship: 'Environmental control balances crop needs against electrical demand. Use the Hydroponic Growing System to set shared food production, or Mission Control to review the full resource plan.',
  },
  {
    id: 'crop-storage', name: 'Crop Storage', action: 'inspect', domain: 'storage', position: [1.8, -7],
    function: 'Organize crop containers and keep harvested food protected.',
    description: 'Food storage requires clean containers, clear labels, and suitable environmental conditions. Separating samples from edible supplies helps avoid mix-ups and supports reliable records.',
    relationship: 'Storage connects agricultural work to crew food supplies and future inventory planning. No harvesting, inventory transfer, or resource changes occur here.',
  },
]

export function selectGreenhouseInteraction(x, z) {
  if (!canWalkGreenhouse(x, z)) return null
  return selectInteraction(x, z, greenhouseInteractions.filter((entry) => {
    const distance = Math.hypot(x - entry.position[0], z - entry.position[1])
    const steps = Math.max(1, Math.ceil(distance / 0.04))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (greenhouseEquipment.some((bounds) => inside(x + (entry.position[0] - x) * t, z + (entry.position[1] - z) * t, bounds))) return false
    }
    return true
  }))
}

export const greenhouseProfile = { canWalk: canWalkGreenhouse, groundHeight: () => 0, spawn: [0, 3.5], lookAt: [0, 1.7, -7] }
export const greenhouseExteriorProfile = { canWalk, groundHeight, spawn: [14, -1.5], lookAt: [14, 1.7, 8] }
