import test from 'node:test'
import assert from 'node:assert/strict'
import { createInventory, addItem, removeItem, ownsItem, collectItem, createInventorySession } from './inventory.js'
import { collectibles, availableCollectibles, selectCollectibleInteraction } from './collectibles.js'
import { selectInteraction, interactables } from './interactions.js'
import { selectGreenhouseInteraction } from './greenhouse.js'
import { transitionDestination } from './interior.js'

const freeze = (value) => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

test('fresh inventory uses six empty independent slots and rejects invalid operations', () => {
  assert.deepEqual(createInventory(), Array(6).fill(null))
  assert.notStrictEqual(createInventory(), createInventory())
  for (const n of [0, -1, 1.5, NaN, Infinity]) assert.throws(() => createInventory(n))
  for (const quantity of [0, -1, 1.5, NaN]) assert.throws(() => addItem(createInventory(), 'filter', quantity))
  assert.throws(() => addItem(createInventory(), 'missing', 1))
  assert.throws(() => removeItem([{ itemId: 'filter', quantity: 99 }], 'filter'))
})

test('stacking fills existing stacks before empty slots and honors each limit', () => {
  let inventory = addItem(createInventory(3), 'filter', 4).inventory
  assert.deepEqual(inventory, [{ itemId: 'filter', quantity: 3 }, { itemId: 'filter', quantity: 1 }, null])
  inventory = addItem(freeze(inventory), 'filter', 4).inventory
  assert.deepEqual(inventory, [{ itemId: 'filter', quantity: 3 }, { itemId: 'filter', quantity: 3 }, { itemId: 'filter', quantity: 2 }])
  assert.equal(ownsItem(inventory, 'filter', 8), true)
  assert.equal(ownsItem(inventory, 'filter', 9), false)
  assert.equal(ownsItem(inventory, 'tool'), false)
})

test('non-stackable tools use separate slots and full inventory refuses partial additions', () => {
  const inventory = freeze(addItem(createInventory(2), 'tool', 2).inventory)
  assert.deepEqual(inventory.map((slot) => slot.quantity), [1, 1])
  const failed = addItem(inventory, 'filter', 1)
  assert.equal(failed.ok, false)
  assert.strictEqual(failed.inventory, inventory)
  const partlyFull = freeze([{ itemId: 'cell', quantity: 1 }])
  assert.equal(addItem(partlyFull, 'cell', 1).ok, true)
  assert.strictEqual(addItem(partlyFull, 'cell', 2).inventory, partlyFull)
})

test('removal spans stacks, clears empty slots, and rejects insufficient quantities atomically', () => {
  const inventory = freeze(addItem(createInventory(3), 'filter', 5).inventory)
  const removed = removeItem(inventory, 'filter', 4)
  assert.deepEqual(removed.inventory, [null, { itemId: 'filter', quantity: 1 }, null])
  assert.strictEqual(removeItem(inventory, 'filter', 6).inventory, inventory)
  assert.deepEqual(removeItem(inventory, 'filter', 5).inventory, [null, null, null])
  assert.equal(ownsItem(inventory, 'filter', 5), true)
})

test('collection is immutable, hides unique objects and prevents repeat pickup even after removal', () => {
  const start = freeze(createInventorySession())
  const next = freeze(collectItem(start, collectibles[0]))
  assert.equal(ownsItem(next.inventory, 'filter'), true)
  assert.equal(availableCollectibles('exterior', next.collectedIds).some((entry) => entry.id === collectibles[0].id), false)
  assert.strictEqual(collectItem(next, collectibles[0]), next)
  assert.deepEqual(start.collectedIds, [])
  const removed = { ...next, inventory: removeItem(next.inventory, 'filter').inventory }
  assert.strictEqual(collectItem(removed, collectibles[0]), removed)
})

test('full inventory leaves world object available; freeing a slot permits retry', () => {
  const start = { ...createInventorySession(), inventory: addItem(createInventory(1), 'tool').inventory }
  const rejected = collectItem(freeze(start), collectibles[0])
  assert.match(rejected.notification, /Inventory full/)
  assert.deepEqual(rejected.collectedIds, [])
  assert.strictEqual(rejected.inventory, start.inventory)
  assert.ok(availableCollectibles('exterior', rejected.collectedIds).find((entry) => entry.id === collectibles[0].id))
  const retry = collectItem({ ...rejected, inventory: removeItem(rejected.inventory, 'tool').inventory }, collectibles[0])
  assert.equal(ownsItem(retry.inventory, 'filter'), true)
})

test('session keeps items and collected IDs across habitat, greenhouse and exterior transitions', () => {
  let session = collectItem(createInventorySession(), collectibles[0])
  const before = structuredClone(session)
  let location = transitionDestination('exterior', 'enter')
  assert.equal(location, 'interior')
  assert.deepEqual(availableCollectibles(location, session.collectedIds), [])
  location = transitionDestination(location, 'exit')
  location = transitionDestination(location, 'enter-greenhouse')
  assert.equal(location, 'greenhouse')
  assert.deepEqual(session, before)
  session = collectItem(session, collectibles.find((entry) => entry.itemId === 'nutrient'))
  location = transitionDestination(location, 'exit-greenhouse')
  assert.equal(location, 'exterior')
  assert.equal(ownsItem(session.inventory, 'filter'), true)
  assert.equal(ownsItem(session.inventory, 'nutrient', 2), true)
  assert.equal(session.collectedIds.length, 2)
  assert.ok(!availableCollectibles(location, session.collectedIds).some((entry) => entry.id === collectibles[0].id))
})

test('collectibles are reachable, nearest to their pickup position, scene-local and range-limited', () => {
  for (const object of collectibles) {
    const [x, z] = object.position
    const base = object.location === 'exterior' ? selectInteraction(x, z, interactables) : selectGreenhouseInteraction(x, z)
    const selected = selectCollectibleInteraction(x, z, object.location, [], base)
    assert.equal(selected.id, object.id)
    assert.equal(selected.action, 'collect')
    assert.match(selected.prompt, /^Collect /)
    assert.notEqual(selectCollectibleInteraction(x, z, object.location, [object.id], base)?.id, object.id)
    assert.equal(selectCollectibleInteraction(x, z, 'interior', [], null), null)
  }
  assert.equal(selectCollectibleInteraction(0, 16, 'exterior', [], null), null)
  assert.equal(selectCollectibleInteraction(NaN, 0, 'exterior', [], null), null)
  assert.equal(selectCollectibleInteraction(-7, 6.8, 'exterior', [], null), null)
})

test('nearest interaction wins; exact ties prioritize doors and transitions before collection', () => {
  const object = collectibles[0], [x, z] = object.position
  const door = { id: 'door', action: 'door', position: [x, z] }
  const exit = { id: 'exit', action: 'exit', position: [x, z] }
  const inspect = { id: 'inspect', action: 'inspect', position: [x, z] }
  assert.equal(selectCollectibleInteraction(x, z, 'exterior', [], door).id, 'door')
  assert.equal(selectCollectibleInteraction(x, z, 'exterior', [], exit).id, 'exit')
  assert.equal(selectCollectibleInteraction(x, z, 'exterior', [], inspect).id, object.id)
  assert.equal(selectCollectibleInteraction(x, z + 1, 'exterior', [], { ...inspect, position: [x, z + 1] }).id, 'inspect')
})
