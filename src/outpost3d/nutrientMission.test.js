import test from 'node:test'
import assert from 'node:assert/strict'
import { MISSION_ID, SOLAR_MISSION_ID, NUTRIENT_MISSION_ID, MISSIONS, createExplorationSession, explorationReducer as reduce, getMissionProgress, canRepairSystem, missingRepairItems } from './missions.js'
import { addItem, removeItem, ownsItem } from './inventory.js'
import { collectibles, availableCollectibles, selectCollectibleInteraction } from './collectibles.js'
import { canWalkGreenhouse, selectGreenhouseInteraction } from './greenhouse.js'
import { createDoorState } from './interior.js'

const sample = collectibles.find((entry) => entry.itemId === 'nutrient')
const context = { location: 'greenhouse', consoleId: 'nutrients', x: -1.8, z: -7 }
const active = () => reduce(createExplorationSession(), { type: 'start' })
const enter = (state, location) => reduce(state, { type: 'scene-entered', location })
const pickup = (state, itemId) => reduce(state, { type: 'collect', id: collectibles.find((entry) => entry.itemId === itemId).id })
const inspect = (state) => reduce(state, { type: 'inspect', context })
function ready(state = active()) {
  state = enter(state, 'greenhouse')
  state = pickup(state, 'nutrient')
  state = reduce(state, { type: 'position', x: context.x, z: context.z })
  return inspect(state)
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

test('Mission 03 initializes independently and tracker reads do not award progress', () => {
  const state = freeze(createExplorationSession())
  assert.equal(state.missions[NUTRIENT_MISSION_ID].status, 'not-started')
  assert.equal(getMissionProgress(state.missions[NUTRIENT_MISSION_ID]).length, 5)
  assert.deepEqual(state.missions[NUTRIENT_MISSION_ID].completedObjectives, [])
  assert.strictEqual(reduce(state, { type: 'open-tracker' }), state)
  assert.deepEqual(MISSIONS[NUTRIENT_MISSION_ID].requirements, [{ itemId: 'nutrient', quantity: 2, consumed: true }])
})

test('the reachable existing sample bundle stacks two samples and cannot be collected twice', () => {
  assert.equal(sample.quantity, 2)
  assert.equal(canWalkGreenhouse(...sample.position), true)
  assert.equal(selectCollectibleInteraction(...sample.position, 'greenhouse', [], selectGreenhouseInteraction(...sample.position)).id, sample.id)
  const state = pickup(enter(active(), 'greenhouse'), 'nutrient')
  assert.ok(state.inventory.some((slot) => slot?.itemId === 'nutrient' && slot.quantity === 2))
  assert.equal(state.missions[NUTRIENT_MISSION_ID].completedObjectives.includes('nutrient'), true)
  assert.strictEqual(pickup(state, 'nutrient'), state)
  assert.equal(availableCollectibles('greenhouse', state.collectedIds).length, 0)
})

test('already-owned two samples count on start, but one sample does not satisfy the quantity objective', () => {
  for (const count of [1, 2]) {
    let state = createExplorationSession()
    state = { ...state, inventory: addItem(state.inventory, 'nutrient', count).inventory }
    state = reduce(state, { type: 'start' })
    assert.equal(state.missions[NUTRIENT_MISSION_ID].completedObjectives.includes('nutrient'), count === 2)
  }
})

test('greenhouse entry, station arrival and inspection are recorded separately', () => {
  let state = active()
  assert.strictEqual(reduce(state, { type: 'position', x: context.x, z: context.z }), state)
  assert.strictEqual(inspect(state), state)
  state = enter(state, 'greenhouse')
  assert.deepEqual(state.missions[NUTRIENT_MISSION_ID].completedObjectives, ['greenhouse'])
  state = reduce(state, { type: 'position', x: context.x, z: context.z })
  assert.deepEqual(state.missions[NUTRIENT_MISSION_ID].completedObjectives, ['greenhouse', 'station'])
  state = inspect(state)
  assert.deepEqual(state.missions[NUTRIENT_MISSION_ID].completedObjectives, ['greenhouse', 'station', 'inspect'])
  assert.equal(state.missions[NUTRIENT_MISSION_ID].status, 'active')
})

test('missing or partial supplies reject delivery without consuming anything', () => {
  for (const count of [0, 1]) {
    let state = enter(active(), 'greenhouse')
    if (count) state = { ...state, inventory: addItem(state.inventory, 'nutrient', count).inventory }
    state = freeze(inspect(state))
    assert.deepEqual(missingRepairItems(state.inventory, NUTRIENT_MISSION_ID), ['Nutrient Sample'])
    assert.equal(canRepairSystem(state, context, NUTRIENT_MISSION_ID), false)
    assert.strictEqual(reduce(state, { type: 'deliver-nutrients', context }), state)
  }
})

test('delivery requires prior inspection and a correct, reachable greenhouse station context', () => {
  const uninspected = pickup(enter(active(), 'greenhouse'), 'nutrient')
  assert.strictEqual(reduce(uninspected, { type: 'deliver-nutrients', context }), uninspected)
  const state = freeze(ready())
  for (const bad of [null, { ...context, consoleId: 'crop-storage' }, { ...context, location: 'interior' }, { ...context, x: 0, z: -6.8 }, { ...context, x: -4, z: -3 }, { ...context, x: NaN }, { ...context, z: 5 }]) {
    assert.equal(canRepairSystem(state, bad, NUTRIENT_MISSION_ID), false)
    assert.strictEqual(reduce(state, { type: 'deliver-nutrients', context: bad }), state)
  }
  const outside = enter(state, 'exterior')
  assert.strictEqual(reduce(outside, { type: 'deliver-nutrients', context }), outside)
})

test('delivery consumes exactly two, preserves all other items, and completes Mission 03 once', () => {
  let state = ready()
  for (const [itemId, count] of [['nutrient', 3], ['filter', 1], ['tool', 1], ['cell', 1]]) {
    state = { ...state, inventory: addItem(state.inventory, itemId, count).inventory }
  }
  freeze(state)
  const next = reduce(state, { type: 'deliver-nutrients', context })
  assert.equal(ownsItem(next.inventory, 'nutrient', 3), true)
  assert.equal(ownsItem(next.inventory, 'nutrient', 4), false)
  for (const itemId of ['filter', 'tool', 'cell']) assert.equal(ownsItem(next.inventory, itemId), true)
  assert.equal(ownsItem(state.inventory, 'nutrient', 5), true)
  assert.equal(next.missions[NUTRIENT_MISSION_ID].status, 'completed')
  assert.ok(getMissionProgress(next.missions[NUTRIENT_MISSION_ID]).every((objective) => objective.completed))
  assert.match(next.notification, /Nutrients Replenished/)
  assert.strictEqual(reduce(next, { type: 'deliver-nutrients', context }), next)
  assert.deepEqual(next.collectedIds, state.collectedIds)
})

test('single bundle is fully consumed and cannot respawn, while completed objectives survive scene changes', () => {
  let state = reduce(ready(), { type: 'deliver-nutrients', context })
  assert.equal(ownsItem(state.inventory, 'nutrient'), false)
  const completed = state.missions[NUTRIENT_MISSION_ID]
  for (const location of ['exterior', 'interior', 'exterior', 'greenhouse']) {
    state = enter(state, location)
    assert.strictEqual(state.missions[NUTRIENT_MISSION_ID], completed)
  }
  assert.strictEqual(pickup(state, 'nutrient'), state)
})

test('historical collection progress cannot bypass a later supply shortage', () => {
  const state = ready()
  const partial = { ...state, inventory: removeItem(state.inventory, 'nutrient', 1).inventory }
  assert.equal(partial.missions[NUTRIENT_MISSION_ID].completedObjectives.includes('nutrient'), true)
  assert.strictEqual(reduce(partial, { type: 'deliver-nutrients', context }), partial)
})

test('all three missions complete in any order without resetting completed states', () => {
  const finish = {
    nutrient: (state) => reduce(ready(state), { type: 'deliver-nutrients', context }),
    solar: (state) => {
      state = pickup(enter(state, 'exterior'), 'cell')
      const solarContext = { location: 'exterior', consoleId: 'solar', x: -15, z: 5 }
      state = reduce(state, { type: 'inspect', context: solarContext })
      return reduce(state, { type: 'install-cell', context: solarContext })
    },
    oxygen: (state) => {
      state = pickup(pickup(enter(state, 'exterior'), 'tool'), 'filter')
      state = enter(state, 'interior')
      const oxygenContext = { location: 'interior', consoleId: 'life-support', x: -6, z: -3, doorState: createDoorState() }
      state = reduce(state, { type: 'position', ...oxygenContext })
      return reduce(state, { type: 'repair', context: oxygenContext })
    },
  }
  const ids = { nutrient: NUTRIENT_MISSION_ID, solar: SOLAR_MISSION_ID, oxygen: MISSION_ID }
  for (const order of [['nutrient', 'solar', 'oxygen'], ['nutrient', 'oxygen', 'solar'], ['solar', 'oxygen', 'nutrient'], ['solar', 'nutrient', 'oxygen'], ['oxygen', 'solar', 'nutrient'], ['oxygen', 'nutrient', 'solar']]) {
    let state = active()
    const completed = {}
    for (const name of order) {
      state = finish[name](state)
      assert.equal(state.missions[ids[name]].status, 'completed', order.join(','))
      for (const [id, mission] of Object.entries(completed)) assert.strictEqual(state.missions[id], mission)
      completed[ids[name]] = state.missions[ids[name]]
    }
    assert.ok(Object.values(state.missions).every((mission) => mission.status === 'completed'))
    assert.equal(ownsItem(state.inventory, 'tool'), true)
    for (const itemId of ['filter', 'cell', 'nutrient']) assert.equal(ownsItem(state.inventory, itemId), false)
  }
})
