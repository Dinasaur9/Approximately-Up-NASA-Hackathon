import { ITEM_TYPES } from './inventory.js'
import { canWalk } from './world.js'
import { canWalkGreenhouse } from './greenhouse.js'

export const collectibles = [
  { id: 'cargo-filter-01', itemId: 'filter', quantity: 1, location: 'exterior', position: [-7, 8] },
  { id: 'maintenance-tool-01', itemId: 'tool', quantity: 1, location: 'exterior', position: [8.8, 2.3] },
  { id: 'solar-cell-01', itemId: 'cell', quantity: 1, location: 'exterior', position: [-15, 4.7] },
  { id: 'nutrient-sample-01', itemId: 'nutrient', quantity: 2, location: 'greenhouse', position: [-1.8, -5.5] },
]
export const availableCollectibles = (location, collectedIds) => collectibles.filter((object) => object.location === location && !collectedIds.includes(object.id))

// Nearest candidate wins. Exact ties: doors, transitions, collectibles, inspections.
// Registry order is the final stable tie breaker. Collectibles use a 1.8 m reach.
const priority = (entry) => entry.action === 'door' ? 0 : entry.action?.startsWith('exit') ? 1 : entry.action === 'collect' ? 2 : 3
export function selectCollectibleInteraction(x, z, location, collectedIds, baseInteraction) {
  const candidates = baseInteraction ? [baseInteraction] : []
  const walkable = location === 'exterior' ? canWalk : location === 'greenhouse' ? canWalkGreenhouse : null
  for (const object of availableCollectibles(location, collectedIds)) {
    const distance = Math.hypot(x - object.position[0], z - object.position[1])
    if (!Number.isFinite(distance) || distance > 1.8 || !walkable) continue
    // The path must stay in walkable space; this blocks collection through walls,
    // equipment, racks, or exterior buildings without changing inspection behavior.
    let visible = true
    const steps = Math.max(1, Math.ceil(distance / 0.04))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (!walkable(x + (object.position[0] - x) * t, z + (object.position[1] - z) * t)) { visible = false; break }
    }
    if (visible) candidates.push({ ...object, action: 'collect', name: ITEM_TYPES[object.itemId].name, prompt: `Collect ${ITEM_TYPES[object.itemId].name}` })
  }
  candidates.sort((a, b) => Math.hypot(x - a.position[0], z - a.position[1]) - Math.hypot(x - b.position[0], z - b.position[1]) || priority(a) - priority(b))
  return candidates[0] || null
}
