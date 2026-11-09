import { createInventorySession, collectItem, ownsItem, removeItem, ITEM_TYPES } from './inventory.js'
import { canWalk } from './world.js'
import { interactables, selectExteriorInteraction } from './interactions.js'
import { spacecraftInspections, atSpacecraft } from './spacecraft.js'
import { collectibles } from './collectibles.js'
import { rooms, canWalkInterior, selectInteriorInteraction } from './interior.js'
import { selectGreenhouseInteraction } from './greenhouse.js'

export const MISSION_ID = 'restore-oxygen-filtration'
export const SOLAR_MISSION_ID = 'restore-solar-power'
export const NUTRIENT_MISSION_ID = 'greenhouse-nutrient-delivery'
export const SPACECRAFT_MISSION_ID = 'post-landing-spacecraft-inspection'
export const MISSIONS = {
  [MISSION_ID]: {
    id: MISSION_ID, title: 'Mission 01 — Restore Oxygen Filtration',
    description: 'Recover a Repair Tool and Replacement Oxygen Filter outside, enter the habitat, and restore the filtration equipment at the Life-Support Console. This training repair does not change resource-model oxygen or time.',
    prerequisites: ['habitat', 'life-support'],
    completionEvents: ['repair'],
    completionMessage: 'Mission complete — Oxygen filtration is Operational. One filter installed; Repair Tool retained. Resource simulation unchanged.',
    requirements: [{ itemId: 'tool', quantity: 1, consumed: false }, { itemId: 'filter', quantity: 1, consumed: true }],
    objectives: [
      { id: 'tool', itemId: 'tool', label: 'Obtain a Repair Tool' },
      { id: 'filter', itemId: 'filter', label: 'Obtain a Replacement Oxygen Filter' },
      { id: 'habitat', label: 'Enter the lunar habitat' },
      { id: 'life-support', label: 'Reach the Life-Support compartment' },
      { id: 'repair', label: 'Repair the oxygen filtration system' },
    ],
  },
  [SOLAR_MISSION_ID]: {
    id: SOLAR_MISSION_ID, title: 'Mission 02 — Restore Solar Power',
    description: 'Recover the Spare Power Cell, reach the exterior solar station, inspect its control unit, and install the cell. This maintenance exercise does not change resource-model power or time.',
    requirements: [{ itemId: 'cell', quantity: 1, consumed: true }],
    prerequisites: ['station', 'inspect'], completionEvents: ['install', 'maintenance'],
    completionMessage: 'Mission complete — Solar power equipment is Operational. One Spare Power Cell installed. Resource battery, generation and time unchanged.',
    objectives: [
      { id: 'cell', itemId: 'cell', label: 'Obtain the Spare Power Cell' },
      { id: 'station', label: 'Reach the exterior solar power station' },
      { id: 'inspect', label: 'Inspect the solar power control unit' },
      { id: 'install', label: 'Install the Spare Power Cell' },
      { id: 'maintenance', label: 'Complete the solar power maintenance task' },
    ],
  },
  [NUTRIENT_MISSION_ID]: {
    id: NUTRIENT_MISSION_ID, title: 'Mission 03 — Greenhouse Nutrient Delivery',
    description: 'Collect two Nutrient Samples, enter the greenhouse, inspect the Water and Nutrient Station, and deliver the samples. Delivery updates mission state only, without changing food production, battery energy, or simulation time.',
    requirements: [{ itemId: 'nutrient', quantity: 2, consumed: true }],
    prerequisites: ['greenhouse', 'station', 'inspect'], completionEvents: ['deliver'],
    completionMessage: 'Mission complete — Nutrients Replenished. Exactly two Nutrient Samples delivered. Resource food production, battery and time unchanged.',
    objectives: [
      { id: 'nutrient', itemId: 'nutrient', quantity: 2, label: 'Obtain two Nutrient Samples' },
      { id: 'greenhouse', label: 'Enter the greenhouse' },
      { id: 'station', label: 'Reach the Water and Nutrient Station' },
      { id: 'inspect', label: 'Inspect the nutrient delivery equipment' },
      { id: 'deliver', label: 'Deliver two Nutrient Samples' },
    ],
  },
  [SPACECRAFT_MISSION_ID]: {
    id: SPACECRAFT_MISSION_ID, title: 'Mission 04 — Post-Landing Spacecraft Inspection',
    description: 'Visit the parked spacecraft, record landing gear, propulsion and communications inspections in any order, then submit the checklist at the main spacecraft inspection point. No inventory items are required.',
    requirements: [], prerequisites: ['spacecraft', 'gear', 'propulsion', 'communications'], completionEvents: ['submit'],
    completionMessage: 'Mission complete — Spacecraft Checklist Submitted. All three post-landing inspections recorded. Inventory and resource simulation unchanged.',
    objectives: [
      { id: 'spacecraft', label: 'Reach the landed spacecraft' },
      { id: 'gear', label: 'Record landing gear inspection' },
      { id: 'propulsion', label: 'Record propulsion assembly inspection' },
      { id: 'communications', label: 'Record communications system inspection' },
      { id: 'submit', label: 'Submit the completed inspection checklist' },
    ],
  },
}
export function createMissionState(id = MISSION_ID) {
  if (!MISSIONS[id]) throw new RangeError('Unknown mission ID.')
  return { id, status: 'not-started', completedObjectives: [] }
}
export const createExplorationSession = () => ({ ...createInventorySession(),
  missions: Object.fromEntries(Object.keys(MISSIONS).map((id) => [id, createMissionState(id)])), currentLocation: 'exterior' })
export function getMissionProgress(mission) {
  const definition = MISSIONS[mission.id]
  return definition.objectives.map((objective) => ({ ...objective, completed: mission.completedObjectives.includes(objective.id) }))
}
function progress(mission, inventory, events = []) {
  if (mission.status !== 'active') return mission
  const completed = new Set(mission.completedObjectives)
  for (const objective of MISSIONS[mission.id].objectives) {
    if (objective.itemId && ownsItem(inventory, objective.itemId, objective.quantity || 1)) completed.add(objective.id)
  }
  events.forEach((id) => completed.add(id))
  const completedObjectives = MISSIONS[mission.id].objectives.filter((o) => completed.has(o.id)).map((o) => o.id)
  if (completedObjectives.join(',') === mission.completedObjectives.join(',')) return mission
  return { ...mission, completedObjectives, status: completedObjectives.length === MISSIONS[mission.id].objectives.length ? 'completed' : 'active' }
}
function update(state, next, events = {}) {
  const missions = Object.fromEntries(Object.entries(next.missions).map(([id, mission]) => [id, progress(mission, next.inventory, events[id] || [])]))
  const messages = []
  for (const [id, mission] of Object.entries(missions)) {
    const previous = state.missions[id]
    if (mission.status === 'completed' && previous.status !== 'completed') messages.push(MISSIONS[id].completionMessage)
    else {
      const added = MISSIONS[id].objectives.filter((o) => mission.completedObjectives.includes(o.id) && !previous.completedObjectives.includes(o.id))
      if (added.length) messages.push(`${MISSIONS[id].title}: Objective updated: ${added.map((o) => o.label).join('; ')}.`)
    }
  }
  if (next === state && Object.keys(missions).every((id) => missions[id] === state.missions[id])) return state
  const notices = [next.notification !== state.notification ? next.notification : '', ...messages].filter(Boolean)
  return { ...next, missions, notification: messages.length ? notices.join(' ') : next.notification }
}

export function atSolarStation(x, z) {
  const station = interactables.find((entry) => entry.id === 'solar')
  const distance = Math.hypot(x - station.position[0], z - station.position[1])
  if (!Number.isFinite(distance) || distance > 3) return false
  const steps = Math.max(1, Math.ceil(distance / 0.04))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (!canWalk(x + (station.position[0] - x) * t, z + (station.position[1] - z) * t)) return false
  }
  return true
}

export function getInteriorRoom(x, z, doorState) {
  if (!canWalkInterior(x, z, doorState)) return null
  return rooms.find(({ bounds: [left, right, back, front] }) => x >= left && x <= right && z >= back && z <= front)?.id || null
}
export function atNutrientStation(x, z) {
  return selectGreenhouseInteraction(x, z)?.id === 'nutrients'
}
export function missingRepairItems(inventory, id = MISSION_ID) {
  return MISSIONS[id].requirements.filter((r) => !ownsItem(inventory, r.itemId, r.quantity)).map((r) => ITEM_TYPES[r.itemId].name)
}
function validConsole(state, context, id) {
  if (id === NUTRIENT_MISSION_ID) return state.currentLocation === 'greenhouse' && context?.location === 'greenhouse' && context.consoleId === 'nutrients' && atNutrientStation(context.x, context.z)
  if (id === SOLAR_MISSION_ID) return state.currentLocation === 'exterior' && context?.location === 'exterior' && context.consoleId === 'solar' && atSolarStation(context.x, context.z)
  return state.currentLocation === 'interior' && context?.location === 'interior' && context.consoleId === 'life-support' &&
    getInteriorRoom(context.x, context.z, context.doorState) === 'life-support' && selectInteriorInteraction(context.x, context.z, context.doorState)?.id === 'life-support'
}
export function canRepairSystem(state, context, id = MISSION_ID) {
  const mission = state.missions[id], definition = MISSIONS[id]
  return mission?.status === 'active' && validConsole(state, context, id) &&
    definition.prerequisites.every((objective) => mission.completedObjectives.includes(objective)) && missingRepairItems(state.inventory, id).length === 0
}
export function validSpacecraftContext(state, context, id) {
  return state.currentLocation === 'exterior' && context?.location === 'exterior' && context.consoleId === id &&
    selectExteriorInteraction(context.x, context.z)?.id === id
}
export function canRecordInspection(state, context) {
  return state.missions[SPACECRAFT_MISSION_ID].status === 'active' &&
    spacecraftInspections.some((entry) => entry.id === context?.consoleId &&
      !state.missions[SPACECRAFT_MISSION_ID].completedObjectives.includes(entry.objectiveId) && validSpacecraftContext(state, context, entry.id))
}
export function canSubmitChecklist(state, context) {
  const mission = state.missions[SPACECRAFT_MISSION_ID]
  return mission.status === 'active' && validSpacecraftContext(state, context, 'lander') &&
    MISSIONS[SPACECRAFT_MISSION_ID].prerequisites.every((id) => mission.completedObjectives.includes(id))
}
function maintain(state, context, id) {
  if (!canRepairSystem(state, context, id)) return state
  let inventory = state.inventory
  for (const requirement of MISSIONS[id].requirements.filter((r) => r.consumed)) {
    const result = removeItem(inventory, requirement.itemId, requirement.quantity)
    if (!result.ok) return state
    inventory = result.inventory
  }
  // Record acquired-item objectives before consuming their items.
  const mission = progress(state.missions[id], state.inventory, MISSIONS[id].completionEvents)
  return update(state, { ...state, inventory, missions: { ...state.missions, [id]: mission } })
}

/** One pure reducer owns shared inventory and independent per-mission progress. */
export function explorationReducer(state, event) {
  switch (event.type) {
    case 'start': {
      if (Object.values(state.missions).every((mission) => mission.status !== 'not-started')) return state
      const missions = Object.fromEntries(Object.entries(state.missions).map(([id, mission]) => [id, mission.status === 'not-started' ? { ...mission, status: 'active' } : mission]))
      return update(state, { ...state, missions, notification: 'Missions active — press M to review objectives.' })
    }
    case 'collect': {
      const object = collectibles.find((entry) => entry.id === event.id && entry.location === state.currentLocation)
      if (!object) return state
      const collection = collectItem(state, object)
      if (collection === state) return state
      return update(state, { ...state, ...collection })
    }
    case 'scene-entered': {
      if (!['exterior', 'interior', 'greenhouse'].includes(event.location)) return state
      return update(state, { ...state, currentLocation: event.location }, event.location === 'interior' ? { [MISSION_ID]: ['habitat'] } : event.location === 'greenhouse' ? { [NUTRIENT_MISSION_ID]: ['greenhouse'] } : {})
    }
    case 'position': {
      if (state.currentLocation === 'exterior' && atSpacecraft(event.x, event.z)) return update(state, state, { [SPACECRAFT_MISSION_ID]: ['spacecraft'] })
      if (state.currentLocation === 'greenhouse' && atNutrientStation(event.x, event.z)) return update(state, state, { [NUTRIENT_MISSION_ID]: ['station'] })
      if (state.currentLocation === 'exterior' && atSolarStation(event.x, event.z)) return update(state, state, { [SOLAR_MISSION_ID]: ['station'] })
      if (state.currentLocation === 'interior' && getInteriorRoom(event.x, event.z, event.doorState) === 'life-support') return update(state, state, { [MISSION_ID]: ['life-support'] })
      return state
    }
    case 'inspect': {
      if (state.currentLocation === 'exterior' && ['lander', ...spacecraftInspections.map((entry) => entry.id)].some((id) => validSpacecraftContext(state, event.context, id))) return update(state, state, { [SPACECRAFT_MISSION_ID]: ['spacecraft'] })
      if (validConsole(state, event.context, NUTRIENT_MISSION_ID)) return update(state, state, { [NUTRIENT_MISSION_ID]: ['station', 'inspect'] })
      if (!validConsole(state, event.context, SOLAR_MISSION_ID)) return state
      return update(state, state, { [SOLAR_MISSION_ID]: ['station', 'inspect'] })
    }
    case 'repair': return maintain(state, event.context, MISSION_ID)
    case 'install-cell': return maintain(state, event.context, SOLAR_MISSION_ID)
    case 'deliver-nutrients': return maintain(state, event.context, NUTRIENT_MISSION_ID)
    case 'record-inspection': {
      if (!canRecordInspection(state, event.context)) return state
      const entry = spacecraftInspections.find((item) => item.id === event.context.consoleId)
      return update(state, state, { [SPACECRAFT_MISSION_ID]: ['spacecraft', entry.objectiveId] })
    }
    case 'submit-checklist': {
      if (!canSubmitChecklist(state, event.context)) return state
      return update(state, state, { [SPACECRAFT_MISSION_ID]: ['submit'] })
    }
    case 'dismiss-notification': return { ...state, notification: '' }
    default: return state
  }
}
