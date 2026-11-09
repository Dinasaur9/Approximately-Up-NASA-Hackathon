import test from 'node:test'
import assert from 'node:assert/strict'
import { MISSION_ID, SOLAR_MISSION_ID, NUTRIENT_MISSION_ID, MISSIONS, createExplorationSession, explorationReducer as reduce, getMissionProgress, canRepairSystem, atSolarStation } from './missions.js'
import { collectibles, availableCollectibles } from './collectibles.js'
import { ownsItem, addItem } from './inventory.js'
import { createDoorState } from './interior.js'

const cell = collectibles.find((object) => object.itemId === 'cell')
const context = { location: 'exterior', consoleId: 'solar', x: -15, z: 5 }
const active = () => reduce(createExplorationSession(), { type: 'start' })
const pickup = (state, itemId) => reduce(state, { type: 'collect', id: collectibles.find((object) => object.itemId === itemId).id })
const inspect = (state) => reduce(state, { type: 'inspect', context })
function solarReady(state = active()) {
  state = reduce(state, { type: 'scene-entered', location: 'exterior' })
  state = pickup(state, 'cell')
  state = reduce(state, { type: 'position', x: -15, z: 5 })
  return inspect(state)
}
function oxygenComplete(state) {
  state = reduce(state, { type: 'scene-entered', location: 'exterior' })
  state = pickup(pickup(state, 'tool'), 'filter')
  state = reduce(state, { type: 'scene-entered', location: 'interior' })
  const oxygenContext = { location: 'interior', consoleId: 'life-support', x: -6, z: -3, doorState: createDoorState() }
  state = reduce(state, { type: 'position', ...oxygenContext })
  return reduce(state, { type: 'repair', context: oxygenContext })
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

test('both missions initialize independently and starting recognizes an already collected cell', () => {
  let state = createExplorationSession()
  assert.deepEqual(Object.keys(state.missions), [MISSION_ID, SOLAR_MISSION_ID, NUTRIENT_MISSION_ID])
  assert.ok(Object.values(state.missions).every((mission) => mission.status === 'not-started'))
  state = pickup(state, 'cell')
  state = reduce(state, { type: 'start' })
  assert.deepEqual(state.missions[SOLAR_MISSION_ID].completedObjectives, ['cell'])
  assert.deepEqual(state.missions[MISSION_ID].completedObjectives, [])
  assert.equal(getMissionProgress(state.missions[SOLAR_MISSION_ID]).length, 5)
  assert.equal(MISSIONS[SOLAR_MISSION_ID].requirements[0].itemId, 'cell')
})

test('arrival and inspection are separate actual events; tracker reads do not award them', () => {
  let state = active()
  assert.strictEqual(reduce(state, { type: 'open-tracker' }), state)
  state = reduce(state, { type: 'position', x: -15, z: 5 })
  assert.deepEqual(state.missions[SOLAR_MISSION_ID].completedObjectives, ['station'])
  state = inspect(state)
  assert.deepEqual(state.missions[SOLAR_MISSION_ID].completedObjectives, ['station', 'inspect'])
  assert.equal(canRepairSystem(state, context, SOLAR_MISSION_ID), false)
  assert.strictEqual(reduce(state, { type: 'install-cell', context }), state)
  state = pickup(state, 'cell')
  assert.equal(canRepairSystem(state, context, SOLAR_MISSION_ID), true)
})

test('cell alone does not permit installation without actual station inspection', () => {
  let state = pickup(active(), 'cell')
  assert.strictEqual(reduce(state, { type: 'install-cell', context }), state)
  state = reduce(state, { type: 'position', x: -15, z: 5 })
  assert.strictEqual(reduce(state, { type: 'install-cell', context }), state)
  assert.equal(ownsItem(state.inventory, 'cell'), true)
})

test('installation requires correct scene, solar control unit and unobstructed proximity', () => {
  const state = freeze(solarReady())
  for (const bad of [null, { ...context, consoleId: 'oxygen' }, { ...context, location: 'interior' }, { ...context, x: 0 }, { ...context, z: 3 }, { ...context, x: NaN }]) {
    assert.equal(canRepairSystem(state, bad, SOLAR_MISSION_ID), false)
    assert.strictEqual(reduce(state, { type: 'install-cell', context: bad }), state)
    assert.strictEqual(reduce(state, { type: 'inspect', context: bad }), state)
  }
  assert.equal(atSolarStation(-15, 5), true)
  assert.equal(atSolarStation(-15, 3), false)
  const inside = reduce(state, { type: 'scene-entered', location: 'greenhouse' })
  assert.strictEqual(reduce(inside, { type: 'install-cell', context }), inside)
})

test('installation consumes exactly one cell, completes only Mission 02 and cannot repeat', () => {
  let state = solarReady()
  state = { ...state, inventory: addItem(state.inventory, 'cell').inventory }
  freeze(state)
  const oxygen = state.missions[MISSION_ID]
  const installed = reduce(state, { type: 'install-cell', context })
  assert.equal(installed.missions[SOLAR_MISSION_ID].status, 'completed')
  assert.ok(getMissionProgress(installed.missions[SOLAR_MISSION_ID]).every((objective) => objective.completed))
  assert.strictEqual(installed.missions[MISSION_ID], oxygen)
  assert.equal(ownsItem(installed.inventory, 'cell'), true)
  assert.equal(ownsItem(installed.inventory, 'cell', 2), false)
  assert.equal(ownsItem(state.inventory, 'cell', 2), true)
  assert.match(installed.notification, /Solar power equipment is Operational/)
  assert.strictEqual(reduce(installed, { type: 'install-cell', context }), installed)
  assert.deepEqual(installed.collectedIds, state.collectedIds)
})

test('single cell is consumed without respawn and progress survives all scenes', () => {
  let state = reduce(solarReady(), { type: 'install-cell', context })
  assert.equal(ownsItem(state.inventory, 'cell'), false)
  assert.ok(!availableCollectibles('exterior', state.collectedIds).some((object) => object.id === cell.id))
  assert.strictEqual(pickup(state, 'cell'), state)
  const completed = state.missions[SOLAR_MISSION_ID]
  for (const location of ['interior', 'exterior', 'greenhouse', 'exterior']) {
    state = reduce(state, { type: 'scene-entered', location })
    assert.strictEqual(state.missions[SOLAR_MISSION_ID], completed)
  }
})

test('both missions can complete in either order without resetting each other', () => {
  let solarFirst = reduce(solarReady(), { type: 'install-cell', context })
  const solar = solarFirst.missions[SOLAR_MISSION_ID]
  solarFirst = oxygenComplete(solarFirst)
  assert.strictEqual(solarFirst.missions[SOLAR_MISSION_ID], solar)
  assert.ok([MISSION_ID, SOLAR_MISSION_ID].every((id) => solarFirst.missions[id].status === 'completed'))
  let oxygenFirst = oxygenComplete(active())
  const oxygen = oxygenFirst.missions[MISSION_ID]
  oxygenFirst = reduce(solarReady(oxygenFirst), { type: 'install-cell', context })
  assert.strictEqual(oxygenFirst.missions[MISSION_ID], oxygen)
  assert.ok([MISSION_ID, SOLAR_MISSION_ID].every((id) => oxygenFirst.missions[id].status === 'completed'))
  for (const state of [solarFirst, oxygenFirst]) {
    assert.equal(ownsItem(state.inventory, 'tool'), true)
    assert.equal(ownsItem(state.inventory, 'filter'), false)
    assert.equal(ownsItem(state.inventory, 'cell'), false)
  }
})
