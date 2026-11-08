import test from 'node:test'
import assert from 'node:assert/strict'
import { greenhouseInteractions, canWalkGreenhouse, selectGreenhouseInteraction, greenhouseProfile, greenhouseExteriorProfile, GREENHOUSE_HEIGHT } from './greenhouse.js'
import { interactables, selectInteraction } from './interactions.js'
import { transitionDestination, sceneProfiles } from './interior.js'
import { canWalk, EYE_HEIGHT } from './world.js'

test('greenhouse preserves inspection and offers explicit entry; habitat transitions remain unchanged', () => {
  const entrance = selectInteraction(14, -2, interactables)
  assert.equal(entrance.id, 'greenhouse')
  assert.equal(entrance.action, 'inspect')
  assert.match(entrance.description, /Plants require light, water, nutrients, and temperature control/)
  assert.match(entrance.description, /Hydroponic/)
  assert.equal(entrance.panelAction.label, 'Enter Greenhouse')
  assert.equal(transitionDestination('exterior', entrance.panelAction.action), 'greenhouse')
  assert.equal(transitionDestination('greenhouse', 'exit-greenhouse'), 'exterior')
  assert.equal(transitionDestination('exterior', 'enter'), 'interior')
  assert.equal(transitionDestination('interior', 'exit'), 'exterior')
  assert.equal(transitionDestination('interior', 'enter-greenhouse'), null)
  assert.equal(transitionDestination('greenhouse', 'exit'), null)
})

test('all four educational stations and the exit are selectable from safe approaches', () => {
  assert.equal(greenhouseInteractions.length, 5)
  for (const entry of greenhouseInteractions) {
    assert.equal(canWalkGreenhouse(...entry.position), true, entry.id)
    assert.equal(selectGreenhouseInteraction(...entry.position)?.id, entry.id)
    if (entry.action === 'inspect') assert.ok(entry.description && entry.function && entry.relationship && entry.domain)
  }
  assert.equal(selectGreenhouseInteraction(0, 5).action, 'exit-greenhouse')
  assert.equal(selectGreenhouseInteraction(0, 1), null)
})

test('walls, racks, tanks, terminal and storage block movement', () => {
  for (const position of [[6, 0], [-6, 0], [0, -10], [0, 6], [-3.9, -3], [3.9, -3], [-3.5, -8.5], [0, -8.7], [3.5, -8.5], [NaN, 0]]) {
    assert.equal(canWalkGreenhouse(...position), false, position.join(','))
    assert.equal(selectGreenhouseInteraction(...position), null)
  }
  assert.ok(EYE_HEIGHT > 0.1 && EYE_HEIGHT < GREENHOUSE_HEIGHT - 0.1)
})

test('every station is reachable from the entry without crossing equipment', () => {
  const queue = [[0, 3.5]], visited = new Set(['0,3.5'])
  for (let i = 0; i < queue.length; i++) {
    const [x, z] = queue[i]
    for (const [dx, dz] of [[0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1]]) {
      const nx = Math.round((x + dx) * 10) / 10, nz = Math.round((z + dz) * 10) / 10, key = `${nx},${nz}`
      if (!visited.has(key) && canWalkGreenhouse(nx, nz)) { visited.add(key); queue.push([nx, nz]) }
    }
  }
  for (const entry of greenhouseInteractions) assert.ok(visited.has(entry.position.join(',')), entry.id)
})

test('greenhouse return profile places player outside collision footprint near correct entrance', () => {
  assert.strictEqual(sceneProfiles.greenhouse, greenhouseProfile)
  assert.strictEqual(sceneProfiles.greenhouseExterior, greenhouseExteriorProfile)
  assert.equal(greenhouseProfile.canWalk(...greenhouseProfile.spawn), true)
  assert.equal(canWalk(...greenhouseExteriorProfile.spawn), true)
  assert.equal(selectInteraction(...greenhouseExteriorProfile.spawn).id, 'greenhouse')
  assert.notDeepEqual(greenhouseExteriorProfile.spawn, sceneProfiles.initial.spawn)
  assert.notDeepEqual(greenhouseExteriorProfile.spawn, sceneProfiles.exterior.spawn)
})
