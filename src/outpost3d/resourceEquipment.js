import { advanceOutpostHour } from '../outpost/model.js'

// Existing inspection points host controls, without adding competing E targets.
export function getResourceEquipment(location, id) {
  if (location === 'interior' && id === 'life-support') return { system: 'oxygen', key: 'oxygenGeneratorOn', title: 'Oxygen generation' }
  if (location === 'interior' && id === 'crew-quarters') return { system: 'shelter', key: 'shelterMode', title: 'Radiation shelter' }
  if (location === 'greenhouse' && id === 'hydroponics') return { system: 'food', key: 'foodProductionOn', title: 'Food production' }
  if (location === 'exterior' && id === 'solar') return { system: 'solar', title: 'Solar power forecast' }
  return null
}

export function getEquipmentForecast(session) {
  // Same pure transition used by the dashboard. Never commit this preview.
  return session.state.status === 'active' ? advanceOutpostHour(session.state, session.controls).lastTurn : null
}
