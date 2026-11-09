import test from 'node:test'
import assert from 'node:assert/strict'
import { createResourceSession, resourceSessionReducer as reduce } from './session.js'
import { createInitialOutpostState, advanceOutpostHour } from './model.js'
import { createExplorationSession, explorationReducer } from '../outpost3d/missions.js'
import { createDoorState, selectInteriorInteraction } from '../outpost3d/interior.js'

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

test('resource sessions use the original initial state and independent standalone owners', () => {
  const standalone = createResourceSession(), exploration = createResourceSession()
  assert.deepEqual(standalone.state, createInitialOutpostState())
  assert.deepEqual(standalone.controls, createInitialOutpostState().controls)
  assert.notStrictEqual(standalone.state, exploration.state)
  const next = reduce(standalone, { type: 'advance' })
  assert.equal(next.state.elapsedHours, 1)
  assert.equal(exploration.state.elapsedHours, 0)
})

test('opening, closing, exploring and switching scenes do not change resource state or settings', () => {
  let session = reduce(createResourceSession(), { type: 'toggle', key: 'oxygenGeneratorOn' })
  session = reduce(session, { type: 'advance' })
  const original = freeze(session)
  for (const type of ['open-terminal', 'close-terminal', 'position', 'scene-entered', 'inspect', 'repair', 'install-cell', 'deliver-nutrients', 'submit-checklist']) {
    session = reduce(session, { type, location: 'greenhouse' })
    assert.strictEqual(session, original)
  }
  assert.equal(session.controls.oxygenGeneratorOn, true)
  assert.equal(session.state.elapsedHours, 1)
})

test('advance uses the shared plan and exactly the existing resource equations', () => {
  let session = createResourceSession()
  session = reduce(session, { type: 'toggle', key: 'oxygenGeneratorOn' })
  session = reduce(session, { type: 'toggle', key: 'foodProductionOn' })
  const initial = freeze(session)
  const next = reduce(initial, { type: 'advance' })
  assert.deepEqual(next.state, advanceOutpostHour(initial.state, initial.controls))
  assert.equal(initial.state.elapsedHours, 0)
  assert.equal(next.state.elapsedHours, 1)
  assert.ok(Math.abs(next.state.resources.oxygenKg - 2.48) < 1e-9)
  assert.strictEqual(next.controls, initial.controls)
  assert.strictEqual(reduce(next, { type: 'close-terminal' }), next)
  assert.strictEqual(reduce(next, { type: 'open-terminal' }), next)
})

test('pending settings persist independently of committed state and shelter disables food production', () => {
  let session = createResourceSession()
  const originalState = freeze(session.state)
  session = reduce(session, { type: 'toggle', key: 'foodProductionOn' })
  session = reduce(session, { type: 'toggle', key: 'shelterMode' })
  assert.deepEqual(session.controls, { oxygenGeneratorOn: false, foodProductionOn: false, shelterMode: true })
  assert.strictEqual(session.state, originalState)
  assert.strictEqual(reduce(session, { type: 'close-terminal' }), session)
  session = reduce(session, { type: 'toggle', key: 'shelterMode' })
  assert.equal(session.controls.foodProductionOn, false)
  assert.throws(() => reduce(session, { type: 'toggle', key: 'unknown' }))
})

test('preview and terminal lifecycle events leave shared resources and separate mission progress untouched', () => {
  const session = freeze(createResourceSession())
  const snapshot = structuredClone(session)
  const missions = freeze(explorationReducer(createExplorationSession(), { type: 'start' }))
  const missionsBefore = structuredClone(missions)
  const preview = advanceOutpostHour(session.state, session.controls)
  assert.equal(preview.elapsedHours, 1)
  assert.deepEqual(session, snapshot)
  assert.strictEqual(reduce(session, { type: 'close-terminal' }), session)
  assert.deepEqual(missions, missionsBefore)
})

test('resource restart intentionally resets time, resources and settings without changing exploration state', () => {
  let session = reduce(createResourceSession(), { type: 'toggle', key: 'oxygenGeneratorOn' })
  session = reduce(session, { type: 'advance' })
  const exploration = freeze(explorationReducer(createExplorationSession(), { type: 'start' }))
  const snapshot = structuredClone(exploration)
  const restarted = reduce(freeze(session), { type: 'restart' })
  assert.deepEqual(restarted, createResourceSession())
  assert.equal(session.state.elapsedHours, 1)
  assert.deepEqual(exploration, snapshot)
})

test('completed or failed resource sessions reject further advancement but permit restart', () => {
  for (const status of ['succeeded', 'failed']) {
    const session = createResourceSession()
    session.state = { ...session.state, status, elapsedHours: status === 'succeeded' ? 72 : 1 }
    freeze(session)
    assert.strictEqual(reduce(session, { type: 'advance' }), session)
    assert.strictEqual(reduce(session, { type: 'toggle', key: 'oxygenGeneratorOn' }), session)
    assert.deepEqual(reduce(session, { type: 'restart' }), createResourceSession())
  }
})

test('resource terminal interaction is reachable inside Mission Control and blocked across its closed door', () => {
  const doors = createDoorState()
  const terminal = selectInteriorInteraction(0, -11, doors)
  assert.equal(terminal.id, 'mission-control')
  assert.equal(terminal.action, 'resources')
  assert.equal(terminal.prompt, 'Open Resource Management')
  assert.notEqual(selectInteriorInteraction(0, -6.5, doors)?.action, 'resources')
})
