import { createInitialOutpostState, advanceOutpostHour } from './model.js'

// The pending plan and simulation share one owner in either app experience.
export function createResourceSession() {
  const state = createInitialOutpostState()
  return { state, controls: { ...state.controls } }
}

export function resourceSessionReducer(session, action) {
  switch (action.type) {
    case 'toggle': {
      if (session.state.status !== 'active') return session
      if (!['oxygenGeneratorOn', 'foodProductionOn', 'shelterMode'].includes(action.key)) throw new TypeError('Unknown resource control.')
      const controls = { ...session.controls, [action.key]: !session.controls[action.key] }
      if (controls.shelterMode) controls.foodProductionOn = false
      return { ...session, controls }
    }
    case 'advance':
      return session.state.status === 'active' ? { ...session, state: advanceOutpostHour(session.state, session.controls) } : session
    case 'restart': return createResourceSession()
    default: return session
  }
}
