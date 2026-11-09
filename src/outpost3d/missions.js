import { createInventorySession, collectItem, ownsItem, removeItem, ITEM_TYPES } from './inventory.js'
import { collectibles } from './collectibles.js'
import { rooms, canWalkInterior, selectInteriorInteraction } from './interior.js'

export const MISSION_ID = 'restore-oxygen-filtration'
export const MISSIONS = {
  [MISSION_ID]: {
    id: MISSION_ID, title: 'Mission 01 — Restore Oxygen Filtration',
    description: 'Recover a Repair Tool and Replacement Oxygen Filter outside, enter the habitat, and restore the filtration equipment at the Life-Support Console. This training repair does not change resource-model oxygen or time.',
    requirements: [{ itemId: 'tool', quantity: 1, consumed: false }, { itemId: 'filter', quantity: 1, consumed: true }],
    objectives: [
      { id: 'tool', label: 'Obtain a Repair Tool' },
      { id: 'filter', label: 'Obtain a Replacement Oxygen Filter' },
      { id: 'habitat', label: 'Enter the lunar habitat' },
      { id: 'life-support', label: 'Reach the Life-Support compartment' },
      { id: 'repair', label: 'Repair the oxygen filtration system' },
    ],
  },
}
export function createMissionState(id = MISSION_ID) {
  if (!MISSIONS[id]) throw new RangeError('Unknown mission ID.')
  return { id, status: 'not-started', completedObjectives: [] }
}
export const createExplorationSession = () => ({ ...createInventorySession(), mission: createMissionState(), currentLocation: 'exterior' })
export function getMissionProgress(mission) {
  const definition = MISSIONS[mission.id]
  return definition.objectives.map((objective) => ({ ...objective, completed: mission.completedObjectives.includes(objective.id) }))
}
function progress(mission, inventory, events = []) {
  if (mission.status !== 'active') return mission
  const completed = new Set(mission.completedObjectives)
  for (const itemId of ['tool', 'filter']) if (ownsItem(inventory, itemId)) completed.add(itemId)
  events.forEach((id) => completed.add(id))
  const completedObjectives = MISSIONS[mission.id].objectives.filter((o) => completed.has(o.id)).map((o) => o.id)
  return { ...mission, completedObjectives, status: completedObjectives.length === MISSIONS[mission.id].objectives.length ? 'completed' : 'active' }
}
function update(state, next) {
  const added = next.mission.completedObjectives.filter((id) => !state.mission.completedObjectives.includes(id))
  if (next.mission.status === 'completed' && state.mission.status !== 'completed') {
    return { ...next, notification: 'Mission complete — Oxygen filtration is Operational. One filter installed; Repair Tool retained. Resource simulation unchanged.' }
  }
  if (!added.length) return next
  const labels = MISSIONS[next.mission.id].objectives.filter((o) => added.includes(o.id)).map((o) => o.label)
  return { ...next, notification: `${next.notification ? `${next.notification} ` : ''}Objective updated: ${labels.join('; ')}.` }
}

export function getInteriorRoom(x, z, doorState) {
  if (!canWalkInterior(x, z, doorState)) return null
  return rooms.find(({ bounds: [left, right, back, front] }) => x >= left && x <= right && z >= back && z <= front)?.id || null
}
export function missingRepairItems(inventory) {
  return MISSIONS[MISSION_ID].requirements.filter((r) => !ownsItem(inventory, r.itemId, r.quantity)).map((r) => ITEM_TYPES[r.itemId].name)
}
export function canRepairSystem(state, context) {
  return state.mission.status === 'active' && state.currentLocation === 'interior' &&
    context?.location === 'interior' && context.consoleId === 'life-support' &&
    getInteriorRoom(context.x, context.z, context.doorState) === 'life-support' &&
    selectInteriorInteraction(context.x, context.z, context.doorState)?.id === 'life-support' &&
    state.mission.completedObjectives.includes('habitat') && state.mission.completedObjectives.includes('life-support') &&
    missingRepairItems(state.inventory).length === 0
}

/** One pure reducer owns inventory, world collection IDs, and mission progress. */
export function explorationReducer(state, event) {
  switch (event.type) {
    case 'start': {
      if (state.mission.status !== 'not-started') return state
      const mission = progress({ ...state.mission, status: 'active' }, state.inventory)
      return update(state, { ...state, mission, notification: 'Mission active — press M to review objectives.' })
    }
    case 'collect': {
      const object = collectibles.find((entry) => entry.id === event.id && entry.location === state.currentLocation)
      if (!object) return state
      const collection = collectItem(state, object)
      if (collection === state) return state
      const next = { ...state, ...collection }
      next.mission = progress(state.mission, next.inventory)
      return update(state, next)
    }
    case 'scene-entered': {
      if (!['exterior', 'interior', 'greenhouse'].includes(event.location)) return state
      return update(state, { ...state, currentLocation: event.location,
        mission: progress(state.mission, state.inventory, event.location === 'interior' ? ['habitat'] : []) })
    }
    case 'position': {
      if (state.currentLocation !== 'interior' || state.mission.status !== 'active' || state.mission.completedObjectives.includes('life-support')) return state
      if (getInteriorRoom(event.x, event.z, event.doorState) !== 'life-support') return state
      return update(state, { ...state, mission: progress(state.mission, state.inventory, ['life-support']) })
    }
    case 'repair': {
      if (!canRepairSystem(state, event.context)) return state
      const result = removeItem(state.inventory, 'filter', 1)
      if (!result.ok) return state
      return update(state, { ...state, inventory: result.inventory,
        mission: progress(state.mission, state.inventory, ['repair']) })
    }
    case 'dismiss-notification': return { ...state, notification: '' }
    default: return state
  }
}
