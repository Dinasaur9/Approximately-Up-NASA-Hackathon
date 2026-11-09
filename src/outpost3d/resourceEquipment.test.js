import test from 'node:test'
import assert from 'node:assert/strict'
import { getResourceEquipment, getEquipmentForecast } from './resourceEquipment.js'
import { createResourceSession, resourceSessionReducer as reduce } from '../outpost/session.js'
import { advanceOutpostHour } from '../outpost/model.js'
import { getResourceVisuals } from './resourceVisuals.js'
import { createExplorationSession, explorationReducer } from './missions.js'
import { createDoorState, selectInteriorInteraction } from './interior.js'
import { selectGreenhouseInteraction } from './greenhouse.js'
import { selectExteriorInteraction } from './interactions.js'

for (const [location, id, key] of [
  ['interior', 'life-support', 'oxygenGeneratorOn'],
  ['greenhouse', 'hydroponics', 'foodProductionOn'],
  ['interior', 'crew-quarters', 'shelterMode'],
]) {
  test(`${id} changes the shared pending setting without advancing time or resources`, () => {
    const session = createResourceSession()
    const equipment = getResourceEquipment(location, id)
    assert.equal(equipment.key, key)
    const next = reduce(session, { type: 'toggle', key: equipment.key })
    assert.equal(next.controls[key], true)
    assert.strictEqual(next.state, session.state)
    assert.equal(next.state.elapsedHours, 0)
    assert.deepEqual(getEquipmentForecast(next), advanceOutpostHour(next.state, next.controls).lastTurn)
    // The dashboard's toggle action is identical: no panel-local settings exist.
    const dashboardUpdate = reduce(next, { type: 'toggle', key })
    assert.equal(dashboardUpdate.controls[equipment.key], false)
    assert.strictEqual(dashboardUpdate.state, session.state)
  })
}

test('preview is immutable, shared settings commit only when advancing, and match visual feedback', () => {
  let session = createResourceSession()
  const original = structuredClone(session)
  for (const id of ['life-support', 'hydroponics']) {
    const location = id === 'hydroponics' ? 'greenhouse' : 'interior'
    session = reduce(session, { type: 'toggle', key: getResourceEquipment(location, id).key })
  }
  const before = structuredClone(session)
  const report = getEquipmentForecast(session)
  assert.deepEqual(session, before)
  assert.deepEqual(session.state, original.state)
  assert.equal(getResourceVisuals(session).food.poweredFraction, report.electricity.systems.food.poweredFraction)
  const next = reduce(session, { type: 'advance' })
  assert.deepEqual(next.state.lastTurn, report)
  assert.equal(next.state.elapsedHours, 1)
  assert.notDeepEqual(next.state.resources, session.state.resources)
})

test('solar forecast follows sunlight, darkness, partial power, and spilled energy from the model', () => {
  assert.equal(getResourceEquipment('exterior', 'solar').key, undefined)
  for (const [hours, battery, expectedSolar] of [[0, 24, 5], [6, 0, 0], [6, 1.5, 0]]) {
    const session = createResourceSession()
    session.state = { ...session.state, elapsedHours: hours, resources: { ...session.state.resources, batteryKWh: battery } }
    session.controls = { oxygenGeneratorOn: true, foodProductionOn: true, shelterMode: false }
    const report = getEquipmentForecast(session)
    assert.equal(report.electricity.solarGeneratedKWh, expectedSolar)
    assert.deepEqual(report, advanceOutpostHour(session.state, session.controls).lastTurn)
    if (hours === 0) assert.ok(report.electricity.spilledKWh > 0)
    else assert.ok(Object.values(report.electricity.systems).some((p) => p.deliveredKWh < p.requestedKWh))
  }
})

test('shelter uses model storm exposure, disables food, and never changes stored exposure on toggle', () => {
  let session = createResourceSession()
  session.state = { ...session.state, elapsedHours: 24 }
  session = reduce(session, { type: 'toggle', key: 'foodProductionOn' })
  const exposed = getEquipmentForecast(session)
  const stored = session.state
  session = reduce(session, { type: 'toggle', key: 'shelterMode' })
  assert.strictEqual(session.state, stored)
  assert.equal(session.controls.foodProductionOn, false)
  const sheltered = getEquipmentForecast(session)
  assert.equal(sheltered.environment.radiationStorm, true)
  assert.ok(sheltered.radiation.addedDoseMGy < exposed.radiation.addedDoseMGy)
  assert.equal(sheltered.food.producedKg, 0)
})

test('controls reuse reachable inspection points; repairs, nutrients and mission control retain their IDs', () => {
  const doors = createDoorState()
  for (const [id, x, z] of [['life-support', -6, -3], ['crew-quarters', 6, 3], ['mission-control', 0, -11]]) {
    const entry = selectInteriorInteraction(x, z, doors)
    assert.equal(entry.id, id)
    assert.equal(entry.action, id === 'mission-control' ? 'resources' : 'inspect')
  }
  assert.equal(selectGreenhouseInteraction(-1.6, -2).id, 'hydroponics')
  assert.equal(selectGreenhouseInteraction(-1.8, -7).id, 'nutrients')
  assert.equal(getResourceEquipment('greenhouse', 'nutrients'), null)
  assert.equal(getResourceEquipment('exterior', 'life-support'), null)
  // Existing exterior station and training interaction remain shared.
  assert.equal(selectExteriorInteraction(-15, 5)?.id, 'solar')
})

test('equipment actions leave inventory and all four missions unchanged across scenes', () => {
  const exploration = explorationReducer(createExplorationSession(), { type: 'start' })
  const snapshot = structuredClone(exploration)
  let session = createResourceSession()
  for (const [location, id] of [['interior', 'life-support'], ['greenhouse', 'hydroponics'], ['interior', 'crew-quarters']]) {
    session = reduce(session, { type: 'toggle', key: getResourceEquipment(location, id).key })
    getEquipmentForecast(session)
  }
  assert.deepEqual(exploration, snapshot)
  assert.equal(Object.keys(exploration.missions).length, 4)
  assert.equal(session.state.elapsedHours, 0)
})

test('ended sessions expose no future forecast, disable changes, and restart intentionally', () => {
  for (const status of ['failed', 'succeeded']) {
    const session = createResourceSession()
    session.state = { ...session.state, status }
    assert.equal(getEquipmentForecast(session), null)
    assert.strictEqual(reduce(session, { type: 'toggle', key: 'oxygenGeneratorOn' }), session)
    assert.deepEqual(reduce(session, { type: 'restart' }), createResourceSession())
  }
})
