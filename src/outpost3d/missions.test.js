import test from 'node:test'
import assert from 'node:assert/strict'
import { MISSION_ID, createExplorationSession, createMissionState, explorationReducer as reduce, getMissionProgress, canRepairSystem, missingRepairItems } from './missions.js'
import { addItem, ownsItem, removeItem } from './inventory.js'
import { collectibles, availableCollectibles } from './collectibles.js'
import { createDoorState } from './interior.js'

const filter = collectibles.find((entry) => entry.itemId === 'filter')
const tool = collectibles.find((entry) => entry.itemId === 'tool')
const context = { location: 'interior', consoleId: 'life-support', x: -6, z: -3, doorState: createDoorState() }
const collect = (state, object) => reduce(state, { type: 'collect', id: object.id })
function visit(state) {
  state = reduce(state, { type: 'scene-entered', location: 'interior' })
  return reduce(state, { type: 'position', x: -6, z: -3, doorState: context.doorState })
}
function ready() {
  let state = reduce(createExplorationSession(), { type: 'start' })
  state = collect(collect(state, tool), filter)
  return visit(state)
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

test('mission initializes not started; tracker-style reads never advance progress', () => {
  const state = freeze(createExplorationSession())
  assert.equal(state.missions[MISSION_ID].status, 'not-started')
  assert.equal(getMissionProgress(state.missions[MISSION_ID]).filter((o) => o.completed).length, 0)
  assert.strictEqual(reduce(state, { type: 'open-tracker' }), state)
  assert.equal(getMissionProgress(createMissionState()).length, 5)
  assert.throws(() => createMissionState('missing'))
  const active = reduce(state, { type: 'start' })
  assert.equal(active.missions[MISSION_ID].status, 'active')
  assert.deepEqual(active.missions[MISSION_ID].completedObjectives, [])
})

test('collecting either order completes only actual item objectives', () => {
  for (const order of [[tool, filter], [filter, tool]]) {
    let state = reduce(createExplorationSession(), { type: 'start' })
    state = collect(state, order[0])
    assert.deepEqual(state.missions[MISSION_ID].completedObjectives, [order[0].itemId])
    state = collect(state, order[1])
    assert.deepEqual(state.missions[MISSION_ID].completedObjectives, ['tool', 'filter'])
    assert.equal(state.missions[MISSION_ID].status, 'active')
    assert.match(state.notification, /Objective updated/)
  }
})

test('already collected items are recognized on start, independently of opening M', () => {
  let state = collect(collect(createExplorationSession(), filter), tool)
  assert.equal(state.missions[MISSION_ID].status, 'not-started')
  state = reduce(state, { type: 'start' })
  assert.deepEqual(state.missions[MISSION_ID].completedObjectives, ['tool', 'filter'])
  assert.equal(ownsItem(state.inventory, 'tool'), true)
})

test('scene and room objectives require events from actual matching location and walkable coordinates', () => {
  let state = reduce(createExplorationSession(), { type: 'start' })
  const position = { type: 'position', x: -6, z: -3, doorState: createDoorState() }
  assert.strictEqual(reduce(state, position), state)
  state = reduce(state, { type: 'scene-entered', location: 'greenhouse' })
  assert.deepEqual(state.missions[MISSION_ID].completedObjectives, [])
  assert.strictEqual(reduce(state, position), state)
  state = reduce(state, { type: 'scene-entered', location: 'interior' })
  assert.deepEqual(state.missions[MISSION_ID].completedObjectives, ['habitat'])
  for (const [x, z] of [[0, -3], [-8, -3], [NaN, -3], [-10, -3]]) {
    assert.strictEqual(reduce(state, { ...position, x, z }), state)
  }
  state = reduce(state, position)
  assert.deepEqual(state.missions[MISSION_ID].completedObjectives, ['habitat', 'life-support'])
})

test('repair without both required items never consumes inventory or completes mission', () => {
  for (const items of [[], [tool], [filter]]) {
    let state = reduce(createExplorationSession(), { type: 'start' })
    for (const item of items) state = collect(state, item)
    state = freeze(visit(state))
    assert.equal(canRepairSystem(state, context), false)
    assert.strictEqual(reduce(state, { type: 'repair', context }), state)
    assert.equal(missingRepairItems(state.inventory).length, 2 - items.length)
  }
})

test('wrong console, scene, range, walls or incomplete visit conditions reject repair', () => {
  const state = freeze(ready())
  for (const bad of [null, { ...context, consoleId: 'mission-control' }, { ...context, location: 'exterior' }, { ...context, x: 0 }, { ...context, x: -8 }, { ...context, z: 3 }]) {
    assert.equal(canRepairSystem(state, bad), false)
    assert.strictEqual(reduce(state, { type: 'repair', context: bad }), state)
  }
  const outside = reduce(state, { type: 'scene-entered', location: 'exterior' })
  assert.strictEqual(reduce(outside, { type: 'repair', context }), outside)
  const noVisit = { ...state, missions: { ...state.missions, [MISSION_ID]: { ...state.missions[MISSION_ID], completedObjectives: ['tool', 'filter'] } } }
  assert.equal(canRepairSystem(noVisit, context), false)
})

test('repair consumes exactly one filter, retains tool and atomically completes all objectives', () => {
  let state = ready()
  state = { ...state, inventory: addItem(state.inventory, 'filter', 2).inventory }
  freeze(state)
  assert.equal(canRepairSystem(state, context), true)
  const next = reduce(state, { type: 'repair', context })
  assert.equal(next.missions[MISSION_ID].status, 'completed')
  assert.equal(getMissionProgress(next.missions[MISSION_ID]).every((o) => o.completed), true)
  assert.equal(ownsItem(next.inventory, 'filter', 2), true)
  assert.equal(ownsItem(next.inventory, 'filter', 3), false)
  assert.equal(ownsItem(next.inventory, 'tool'), true)
  assert.equal(ownsItem(state.inventory, 'filter', 3), true)
  assert.deepEqual(next.collectedIds, state.collectedIds)
  assert.match(next.notification, /Mission complete/)
})

test('repeat repairs and starts are no-ops and consumed filter objective remains complete', () => {
  const completed = freeze(reduce(ready(), { type: 'repair', context }))
  assert.equal(ownsItem(completed.inventory, 'filter'), false)
  assert.equal(ownsItem(completed.inventory, 'tool'), true)
  assert.strictEqual(reduce(completed, { type: 'repair', context }), completed)
  assert.strictEqual(reduce(completed, { type: 'start' }), completed)
  assert.equal(completed.missions[MISSION_ID].completedObjectives.includes('filter'), true)
  assert.equal(availableCollectibles('exterior', completed.collectedIds).some((item) => item.id === filter.id), false)
})

test('progress and inventory survive scene transitions and item objective completion never bypasses current requirements', () => {
  const state = ready()
  const noFilter = { ...state, inventory: removeItem(state.inventory, 'filter').inventory }
  assert.equal(noFilter.missions[MISSION_ID].completedObjectives.includes('filter'), true)
  assert.equal(canRepairSystem(noFilter, context), false)
  let next = reduce(state, { type: 'scene-entered', location: 'exterior' })
  next = reduce(next, { type: 'scene-entered', location: 'greenhouse' })
  next = reduce(next, { type: 'scene-entered', location: 'exterior' })
  next = reduce(next, { type: 'scene-entered', location: 'interior' })
  assert.deepEqual(next.missions[MISSION_ID], state.missions[MISSION_ID])
  assert.deepEqual(next.inventory, state.inventory)
  assert.equal(canRepairSystem(next, context), true)
})

test('duplicate or unavailable collection and full inventory cannot award phantom objectives', () => {
  const state = ready()
  assert.strictEqual(collect(state, tool), state)
  assert.strictEqual(reduce(state, { type: 'collect', id: 'missing' }), state)
  let full = reduce(createExplorationSession(), { type: 'start' })
  full = { ...full, inventory: addItem(full.inventory, 'tool', 6).inventory }
  const rejected = collect(full, filter)
  assert.deepEqual(rejected.collectedIds, [])
  assert.equal(rejected.missions[MISSION_ID].completedObjectives.includes('filter'), false)
  assert.match(rejected.notification, /Inventory full/)
})
