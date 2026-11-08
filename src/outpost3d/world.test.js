import test from 'node:test'
import assert from 'node:assert/strict'
import { canWalk, groundHeight, BOUNDARY, craters } from './world.js'

test('spawn and approach are open; structures and player-radius margins block movement', () => {
  assert.equal(canWalk(0, 16), true)
  assert.equal(canWalk(0, 1), true)
  for (const [x, z] of [[0, -8], [0, -2], [14, -8], [-15, -5], [-23, -5], [6.3, -8]]) {
    assert.equal(canWalk(x, z), false)
  }
  assert.equal(canWalk(7, -8), true)
})

test('all world edges contain the player', () => {
  assert.equal(canWalk(BOUNDARY, 0), true)
  for (const [x, z] of [[BOUNDARY + 0.01, 0], [-BOUNDARY - 0.01, 0], [0, BOUNDARY + 0.01], [0, -BOUNDARY - 0.01]]) {
    assert.equal(canWalk(x, z), false)
  }
})

test('terrain stays finite across playable area and crater floors sit below rims', () => {
  for (let x = -BOUNDARY; x <= BOUNDARY; x += 1) {
    for (let z = -BOUNDARY; z <= BOUNDARY; z += 1) {
      assert.ok(Number.isFinite(groundHeight(x, z)))
      assert.ok(Math.abs(groundHeight(x, z)) < 2)
    }
  }
  for (const [x, z, radius] of craters) assert.ok(groundHeight(x, z) < groundHeight(x + radius, z))
})
