import { advanceOutpostHour, getEnvironment } from '../outpost/model.js'
import { OUTPOST_CONFIG as C } from '../outpost/config.js'

// Presentation warnings only, not new failure conditions or engineering data.
export const VISUAL_WARNINGS = Object.freeze({ batteryKWh: C.batteryCapacityKWh * 0.15, oxygenKg: 0.64 })
export const RESOURCE_COLORS = Object.freeze({ normal: '#7de0b4', warning: '#ffc16e', standby: '#7492aa', off: '#344856' })

/** Read-only projection. The model alone determines weather and power allocation.
 * Active sessions show the NEXT hour's plan; completed sessions freeze last results.
 * Reserve warnings always describe the currently stored quantities.
 */
export function getResourceVisuals({ state, controls }) {
  const active = state.status === 'active'
  const report = active ? advanceOutpostHour(state, controls).lastTurn : state.lastTurn
  const environment = report?.environment || getEnvironment(Math.min(state.elapsedHours + 1, C.missionHours))
  const batteryLow = state.resources.batteryKWh <= VISUAL_WARNINGS.batteryKWh
  const oxygenLow = state.resources.oxygenKg <= VISUAL_WARNINGS.oxygenKg
  const habitatFraction = report?.electricity.systems.habitat.poweredFraction ?? 0
  const foodFraction = active ? report.electricity.systems.food.poweredFraction : 0
  let foodStatus = 'off'
  if (!active) foodStatus = 'ended'
  else if (controls.shelterMode) foodStatus = 'shelter'
  else if (controls.foodProductionOn) foodStatus = foodFraction === 0 ? 'unpowered' : foodFraction < 1 ? 'partial' : 'powered'
  const powerWarning = batteryLow || habitatFraction < 1
  return {
    active, basis: active ? 'Next-hour plan' : 'Simulation ended', hour: environment.turnNumber,
    environment,
    battery: { low: batteryLow, kWh: state.resources.batteryKWh },
    oxygen: { low: oxygenLow, kg: state.resources.oxygenKg },
    habitat: { warning: powerWarning, poweredFraction: habitatFraction, lightingScale: powerWarning ? 0.35 : 1 },
    solar: { generating: active && environment.sunlight && report.electricity.solarGeneratedKWh > 0,
      powerKW: active ? environment.solarPowerKW : 0 },
    food: { requested: active && controls.foodProductionOn, status: foodStatus, poweredFraction: foodFraction,
      lastDeliveredKWh: state.lastTurn?.electricity.systems.food.deliveredKWh ?? null,
      lastRequestedKWh: state.lastTurn?.electricity.systems.food.requestedKWh ?? null },
    storm: environment.radiationStorm,
  }
}
