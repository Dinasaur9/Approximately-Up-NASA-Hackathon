import test from 'node:test'
import assert from 'node:assert/strict'
import { dismissIntroduction, getExplorationOverlay } from './explorationOverlay.js'

const view = (location, dismissed, locked = false, blocked = false) => getExplorationOverlay({ location, dismissed, locked, blocked })

test('each location introduces itself only until dismissed in the current session', () => {
  let dismissed = Object.freeze([])
  for (const location of ['exterior', 'interior', 'greenhouse']) {
    assert.equal(view(location, dismissed), 'introduction')
    const previous = dismissed
    dismissed = Object.freeze(dismissIntroduction(dismissed, location))
    assert.notStrictEqual(previous, dismissed)
    assert.equal(previous.includes(location), false)
    assert.equal(view(location, dismissed), 'resume')
    assert.strictEqual(dismissIntroduction(dismissed, location), dismissed)
  }
  for (const location of ['interior', 'exterior', 'greenhouse', 'interior']) assert.equal(view(location, dismissed), 'resume')
})

test('inventory, missions, inspections, help, and fades suppress all exploration overlays', () => {
  for (const location of ['exterior', 'interior', 'greenhouse']) {
    for (const dismissed of [[], [location]]) {
      assert.equal(view(location, dismissed, false, true), 'hidden')
      assert.equal(view(location, dismissed, true, true), 'hidden')
    }
    const dismissed = dismissIntroduction([], location)
    for (const panel of ['inventory', 'missions', 'inspection', 'help']) {
      assert.equal(view(location, dismissed, false, Boolean(panel)), 'hidden')
      assert.equal(view(location, dismissed, false, false), 'resume')
    }
  }
})

test('pointer lock and Escape change visibility without resetting tutorial history', () => {
  const dismissed = Object.freeze(['exterior', 'interior', 'greenhouse'])
  const before = [...dismissed]
  for (const location of dismissed) {
    for (let cycle = 0; cycle < 5; cycle++) {
      assert.equal(view(location, dismissed, true), 'hidden')
      assert.equal(view(location, dismissed, false), 'resume')
    }
  }
  assert.deepEqual(dismissed, before)
})

test('first-visit introduction stays hidden during transition and appears after it ends', () => {
  const dismissed = ['exterior']
  assert.equal(view('interior', dismissed, false, true), 'hidden')
  assert.equal(view('interior', dismissed), 'introduction')
  const after = dismissIntroduction(dismissed, 'interior')
  assert.equal(view('exterior', after), 'resume')
  assert.equal(view('greenhouse', after), 'introduction')
})
