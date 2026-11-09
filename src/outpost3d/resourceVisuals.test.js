import test from 'node:test'
import assert from 'node:assert/strict'
import { createResourceSession, resourceSessionReducer as reduce } from '../outpost/session.js'
import { advanceOutpostHour, getEnvironment } from '../outpost/model.js'
import { VISUAL_WARNINGS, getResourceVisuals } from './resourceVisuals.js'

function sessionAt(elapsedHours, batteryKWh = 18, controls = {}) {
  const session = createResourceSession()
  return { ...session, state: { ...session.state, elapsedHours, resources: { ...session.state.resources, batteryKWh } }, controls: { ...session.controls, ...controls } }
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

test('normal initial conditions show a labeled next-hour plan without resource warnings', () => {
  const visuals = getResourceVisuals(createResourceSession())
  assert.equal(visuals.basis, 'Next-hour plan')
  assert.equal(visuals.hour, 1)
  assert.equal(visuals.battery.low, false)
  assert.equal(visuals.oxygen.low, false)
  assert.equal(visuals.habitat.lightingScale, 1)
  assert.equal(visuals.food.status, 'off')
  assert.equal(visuals.food.lastDeliveredKWh, null)
})

test('visual-only battery and oxygen thresholds are inclusive and separate from failure rules', () => {
  const session = createResourceSession()
  session.state.resources.batteryKWh = VISUAL_WARNINGS.batteryKWh
  session.state.resources.oxygenKg = VISUAL_WARNINGS.oxygenKg
  const warning = getResourceVisuals(session)
  assert.equal(warning.battery.low, true)
  assert.equal(warning.oxygen.low, true)
  assert.ok(warning.habitat.lightingScale > 0 && warning.habitat.lightingScale < 1)
  assert.equal(session.state.status, 'active')
  session.state.resources.batteryKWh += 0.001
  session.state.resources.oxygenKg += 0.001
  const healthy = getResourceVisuals(session)
  assert.equal(healthy.battery.low, false)
  assert.equal(healthy.oxygen.low, false)
})

test('solar generation follows the same upcoming-hour environment as the model', () => {
  for (const elapsed of [0, 5, 6, 11, 12, 17, 18, 23]) {
    const visuals = getResourceVisuals(sessionAt(elapsed))
    assert.deepEqual(visuals.environment, getEnvironment(elapsed + 1))
    assert.equal(visuals.solar.generating, getEnvironment(elapsed + 1).sunlight)
    assert.equal(visuals.solar.powerKW, getEnvironment(elapsed + 1).solarPowerKW)
  }
})

test('requested food production is not operational without delivered power', () => {
  const session = sessionAt(6, 0, { foodProductionOn: true })
  const visuals = getResourceVisuals(session)
  assert.equal(visuals.food.requested, true)
  assert.equal(visuals.food.status, 'unpowered')
  assert.equal(visuals.food.poweredFraction, 0)
  assert.equal(visuals.habitat.warning, true)
  assert.equal(visuals.solar.generating, false)
})

test('food lighting fraction comes from model allocation, including partial power and priority', () => {
  const session = sessionAt(6, 1.5, { foodProductionOn: true })
  const visuals = getResourceVisuals(session)
  const report = advanceOutpostHour(session.state, session.controls).lastTurn
  assert.equal(visuals.food.status, 'partial')
  assert.equal(visuals.food.poweredFraction, 0.5)
  assert.equal(visuals.food.poweredFraction, report.electricity.systems.food.poweredFraction)
  const priority = getResourceVisuals(sessionAt(6, 3, { oxygenGeneratorOn: true, foodProductionOn: true }))
  assert.equal(priority.food.status, 'unpowered')
})

test('zero battery in sunlight can still power food, while low reserve warning remains visible', () => {
  const visuals = getResourceVisuals(sessionAt(0, 0, { oxygenGeneratorOn: true, foodProductionOn: true }))
  assert.equal(visuals.food.status, 'powered')
  assert.equal(visuals.food.poweredFraction, 1)
  assert.equal(visuals.battery.low, true)
  assert.equal(visuals.solar.generating, true)
})

test('shelter blocks food production according to model effective controls', () => {
  const visuals = getResourceVisuals(sessionAt(0, 18, { foodProductionOn: true, shelterMode: true }))
  assert.equal(visuals.food.status, 'shelter')
  assert.equal(visuals.food.poweredFraction, 0)
})

test('storm warnings follow both existing storm windows and stop at their boundaries', () => {
  for (const elapsed of [23, 24, 25, 29, 30, 47, 48, 49, 53, 54]) {
    const visuals = getResourceVisuals(sessionAt(elapsed))
    assert.equal(visuals.storm, getEnvironment(elapsed + 1).radiationStorm)
  }
  assert.equal(getResourceVisuals(sessionAt(24)).storm, true)
  assert.equal(getResourceVisuals(sessionAt(30)).storm, false)
})

test('settings immediately update projection while last delivered power and stored resources remain separate', () => {
  let session = reduce(createResourceSession(), { type: 'advance' })
  const stored = session.state
  assert.equal(getResourceVisuals(session).food.lastDeliveredKWh, 0)
  session = reduce(session, { type: 'toggle', key: 'foodProductionOn' })
  const plan = getResourceVisuals(session)
  assert.strictEqual(session.state, stored)
  assert.equal(plan.food.status, 'powered')
  assert.equal(plan.food.lastDeliveredKWh, 0)
  session = reduce(session, { type: 'advance' })
  const next = getResourceVisuals(session)
  assert.equal(session.state.elapsedHours, 2)
  assert.equal(next.hour, 3)
  assert.equal(next.food.lastDeliveredKWh, 1)
  assert.equal(next.food.lastRequestedKWh, 1)
})

test('exploring and repeated status reads never mutate resources or advance the clock', () => {
  const session = freeze(sessionAt(24, 3, { foodProductionOn: true }))
  const snapshot = structuredClone(session)
  const first = getResourceVisuals(session)
  for (let i = 0; i < 10; i++) assert.deepEqual(getResourceVisuals(session), first)
  assert.deepEqual(session, snapshot)
  assert.equal(session.state.elapsedHours, 24)
})

test('completed simulation freezes its last environment, stops planned food and solar operations, and restarts cleanly', () => {
  let session = sessionAt(71, 18)
  session = reduce(session, { type: 'advance' })
  assert.equal(session.state.status, 'succeeded')
  const visuals = getResourceVisuals(freeze(session))
  assert.equal(visuals.active, false)
  assert.deepEqual(visuals.environment, session.state.lastTurn.environment)
  assert.equal(visuals.food.status, 'ended')
  assert.equal(visuals.food.poweredFraction, 0)
  assert.equal(visuals.solar.generating, false)
  assert.deepEqual(getResourceVisuals(reduce(session, { type: 'restart' })), getResourceVisuals(createResourceSession()))
})
