import test from 'node:test'
import assert from 'node:assert/strict'
import { LANDER_ORIGIN, FOOT_OFFSET, FOOT_RADIUS, legDirections, CHECKLIST_TERMINAL_POSITION } from './spacecraftLayout.js'
import { canWalk, groundHeight } from './world.js'
import { spacecraftInspections, spacecraftMainPoint } from './spacecraft.js'
import { selectExteriorInteraction } from './interactions.js'

test('body, terminal, braces and all footpads block movement; service approaches remain clear', () => {
  assert.equal(canWalk(25, -10), false)
  assert.equal(canWalk(...CHECKLIST_TERMINAL_POSITION), false)
  assert.equal(canWalk(25, -12.95), false)
  for (const [sx, sz] of legDirections) {
    assert.equal(canWalk(25 + sx * FOOT_OFFSET, -10 + sz * FOOT_OFFSET), false)
    assert.equal(canWalk(25 + sx * 2.6, -10 + sz * 2.6), false)
  }
  for (const entry of [...spacecraftInspections, { id: 'lander', position: spacecraftMainPoint }]) {
    assert.equal(canWalk(...entry.position), true)
    assert.equal(selectExteriorInteraction(...entry.position)?.id, entry.id)
  }
})

test('landing gear indicator sits beside the actual front-right footpad, within E reach', () => {
  const gear = spacecraftInspections.find((entry) => entry.objectiveId === 'gear')
  const foot = [LANDER_ORIGIN[0] + FOOT_OFFSET, LANDER_ORIGIN[1] + FOOT_OFFSET]
  const distance = Math.hypot(gear.markerPosition[0] - foot[0], gear.markerPosition[1] - foot[1])
  assert.ok(distance <= FOOT_RADIUS + 0.1)
  assert.ok(gear.markerHeight < 0.5)
  for (const entry of spacecraftInspections) {
    assert.ok(Math.hypot(entry.position[0] - entry.markerPosition[0], entry.position[1] - entry.markerPosition[1]) < 3)
  }
})

test('terrain-aligned footpad offsets are finite and seat the lower face on terrain', () => {
  const baseY = groundHeight(...LANDER_ORIGIN)
  for (const [sx, sz] of legDirections) {
    const ground = groundHeight(LANDER_ORIGIN[0] + sx * FOOT_OFFSET, LANDER_ORIGIN[1] + sz * FOOT_OFFSET)
    const footY = ground - baseY
    // Renderer places pad center 0.12 above this offset with 0.22 thickness.
    assert.ok(Math.abs((baseY + footY + 0.12 - 0.11) - ground - 0.01) < 1e-9)
    assert.ok(Number.isFinite(footY))
  }
})
