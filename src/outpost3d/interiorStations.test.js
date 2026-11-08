import test from 'node:test'
import assert from 'node:assert/strict'
import { interiorStations } from './interiorStations.js'
import { canWalkInterior, interiorInteractions, transitionDestination } from './interior.js'
import { interactables, selectInteraction } from './interactions.js'

test('all four stations are reachable and independently selectable', () => {
  assert.deepEqual(interiorStations.map((station) => station.name), [
    'Mission Control Terminal', 'Life-Support Console', 'Crew Quarters', 'Research Workstation',
  ])
  assert.equal(new Set(interiorInteractions.map((entry) => entry.id)).size, 5)
  for (const station of interiorStations) {
    assert.equal(canWalkInterior(...station.position), true, station.id)
    assert.equal(selectInteraction(...station.position, interiorInteractions).id, station.id)
    assert.equal(station.action, 'inspect')
    assert.equal(transitionDestination('interior', station.action), null)
    assert.ok(station.description && station.function && station.relationship && station.domain)
    assert.equal(station.panelAction, undefined)
  }
})

test('habitat inspection defers entry to its explicit panel action', () => {
  const habitat = selectInteraction(0, 2.5, interactables)
  assert.equal(habitat.id, 'airlock')
  assert.equal(habitat.name, 'Habitat')
  assert.equal(habitat.prompt, 'Inspect Habitat')
  assert.equal(transitionDestination('exterior', habitat.action), null)
  assert.equal(transitionDestination('exterior', habitat.panelAction.action), 'interior')
  assert.match(habitat.description, /life-support/i)
  assert.match(habitat.relationship, /crew survival/i)
  for (const entry of interactables.filter((item) => !['airlock', 'greenhouse'].includes(item.id))) assert.equal(entry.panelAction, undefined)
})

test('exit remains available while remote stations stay out of range', () => {
  assert.equal(selectInteraction(0, 7, interiorInteractions).action, 'exit')
  assert.equal(selectInteraction(0, 0, interiorInteractions), null)
  assert.equal(selectInteraction(0, 16, interiorInteractions), null)
})
