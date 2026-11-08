import test from 'node:test'
import assert from 'node:assert/strict'
import { selectInteraction, interactables, INTERACTION_RANGE } from './interactions.js'
import { canWalk } from './world.js'

test('all seven inspection points are reachable and select their equipment', () => {
  assert.equal(interactables.length, 7)
  assert.equal(new Set(interactables.map((entry) => entry.id)).size, 7)
  for (const entry of interactables) {
    assert.equal(canWalk(...entry.position), true, entry.id)
    assert.equal(selectInteraction(...entry.position).id, entry.id)
    assert.ok(entry.name && entry.function && entry.description && entry.relationship)
  }
})

test('interaction range is inclusive and out-of-range objects are unavailable', () => {
  const entries = [{ id: 'test', position: [0, 0] }]
  assert.equal(selectInteraction(INTERACTION_RANGE, 0, entries)?.id, 'test')
  assert.equal(selectInteraction(INTERACTION_RANGE + 0.001, 0, entries), null)
  assert.equal(selectInteraction(0, 0, [], 3), null)
  assert.equal(selectInteraction(0, 16), null)
  assert.equal(selectInteraction(NaN, 0), null)
  assert.equal(selectInteraction(0, 0, entries, -1), null)
})

test('overlapping ranges select one nearest object with stable tie-breaking', () => {
  const entries = [{ id: 'first', position: [-1, 0] }, { id: 'second', position: [1, 0] }]
  assert.equal(selectInteraction(0.5, 0, entries).id, 'second')
  assert.equal(selectInteraction(0, 0, entries).id, 'first')
})

test('new equipment and lander footprints block walking while surrounding approaches remain open', () => {
  for (const [x, z] of [[25, -10], [28.6, -6.4], [7, 0], [-15, 3], [20, 4], [-7, 6]]) {
    assert.equal(canWalk(x, z), false)
  }
  for (const entry of interactables) assert.equal(canWalk(...entry.position), true)
})
