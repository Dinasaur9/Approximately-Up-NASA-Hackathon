import test from 'node:test'
import assert from 'node:assert/strict'
import { OUTPOST_CONFIG as C } from './config.js'
import { createInitialOutpostState, getEnvironment, advanceOutpostHour, getMissionOutcome } from './model.js'

const controls = (oxygenGeneratorOn = false, foodProductionOn = false, shelterMode = false) =>
  ({ oxygenGeneratorOn, foodProductionOn, shelterMode })
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
function atHour(elapsedHours, resources = {}) {
  const state = createInitialOutpostState()
  return { ...state, elapsedHours, resources: { ...state.resources, ...resources } }
}
function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep)
    Object.freeze(value)
  }
  return value
}

test('initial state is fresh, bounded and active', () => {
  const state = createInitialOutpostState()
  assert.deepEqual(state.resources, { oxygenKg: 2.4, batteryKWh: 18, foodKg: 12 })
  assert.deepEqual(state.crew, { count: 4, health: 100, cumulativeDoseMGy: 0 })
  assert.equal(state.elapsedHours, 0)
  assert.equal(state.lastTurn, null)
  assert.deepEqual(getMissionOutcome(state), { status: 'active', failureReasons: [] })
  state.resources.oxygenKg = 0
  assert.equal(createInitialOutpostState().resources.oxygenKg, 2.4)
})

test('normal sunlight turn and approved three-turn example', () => {
  let state = createInitialOutpostState()
  for (const [settings, battery, oxygen, food, dose] of [
    [controls(true, true), 19, 2.48, 11.9, 0.5],
    [controls(true, true), 20, 2.56, 11.8, 1],
    [controls(false, true), 23, 2.4, 11.7, 1.5],
  ]) {
    state = advanceOutpostHour(state, settings)
    near(state.resources.batteryKWh, battery)
    near(state.resources.oxygenKg, oxygen)
    near(state.resources.foodKg, food)
    near(state.crew.cumulativeDoseMGy, dose)
    assert.equal(state.crew.health, 100)
  }
})

test('darkness uses stored battery', () => {
  const next = advanceOutpostHour(atHour(6), controls(true, true))
  assert.equal(next.lastTurn.environment.sunlight, false)
  assert.equal(next.resources.batteryKWh, 14)
  assert.equal(next.lastTurn.electricity.solarGeneratedKWh, 0)
})

test('storm shelter reduces dose and disables food production', () => {
  const state = atHour(24)
  const normal = advanceOutpostHour(state, controls(true, true))
  const shelter = advanceOutpostHour(state, controls(true, true, true))
  near(normal.lastTurn.radiation.addedDoseMGy, 4)
  near(shelter.lastTurn.radiation.addedDoseMGy, 0.8)
  near(shelter.resources.batteryKWh, 19.5)
  assert.equal(shelter.controls.foodProductionOn, false)
  assert.equal(shelter.lastTurn.requestedControls.foodProductionOn, true)
  assert.equal(shelter.lastTurn.food.producedKg, 0)
  assert.equal(shelter.lastTurn.electricity.systems.food.requestedKWh, 0)
})

test('partial power respects habitat, shelter, oxygen, food priorities', () => {
  const next = advanceOutpostHour(atHour(6, { batteryKWh: 2 }), controls(true, true, true))
  const systems = next.lastTurn.electricity.systems
  assert.equal(systems.habitat.deliveredKWh, 1)
  assert.equal(systems.shelter.deliveredKWh, 0.5)
  assert.equal(systems.oxygen.deliveredKWh, 0.5)
  assert.equal(systems.oxygen.poweredFraction, 0.25)
  near(next.lastTurn.oxygen.producedKg, 0.06)
  assert.equal(systems.food.deliveredKWh, 0)
  assert.equal(next.resources.batteryKWh, 0)
  const partialFood = advanceOutpostHour(atHour(6, { batteryKWh: 3.5 }), controls(true, true))
  near(partialFood.lastTurn.food.producedKg, 0.05)
})

test('partial shelter support interpolates exposure; unpowered shelter gives passive protection', () => {
  const partial = advanceOutpostHour(atHour(6, { batteryKWh: 1.25 }), controls(false, false, true))
  near(partial.lastTurn.radiation.transmission, 0.3)
  const unpowered = advanceOutpostHour(atHour(6, { batteryKWh: 0 }), controls(false, false, true))
  near(unpowered.lastTurn.radiation.transmission, 0.5)
  near(unpowered.lastTurn.health.losses.habitat, 25)
  const partialHabitat = advanceOutpostHour(atHour(6, { batteryKWh: 0.5 }), controls())
  near(partialHabitat.lastTurn.health.losses.habitat, 12.5)
})

test('capacity limits discard surplus supplies and spill excess energy', () => {
  const next = advanceOutpostHour(atHour(0, { oxygenKg: 6, foodKg: 16, batteryKWh: 24 }), controls(true, true))
  near(next.resources.oxygenKg, 6)
  near(next.lastTurn.oxygen.discardedKg, 0.08)
  near(next.resources.foodKg, 15.9)
  near(next.resources.batteryKWh, 24)
  near(next.lastTurn.electricity.spilledKWh, 1)
})

test('oxygen and food shortages cause proportional health loss', () => {
  const next = advanceOutpostHour(atHour(0, { oxygenKg: 0.08, foodKg: 0.1 }), controls())
  near(next.lastTurn.oxygen.shortfallKg, 0.08)
  near(next.lastTurn.food.shortfallKg, 0.1)
  near(next.crew.health, 75)
  assert.equal(next.resources.oxygenKg, 0)
  assert.equal(next.resources.foodKg, 0)
  const empty = advanceOutpostHour(atHour(6, { oxygenKg: 0, foodKg: 0, batteryKWh: 0 }), controls())
  near(empty.crew.health, 25)
  assert.ok(empty.lastTurn.messages.some((message) => message.includes('oxygen shortage')))
})

test('exactly meeting demand leaves zero reserves without shortage or health damage', () => {
  const next = advanceOutpostHour(atHour(0, { oxygenKg: 0.16, foodKg: 0.2 }), controls())
  assert.equal(next.resources.oxygenKg, 0)
  assert.equal(next.resources.foodKg, 0)
  assert.equal(next.lastTurn.oxygen.shortfallKg, 0)
  assert.equal(next.lastTurn.food.shortfallKg, 0)
  assert.equal(next.crew.health, 100)
})

test('health and radiation failure, multiple reasons, and terminal turn prevention', () => {
  const state = atHour(6, { oxygenKg: 0, foodKg: 0, batteryKWh: 0 })
  state.crew.health = 50
  state.crew.cumulativeDoseMGy = 59.5
  const next = advanceOutpostHour(state, controls())
  assert.equal(next.status, 'failed')
  assert.equal(next.crew.health, 0)
  assert.equal(next.crew.cumulativeDoseMGy, 60)
  assert.equal(next.failureReasons.length, 2)
  assert.throws(() => advanceOutpostHour(next), /Cannot advance/)
  const radiationOnly = createInitialOutpostState()
  radiationOnly.crew.cumulativeDoseMGy = 60
  assert.equal(getMissionOutcome(radiationOnly).status, 'failed')
  assert.throws(() => advanceOutpostHour(radiationOnly), /Cannot advance/)
  const healthOnly = createInitialOutpostState()
  healthOnly.crew.health = 0
  assert.equal(getMissionOutcome(healthOnly).status, 'failed')
})

test('hour 72 succeeds, but final-hour failure takes precedence', () => {
  const state = atHour(71)
  const next = advanceOutpostHour(state, controls())
  assert.equal(next.status, 'succeeded')
  assert.throws(() => advanceOutpostHour(next), /Cannot advance/)
  state.crew.cumulativeDoseMGy = 59.5
  assert.equal(advanceOutpostHour(state, controls()).status, 'failed')
})

test('preview is deterministic, deeply immutable, and shares no mutable report references', () => {
  const state = freezeDeep(advanceOutpostHour(createInitialOutpostState(), controls()))
  const settings = freezeDeep(controls(true, true, true))
  const snapshot = structuredClone(state)
  const preview = advanceOutpostHour(state, settings)
  assert.deepEqual(preview, advanceOutpostHour(state, settings))
  assert.deepEqual(state, snapshot)
  preview.controls.shelterMode = false
  preview.lastTurn.requestedControls.shelterMode = false
  assert.equal(settings.shelterMode, true)
  assert.notStrictEqual(preview.resources, state.resources)
  assert.notStrictEqual(preview.crew, state.crew)
})

test('environment boundaries and total available food-production sunlight', () => {
  for (const [turn, sunlight, storm] of [
    [1, true, false], [6, true, false], [7, false, false], [12, false, false],
    [13, true, false], [24, false, false], [25, true, true], [30, true, true],
    [31, false, false], [48, false, false], [49, true, true], [54, true, true],
    [55, false, false], [71, false, false], [72, false, false],
  ]) {
    assert.equal(getEnvironment(turn).sunlight, sunlight, `sunlight at ${turn}`)
    assert.equal(getEnvironment(turn).radiationStorm, storm, `storm at ${turn}`)
  }
  const hours = Array.from({ length: 72 }, (_, i) => getEnvironment(i + 1))
  assert.equal(hours.filter((e) => e.sunlight).length, 36)
  assert.equal(hours.filter((e) => e.sunlight && !e.radiationStorm).length, 24)
  assert.equal(hours.filter((e) => e.radiationStorm).length, 12)
})

test('invalid state, controls and turns are rejected', () => {
  for (const value of [0, 73, 1.5, NaN, Infinity, '1']) assert.throws(() => getEnvironment(value))
  for (const settings of [{}, controls(1), { ...controls(), unknown: true }, null]) {
    assert.throws(() => advanceOutpostHour(createInitialOutpostState(), settings))
  }
  for (const [key, value] of [['oxygenKg', -1], ['foodKg', NaN], ['batteryKWh', 25]]) {
    assert.throws(() => advanceOutpostHour(atHour(0, { [key]: value })))
  }
  for (const mutate of [
    (s) => { s.elapsedHours = 0.5 }, (s) => { s.crew.health = Infinity },
    (s) => { s.crew.cumulativeDoseMGy = -1 }, (s) => { s.crew.count = 3 },
    (s) => { s.status = 'unknown' },
  ]) {
    const state = createInitialOutpostState()
    mutate(state)
    assert.throws(() => advanceOutpostHour(state))
  }
})

test('complete 72-hour strategy succeeds despite storage spill with no shortages', (t) => {
  let state = createInitialOutpostState()
  let spill = 0
  let oxygenHours = 0
  let foodHours = 0
  let shelterHours = 0
  const minima = { oxygenKg: Infinity, foodKg: Infinity, batteryKWh: Infinity }
  // Explicit nighttime hours, rather than an aggregate energy assumption.
  const extraOxygenHours = new Set([7, 19])
  for (let hour = 1; hour <= C.missionHours; hour++) {
    assert.equal(state.status, 'active', `premature termination before hour ${hour}`)
    const environment = getEnvironment(hour)
    const settings = controls(environment.sunlight || extraOxygenHours.has(hour),
      environment.sunlight && !environment.radiationStorm, environment.radiationStorm)
    state = advanceOutpostHour(state, settings)
    oxygenHours += Number(settings.oxygenGeneratorOn)
    foodHours += Number(settings.foodProductionOn)
    shelterHours += Number(settings.shelterMode)
    spill += state.lastTurn.electricity.spilledKWh
    for (const [key, value] of Object.entries(state.resources)) {
      assert.ok(value >= 0, `${key} negative at hour ${hour}`)
      minima[key] = Math.min(minima[key], value)
    }
    assert.ok(state.resources.batteryKWh <= 24)
    assert.ok(state.resources.oxygenKg <= 6)
    assert.ok(state.resources.foodKg <= 16)
    near(state.lastTurn.oxygen.shortfallKg, 0)
    near(state.lastTurn.food.shortfallKg, 0)
    near(state.lastTurn.health.totalLoss, 0)
    for (const system of Object.values(state.lastTurn.electricity.systems)) {
      near(system.deliveredKWh, system.requestedKWh)
    }
    assert.ok(state.crew.cumulativeDoseMGy < 60)
    assert.ok(state.crew.health > 0)
    assert.equal(state.status, hour === 72 ? 'succeeded' : 'active')
  }
  assert.equal(oxygenHours, 38)
  assert.equal(foodHours, 24)
  assert.equal(shelterHours, 12)
  near(state.resources.oxygenKg, 0)
  near(state.resources.foodKg, 0)
  near(state.crew.health, 100)
  near(state.crew.cumulativeDoseMGy, 39.6)
  assert.ok(spill > 0)
  t.diagnostic(JSON.stringify({ final: state.resources, health: state.crew.health,
    exposureMGy: state.crew.cumulativeDoseMGy, spilledKWh: spill, minima }))
})
