import { OUTPOST_CONFIG as C } from './config.js'

// Only floating-point dust is removed. Calculations are never display-rounded.
const EPSILON = 1e-9
const clean = (value) => Math.abs(value) < EPSILON ? 0 : value
const CONTROL_KEYS = ['oxygenGeneratorOn', 'foodProductionOn', 'shelterMode']

function validateControls(controls) {
  if (!controls || CONTROL_KEYS.some((key) => typeof controls[key] !== 'boolean') ||
      Object.keys(controls).some((key) => !CONTROL_KEYS.includes(key))) {
    throw new TypeError('Controls must contain exactly three boolean system settings.')
  }
}

function inRange(value, min, max, name) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}.`)
  }
}

function validateState(state) {
  if (!state || !state.resources || !state.crew) throw new TypeError('Invalid outpost state.')
  inRange(state.elapsedHours, 0, C.missionHours, 'elapsedHours')
  if (!Number.isInteger(state.elapsedHours)) throw new RangeError('elapsedHours must be an integer.')
  inRange(state.resources.oxygenKg, 0, C.oxygenCapacityKg, 'oxygenKg')
  inRange(state.resources.foodKg, 0, C.foodCapacityKg, 'foodKg')
  inRange(state.resources.batteryKWh, 0, C.batteryCapacityKWh, 'batteryKWh')
  inRange(state.crew.health, 0, C.maximumHealth, 'health')
  inRange(state.crew.cumulativeDoseMGy, 0, Number.MAX_VALUE, 'cumulativeDoseMGy')
  if (state.crew.count !== C.crewCount) throw new RangeError('This scenario requires four astronauts.')
  if (!['active', 'succeeded', 'failed'].includes(state.status)) throw new TypeError('Invalid mission status.')
  validateControls(state.controls)
}

/** Returns a fresh session; no references are shared between sessions. */
export function createInitialOutpostState() {
  return {
    elapsedHours: 0,
    status: 'active',
    failureReasons: [],
    resources: {
      oxygenKg: C.initialOxygenKg,
      batteryKWh: C.initialBatteryKWh,
      foodKg: C.initialFoodKg,
    },
    crew: { count: C.crewCount, health: C.initialHealth, cumulativeDoseMGy: 0 },
    controls: { oxygenGeneratorOn: false, foodProductionOn: false, shelterMode: false },
    lastTurn: null,
  }
}

/** Turn numbers are one-based, inclusive; schedules use the upcoming hour. */
export function getEnvironment(turnNumber) {
  if (!Number.isInteger(turnNumber) || turnNumber < 1 || turnNumber > C.missionHours) {
    throw new RangeError('turnNumber must be an integer from 1 to 72.')
  }
  const sunlight = (turnNumber - 1) % C.lightingCycleHours < C.sunlightHoursPerCycle
  const radiationStorm = C.stormWindows.some(([start, end]) => turnNumber >= start && turnNumber <= end)
  return {
    turnNumber, sunlight, radiationStorm,
    solarPowerKW: sunlight ? C.solarPowerKW : 0,
    externalDoseMGyPerHour: radiationStorm ? C.stormDoseMGyPerHour : C.normalDoseMGyPerHour,
  }
}

/** Derives outcomes from physical values, with failure taking precedence. */
export function getMissionOutcome(state) {
  validateState(state)
  const failureReasons = []
  if (state.crew.health <= 0) failureReasons.push('Crew health reached zero.')
  if (state.crew.cumulativeDoseMGy >= C.radiationFailureMGy - EPSILON) {
    failureReasons.push('Cumulative radiation exposure reached the gameplay limit.')
  }
  return {
    status: failureReasons.length ? 'failed' : state.elapsedHours >= C.missionHours ? 'succeeded' : 'active',
    failureReasons,
  }
}

function resolveSupply(stored, produced, consumed, capacity) {
  const remaining = clean(stored + produced - consumed)
  return {
    startingKg: stored, producedKg: produced, consumedKg: consumed,
    shortfallKg: Math.max(0, -remaining),
    discardedKg: Math.max(0, remaining - capacity),
    endingKg: Math.min(capacity, Math.max(0, remaining)),
  }
}

/** Pure transition: also safe to call for a preview. Throws for terminal sessions. */
export function advanceOutpostHour(state, controls = state?.controls) {
  const currentOutcome = getMissionOutcome(state)
  validateControls(controls)
  if (state.status !== 'active' || currentOutcome.status !== 'active') {
    throw new Error('Cannot advance a completed or failed mission.')
  }
  const environment = getEnvironment(state.elapsedHours + 1)
  const effectiveControls = { ...controls, foodProductionOn: controls.foodProductionOn && !controls.shelterMode }
  const solarGeneratedKWh = environment.solarPowerKW * C.turnHours
  let available = state.resources.batteryKWh + solarGeneratedKWh
  const systems = {}
  // Array order is the electrical priority order, including partial delivery.
  for (const [name, powerKW, enabled] of [
    ['habitat', C.habitatPowerKW, true],
    ['shelter', C.shelterPowerKW, controls.shelterMode],
    ['oxygen', C.oxygenPowerKW, controls.oxygenGeneratorOn],
    ['food', C.foodPowerKW, effectiveControls.foodProductionOn],
  ]) {
    const requestedKWh = enabled ? powerKW * C.turnHours : 0
    const deliveredKWh = Math.min(available, requestedKWh)
    available = clean(available - deliveredKWh)
    systems[name] = { requestedKWh, deliveredKWh, poweredFraction: enabled ? deliveredKWh / requestedKWh : 0 }
  }
  const batteryKWh = Math.min(C.batteryCapacityKWh, available)
  const spilledKWh = Math.max(0, available - batteryKWh)
  const oxygen = resolveSupply(state.resources.oxygenKg,
    C.oxygenProductionKgPerHour * systems.oxygen.poweredFraction * C.turnHours,
    C.oxygenConsumptionKgPerHour * C.turnHours, C.oxygenCapacityKg)
  const food = resolveSupply(state.resources.foodKg,
    C.foodProductionKgPerHour * systems.food.poweredFraction * C.turnHours,
    C.foodConsumptionKgPerHour * C.turnHours, C.foodCapacityKg)
  const transmission = controls.shelterMode
    ? C.passiveTransmission - (C.passiveTransmission - C.shelterTransmission) * systems.shelter.poweredFraction
    : C.passiveTransmission
  const addedDoseMGy = environment.externalDoseMGyPerHour * transmission * C.turnHours
  const healthLoss = {
    oxygen: C.oxygenShortageHealthPenalty * oxygen.shortfallKg / oxygen.consumedKg,
    food: C.foodShortageHealthPenalty * food.shortfallKg / food.consumedKg,
    habitat: C.habitatOutageHealthPenalty * (1 - systems.habitat.poweredFraction),
  }
  const totalHealthLoss = Object.values(healthLoss).reduce((sum, value) => sum + value, 0)
  const messages = [
    `Hour ${environment.turnNumber}: ${environment.sunlight ? 'sunlight' : 'darkness'}; ${environment.radiationStorm ? 'radiation storm' : 'normal radiation'}.`,
    `Solar generated ${solarGeneratedKWh} kWh; battery ends at ${batteryKWh} kWh; ${spilledKWh} kWh spilled.`,
    `Oxygen: +${oxygen.producedKg} kg production, -${oxygen.consumedKg} kg demand.`,
    `Food: +${food.producedKg} kg production, -${food.consumedKg} kg demand.`,
    `Radiation transmission ${transmission}; added exposure ${addedDoseMGy} mGy.`,
  ]
  if (controls.shelterMode && controls.foodProductionOn) messages.push('Shelter occupancy disables food production.')
  for (const [name, system] of Object.entries(systems)) {
    if (system.deliveredKWh < system.requestedKWh) messages.push(`${name} received ${system.poweredFraction * 100}% of required electricity.`)
  }
  for (const [name, supply] of Object.entries({ oxygen, food })) {
    if (supply.shortfallKg) messages.push(`${name} shortage: ${supply.shortfallKg} kg.`)
    if (supply.discardedKg) messages.push(`${name} capacity exceeded: ${supply.discardedKg} kg discarded.`)
  }
  messages.push(`Health lost ${totalHealthLoss} points.`)
  const next = {
    elapsedHours: environment.turnNumber,
    status: 'active', failureReasons: [],
    resources: { oxygenKg: oxygen.endingKg, foodKg: food.endingKg, batteryKWh },
    crew: { ...state.crew, health: Math.max(0, clean(state.crew.health - totalHealthLoss)),
      cumulativeDoseMGy: state.crew.cumulativeDoseMGy + addedDoseMGy },
    controls: effectiveControls,
    lastTurn: {
      environment, requestedControls: { ...controls }, effectiveControls: { ...effectiveControls },
      electricity: { startingBatteryKWh: state.resources.batteryKWh, solarGeneratedKWh,
        systems, spilledKWh, endingBatteryKWh: batteryKWh },
      oxygen, food,
      radiation: { transmission, addedDoseMGy, cumulativeDoseMGy: state.crew.cumulativeDoseMGy + addedDoseMGy },
      health: { starting: state.crew.health, losses: healthLoss, totalLoss: totalHealthLoss,
        ending: Math.max(0, clean(state.crew.health - totalHealthLoss)) },
      messages,
    },
  }
  const outcome = getMissionOutcome(next)
  next.lastTurn.messages.push(`Mission status: ${outcome.status}.`, ...outcome.failureReasons)
  return { ...next, ...outcome }
}
