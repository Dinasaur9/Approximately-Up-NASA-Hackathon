import test from 'node:test'
import assert from 'node:assert/strict'
import { MISSION_ID, SOLAR_MISSION_ID, NUTRIENT_MISSION_ID, SPACECRAFT_MISSION_ID, MISSIONS, createExplorationSession, explorationReducer as reduce, getMissionProgress, canRecordInspection, canSubmitChecklist } from './missions.js'
import { spacecraftInspections, spacecraftMainPoint, atSpacecraft } from './spacecraft.js'
import { selectExteriorInteraction, interactables } from './interactions.js'
import { selectCollectibleInteraction } from './collectibles.js'
import { canWalk } from './world.js'
import { addItem } from './inventory.js'

const active = () => reduce(createExplorationSession(), { type: 'start' })
const contextFor = (entry) => ({ location: 'exterior', consoleId: entry.id, x: entry.position[0], z: entry.position[1] })
const main = { location: 'exterior', consoleId: 'lander', x: spacecraftMainPoint[0], z: spacecraftMainPoint[1] }
const record = (state, entry) => reduce(state, { type: 'record-inspection', context: contextFor(entry) })
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

test('Mission 04 initializes with five independent objectives and no item requirements', () => {
  const state = createExplorationSession()
  assert.equal(Object.keys(state.missions).length, 4)
  assert.equal(state.missions[SPACECRAFT_MISSION_ID].status, 'not-started')
  assert.deepEqual(MISSIONS[SPACECRAFT_MISSION_ID].requirements, [])
  assert.equal(getMissionProgress(state.missions[SPACECRAFT_MISSION_ID]).length, 5)
  assert.strictEqual(reduce(state, { type: 'open-tracker' }), state)
  assert.equal(canRecordInspection(state, contextFor(spacecraftInspections[0])), false)
})

test('main description stays available and all component points are walkable and uniquely selected', () => {
  assert.match(interactables.find((entry) => entry.id === 'lander').description, /This spacecraft is parked/)
  for (const entry of [...spacecraftInspections, { id: 'lander', position: spacecraftMainPoint }]) {
    assert.equal(canWalk(...entry.position), true, entry.id)
    assert.equal(selectExteriorInteraction(...entry.position)?.id, entry.id)
    assert.equal(selectCollectibleInteraction(...entry.position, 'exterior', [], selectExteriorInteraction(...entry.position))?.id, entry.id)
  }
  assert.equal(selectExteriorInteraction(25, -10), null)
})

test('each point is reachable from spawn around the unchanged building footprints', () => {
  const queue = [[0, 16]], visited = new Set(['0,16'])
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i]
    for (const [dx, dz] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) {
      const nx = x + dx, nz = z + dz, key = `${nx},${nz}`
      if (nx < -2 || nx > 36 || nz < -20 || nz > 17 || visited.has(key) || !canWalk(nx, nz)) continue
      visited.add(key); queue.push([nx, nz])
    }
  }
  for (const entry of [...spacecraftInspections, { id: 'lander', position: spacecraftMainPoint }]) assert.ok(visited.has(entry.position.join(',')), entry.id)
})

test('arrival records only reach; opening component panels does not record inspections', () => {
  let state = active()
  assert.equal(atSpacecraft(0, 16), false)
  assert.strictEqual(reduce(state, { type: 'position', x: 0, z: 16 }), state)
  state = reduce(state, { type: 'position', x: main.x, z: main.z })
  assert.deepEqual(state.missions[SPACECRAFT_MISSION_ID].completedObjectives, ['spacecraft'])
  for (const entry of spacecraftInspections) state = reduce(state, { type: 'inspect', context: contextFor(entry) })
  assert.deepEqual(state.missions[SPACECRAFT_MISSION_ID].completedObjectives, ['spacecraft'])
})

test('records require the correct component, scene, range and clear approach', () => {
  const state = freeze(active())
  for (const bad of [null, main, { ...contextFor(spacecraftInspections[0]), location: 'interior' }, { ...contextFor(spacecraftInspections[0]), x: 25, z: -10 }, { ...contextFor(spacecraftInspections[0]), x: 0, z: 0 }, { ...contextFor(spacecraftInspections[0]), x: NaN }]) {
    assert.equal(canRecordInspection(state, bad), false)
    assert.strictEqual(reduce(state, { type: 'record-inspection', context: bad }), state)
  }
  const inside = reduce(state, { type: 'scene-entered', location: 'interior' })
  assert.strictEqual(record(inside, spacecraftInspections[0]), inside)
})

test('all six inspection orders work; records are idempotent and require separate submission', () => {
  const [gear, propulsion, communications] = spacecraftInspections
  const orders = [[gear, propulsion, communications], [gear, communications, propulsion], [propulsion, gear, communications], [propulsion, communications, gear], [communications, gear, propulsion], [communications, propulsion, gear]]
  for (const order of orders) {
    let state = active()
    const inventory = state.inventory
    for (const entry of order) {
      assert.equal(canSubmitChecklist(state, main), false)
      assert.strictEqual(reduce(state, { type: 'submit-checklist', context: main }), state)
      assert.equal(canRecordInspection(state, contextFor(entry)), true)
      state = record(state, entry)
      assert.equal(state.missions[SPACECRAFT_MISSION_ID].completedObjectives.includes(entry.objectiveId), true)
      assert.strictEqual(record(state, entry), state)
    }
    assert.equal(state.missions[SPACECRAFT_MISSION_ID].status, 'active')
    assert.equal(canSubmitChecklist(state, main), true)
    const next = reduce(freeze(state), { type: 'submit-checklist', context: main })
    assert.equal(next.missions[SPACECRAFT_MISSION_ID].status, 'completed')
    assert.ok(getMissionProgress(next.missions[SPACECRAFT_MISSION_ID]).every((objective) => objective.completed))
    assert.match(next.notification, /Checklist Submitted/)
    assert.strictEqual(next.inventory, inventory)
    assert.strictEqual(reduce(next, { type: 'submit-checklist', context: main }), next)
    assert.strictEqual(record(next, gear), next)
  }
})

test('checklist can only be submitted at the main point; progress persists through other scenes', () => {
  let state = spacecraftInspections.reduce(record, active())
  for (const bad of [null, contextFor(spacecraftInspections[0]), { ...main, x: 0 }, { ...main, location: 'greenhouse' }]) {
    assert.equal(canSubmitChecklist(state, bad), false)
    assert.strictEqual(reduce(state, { type: 'submit-checklist', context: bad }), state)
  }
  const progress = state.missions[SPACECRAFT_MISSION_ID]
  for (const location of ['greenhouse', 'exterior', 'interior', 'exterior']) {
    state = reduce(state, { type: 'scene-entered', location })
    assert.strictEqual(state.missions[SPACECRAFT_MISSION_ID], progress)
  }
  assert.equal(canSubmitChecklist(state, main), true)
})

test('Mission 04 preserves other completed mission states, inventory, and world collection IDs', () => {
  let state = active()
  state = { ...state, inventory: addItem(state.inventory, 'tool').inventory,
    missions: Object.fromEntries(Object.entries(state.missions).map(([id, mission]) => [id, id === SPACECRAFT_MISSION_ID ? mission : { ...mission, status: 'completed', completedObjectives: MISSIONS[id].objectives.map((objective) => objective.id) }])) }
  const before = freeze(state)
  state = spacecraftInspections.reduce(record, state)
  state = reduce(state, { type: 'submit-checklist', context: main })
  for (const id of [MISSION_ID, SOLAR_MISSION_ID, NUTRIENT_MISSION_ID]) assert.strictEqual(state.missions[id], before.missions[id])
  assert.strictEqual(state.inventory, before.inventory)
  assert.strictEqual(state.collectedIds, before.collectedIds)
})
