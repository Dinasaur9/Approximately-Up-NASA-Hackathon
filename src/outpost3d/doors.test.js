import test from 'node:test'
import assert from 'node:assert/strict'
import { rooms, doors, createDoorState, toggleDoor, canWalkInterior, selectInteriorInteraction, interiorInteractions } from './interior.js'
import { interiorStations } from './interiorStations.js'

const allOpen = () => Object.fromEntries(doors.map((door) => [door.id, true]))

test('six compartments and four doors connect walkable thresholds', () => {
  assert.equal(rooms.length, 6)
  const closed = createDoorState(), open = allOpen()
  for (const door of doors) {
    assert.equal(canWalkInterior(door.x, door.z, closed), false, door.id)
    assert.equal(canWalkInterior(door.x, door.z, open), true, door.id)
    for (let step = -1.5; step <= 1.5; step += 0.1) {
      assert.equal(canWalkInterior(door.x + (door.axis === 'x' ? step : 0), door.z + (door.axis === 'z' ? step : 0), open), true, `${door.id}:${step}`)
    }
  }
})

test('doors toggle from either side, reject repeat close on occupied threshold, and reopen inside', () => {
  for (const door of doors) {
    const start = createDoorState()
    const offset = door.axis === 'x' ? [1.5, 0] : [0, 1.5]
    const open = toggleDoor(start, door.id, door.x + offset[0], door.z + offset[1])
    assert.equal(start[door.id], false)
    assert.equal(open[door.id], true)
    assert.strictEqual(toggleDoor(open, door.id, door.x, door.z), open)
    assert.strictEqual(toggleDoor(open, door.id, door.x + 0.3, door.z), open)
    const closed = toggleDoor(open, door.id, door.x - offset[0], door.z - offset[1])
    assert.equal(closed[door.id], false)
    assert.equal(toggleDoor(closed, door.id, door.x - offset[0], door.z - offset[1])[door.id], true)
    assert.strictEqual(toggleDoor(start, door.id, 60, 60), start)
    assert.strictEqual(toggleDoor(start, 'unknown', 0, 0), start)
  }
})

test('room stations cannot be inspected through closed doors or adjacent walls', () => {
  const closed = createDoorState()
  for (const station of interiorStations) {
    assert.equal(selectInteriorInteraction(...station.position, closed)?.id, station.id)
  }
  assert.notEqual(selectInteriorInteraction(0, -6.8, closed)?.id, 'mission-control')
  assert.notEqual(selectInteriorInteraction(1, -3, closed)?.id, 'research')
  assert.notEqual(selectInteriorInteraction(3.5, -0.5, allOpen())?.id, 'crew-quarters')
  assert.equal(selectInteriorInteraction(0, 7, closed)?.action, 'exit')
})

test('door prompts update immediately without selecting other stations behind walls', () => {
  const state = createDoorState()
  for (const door of doors) {
    const x = door.x + (door.axis === 'x' ? 1 : 0), z = door.z + (door.axis === 'z' ? 1 : 0)
    assert.match(selectInteriorInteraction(x, z, state)?.prompt || '', /^Open /)
    const open = toggleDoor(state, door.id, x, z)
    assert.match(selectInteriorInteraction(x, z, open)?.prompt || '', /^Close /)
  }
})

test('all stations and exit are reachable from airlock with open doors', () => {
  // Grid flood-fill catches disconnected rooms, wall gaps and blocked approaches.
  const state = allOpen(), queue = [[0, 5]], visited = new Set(['0,5'])
  for (let index = 0; index < queue.length; index++) {
    const [x, z] = queue[index]
    for (const [dx, dz] of [[0.25, 0], [-0.25, 0], [0, 0.25], [0, -0.25]]) {
      const nx = x + dx, nz = z + dz, key = `${nx},${nz}`
      if (!visited.has(key) && canWalkInterior(nx, nz, state)) { visited.add(key); queue.push([nx, nz]) }
    }
  }
  for (const entry of interiorInteractions) assert.ok(visited.has(entry.position.join(',')), entry.id)
  for (const [x, z] of [[2, -1], [-2, 1], [0, -14], [9, 3], [-9, -3], [8, 3], [-8, -3], [8, -2], [0, -13]]) {
    assert.equal(canWalkInterior(x, z, state), false, `${x},${z}`)
  }
})
