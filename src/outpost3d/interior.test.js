import test from 'node:test'
import assert from 'node:assert/strict'
import { canWalkInterior, interiorInteractions, sceneProfiles, transitionDestination, INTERIOR_HEIGHT, createDoorState } from './interior.js'
import { selectInteraction, interactables } from './interactions.js'
import { EYE_HEIGHT } from './world.js'

test('airlock actions use the shared registry and reject invalid transitions', () => {
  const entrance = selectInteraction(0, 2.5, interactables)
  assert.equal(entrance.prompt, 'Inspect Habitat')
  assert.equal(transitionDestination('exterior', entrance.action), null)
  assert.equal(entrance.panelAction.label, 'Enter Habitat')
  assert.equal(transitionDestination('exterior', entrance.panelAction.action), 'interior')
  const exit = selectInteraction(0, 7, interiorInteractions)
  assert.equal(exit.prompt, 'Exit to Lunar Surface')
  assert.equal(transitionDestination('interior', exit.action), 'exterior')
  assert.equal(transitionDestination('interior', 'enter'), null)
  assert.equal(transitionDestination('exterior', 'exit'), null)
  assert.equal(transitionDestination('exterior', undefined), null)
})

test('spawn profiles are walkable with safe eye height and return near exterior entrance', () => {
  for (const profile of Object.values(sceneProfiles)) {
    assert.equal(profile.canWalk(...profile.spawn), true)
    assert.ok(Number.isFinite(profile.groundHeight(...profile.spawn) + EYE_HEIGHT))
  }
  assert.ok(EYE_HEIGHT > 0.1 && EYE_HEIGHT < INTERIOR_HEIGHT - 0.1)
  assert.notDeepEqual(sceneProfiles.initial.spawn, sceneProfiles.exterior.spawn)
  assert.equal(selectInteraction(...sceneProfiles.exterior.spawn).id, 'airlock')
})

test('continuous walkable path joins airlock, corridor and control room', () => {
  const open = Object.fromEntries(Object.keys(createDoorState()).map((id) => [id, true]))
  for (let z = 7; z >= -11; z -= 0.1) assert.equal(canWalkInterior(0, z, open), true, `z=${z}`)
  for (let x = -3.2; x <= 3.2; x += 0.1) assert.equal(canWalkInterior(x, -10, open), true)
})

test('walls, door jambs, equipment and corners keep the player inside', () => {
  for (const [x, z] of [[2, 0], [6, -8], [0, 8], [0, -12], [2, -1], [1.7, 4], [1.7, -4], [-4.8, -8], [4.8, -8], [0, -13], [2, 9], [NaN, 0]]) {
    assert.equal(canWalkInterior(x, z), false, `${x},${z}`)
  }
  assert.equal(canWalkInterior(0, 7), true)
  assert.notEqual(selectInteraction(0, -8, interiorInteractions)?.action, 'exit')
})

test('repeated entry and exit preserve source profiles and registry', () => {
  const before = JSON.stringify({ sceneProfiles, interactables, interiorInteractions })
  let location = 'exterior'
  for (let i = 0; i < 20; i++) {
    location = transitionDestination(location, 'enter')
    assert.equal(location, 'interior')
    assert.equal(sceneProfiles[location].canWalk(...sceneProfiles[location].spawn), true)
    location = transitionDestination(location, 'exit')
    assert.equal(location, 'exterior')
  }
  assert.equal(JSON.stringify({ sceneProfiles, interactables, interiorInteractions }), before)
})
