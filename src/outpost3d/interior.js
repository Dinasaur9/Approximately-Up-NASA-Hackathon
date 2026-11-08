import { canWalk, groundHeight } from './world.js'
import { selectInteraction } from './interactions.js'
import { interiorStations } from './interiorStations.js'
import { greenhouseProfile, greenhouseExteriorProfile } from './greenhouse.js'

export const INTERIOR_HEIGHT = 3.6
export const rooms = [
  { id: 'airlock', name: 'AIRLOCK / SURFACE', bounds: [-2, 2, 4, 8] },
  { id: 'corridor', name: 'CENTRAL CORRIDOR', bounds: [-2, 2, -8, 4] },
  { id: 'mission-control', name: 'MISSION CONTROL', bounds: [-4, 4, -14, -8] },
  { id: 'life-support', name: 'LIFE SUPPORT', bounds: [-9, -2, -6, 0] },
  { id: 'crew-quarters', name: 'CREW QUARTERS', bounds: [2, 9, 0, 6] },
  { id: 'research', name: 'RESEARCH LABORATORY', bounds: [2, 9, -6, 0] },
]
export const interiorRooms = rooms.map((room) => room.bounds)
export const doors = [
  { id: 'mission-door', name: 'Mission Control Door', axis: 'z', x: 0, z: -8 },
  { id: 'life-door', name: 'Life-Support Door', axis: 'x', x: -2, z: -3 },
  { id: 'crew-door', name: 'Crew Quarters Door', axis: 'x', x: 2, z: 3 },
  { id: 'research-door', name: 'Laboratory Door', axis: 'x', x: 2, z: -3 },
]
export const DOOR_WIDTH = 2.4
export const createDoorState = () => Object.fromEntries(doors.map((door) => [door.id, false]))
const inside = (x, z, [left, right, back, front]) => x >= left && x <= right && z >= back && z <= front
export const doorBounds = (door) => door.axis === 'x'
  ? [door.x - 0.1, door.x + 0.1, door.z - 1.2, door.z + 1.2]
  : [door.x - 1.2, door.x + 1.2, door.z - 0.1, door.z + 0.1]

// Walls are generated from room edges, splitting only the declared openings.
// Identical shared segments are deduplicated. Geometry uses these same bounds.
const openings = [...doors, { axis: 'z', x: 0, z: 4 }]
const wallMap = new Map()
for (const { bounds: [left, right, back, front] } of rooms) {
  for (const [axis, fixed, start, end] of [['x', left, back, front], ['x', right, back, front], ['z', back, left, right], ['z', front, left, right]]) {
    const cuts = openings.filter((door) => door.axis === axis && (axis === 'x' ? door.x : door.z) === fixed)
      .map((door) => [(axis === 'x' ? door.z : door.x) - 1.2, (axis === 'x' ? door.z : door.x) + 1.2])
    // Unit-independent splitting also handles partially shared room boundaries.
    const points = [...new Set([start, end, ...cuts.flat().filter((v) => v > start && v < end)])].sort((a, b) => a - b)
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], mid = (a + b) / 2
      if (cuts.some(([lo, hi]) => mid > lo && mid < hi)) continue
      const bounds = axis === 'x' ? [fixed - 0.1, fixed + 0.1, a, b] : [a, b, fixed - 0.1, fixed + 0.1]
      wallMap.set(bounds.join(','), bounds)
    }
  }
}
export const interiorWalls = [...wallMap.values()]
export const interiorEquipment = [
  [-2.8, 2.8, -13.8, -12], // Mission desks
  [3.05, 3.55, -13.5, -12.5], // Communications rack
  [-8.7, -7, -5.5, -0.5], // Life support machinery
  [7, 8.7, 0.6, 5.4], // Bunks and lockers
  [7, 8.7, -5.5, -0.5], // Research benches
]
function overlaps(x, z, bounds, radius = 0.45) {
  return inside(x, z, [bounds[0] - radius, bounds[1] + radius, bounds[2] - radius, bounds[3] + radius])
}
export function canWalkInterior(x, z, doorState = createDoorState()) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false
  if (!rooms.some((room) => inside(x, z, room.bounds))) return false
  const obstacles = [...interiorWalls, ...interiorEquipment, ...doors.filter((door) => !doorState[door.id]).map(doorBounds)]
  return !obstacles.some((bounds) => overlaps(x, z, bounds))
}
export function toggleDoor(state, id, x, z) {
  const door = doors.find((entry) => entry.id === id)
  if (!door || !Number.isFinite(x) || !Number.isFinite(z) || Math.hypot(x - door.x, z - door.z) > 2.4) return state
  // Wider safety margin prevents closing on a player approaching the threshold.
  if (state[id] && overlaps(x, z, doorBounds(door), 0.65)) return state
  return { ...state, [id]: !state[id] }
}
export const interiorInteractions = [{
  id: 'habitat-exit', name: 'Exterior Airlock', action: 'exit', room: 'airlock',
  prompt: 'Exit to Lunar Surface', position: [0, 7],
}, ...interiorStations]
export function selectInteriorInteraction(x, z, state) {
  const candidates = [
    ...doors.map((door) => ({ ...door, action: 'door', position: [door.x, door.z], prompt: `${state[door.id] ? 'Close' : 'Open'} ${door.name}` })),
    ...interiorInteractions,
  ].filter((entry) => {
    const distance = Math.hypot(x - entry.position[0], z - entry.position[1])
    if (distance > (entry.action === 'door' ? 2.4 : 3)) return false
    if (entry.room && !inside(x, z, rooms.find((room) => room.id === entry.room).bounds)) return false
    const blockers = [...interiorWalls, ...doors.filter((door) => door.id !== entry.id && !state[door.id]).map(doorBounds)]
    // Segment samples are closer than the thinnest wall, including endpoints.
    const steps = Math.max(1, Math.ceil(distance / 0.04))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      if (blockers.some((bounds) => inside(x + (entry.position[0] - x) * t, z + (entry.position[1] - z) * t, bounds))) return false
    }
    return true
  })
  return selectInteraction(x, z, candidates)
}

// These profiles configure one shared controller; they do not create a new one.
export const sceneProfiles = {
  initial: { canWalk, groundHeight, spawn: [0, 16], lookAt: [0, 2, -8] },
  exterior: { canWalk, groundHeight, spawn: [0, 2.5], lookAt: [0, 1.7, 12] },
  interior: { canWalk: canWalkInterior, groundHeight: () => 0, spawn: [0, 5], lookAt: [0, 1.7, -8] },
  greenhouse: greenhouseProfile,
  greenhouseExterior: greenhouseExteriorProfile,
}

export function transitionDestination(location, action) {
  if (location === 'exterior' && action === 'enter') return 'interior'
  if (location === 'interior' && action === 'exit') return 'exterior'
  if (location === 'exterior' && action === 'enter-greenhouse') return 'greenhouse'
  if (location === 'greenhouse' && action === 'exit-greenhouse') return 'exterior'
  return null
}
