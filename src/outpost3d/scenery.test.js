import test from 'node:test'
import assert from 'node:assert/strict'
import { BOUNDARY, groundHeight } from './world.js'
import { scenicHeight, regolithShade, createScenicRocks, rockSurfaceHeight } from './scenery.js'

test('scenery preserves exact playable heights including entrances and mission routes', () => {
  for (let x = -BOUNDARY; x <= BOUNDARY; x += 0.5) {
    for (let z = -BOUNDARY; z <= BOUNDARY; z += 0.5) assert.equal(scenicHeight(x, z), groundHeight(x, z))
  }
})
test('all boulders stay beyond the movement boundary including their full geometry', () => {
  const rocks = createScenicRocks()
  assert.deepEqual(rocks, createScenicRocks())
  for (const rock of rocks) {
    assert.ok(Math.max(Math.abs(rock.x), Math.abs(rock.z)) - rock.size * 1.6 > BOUNDARY + 2)
    assert.equal(rock.y, rockSurfaceHeight(rock.x, rock.z))
  }
})
test('distant terrain and regolith are finite, varied, deterministic and bounded', () => {
  const heights = new Set(), shades = new Set()
  for (let x = -240; x <= 240; x += 3) for (let z = -240; z <= 240; z += 3) {
    const height = scenicHeight(x, z), shade = regolithShade(x, z)
    assert.ok(Number.isFinite(height) && height > -3 && height < 30)
    assert.ok(shade >= 0.48 && shade <= 0.75)
    assert.equal(height, scenicHeight(x, z))
    heights.add(height); shades.add(shade)
  }
  assert.ok(heights.size > 1000 && shades.size > 1000)
})

test('clustered rocks mix sizes, restrained proportions and gray shades with slope seating', () => {
  const rocks = createScenicRocks()
  assert.ok(rocks.length < 350 && rocks.length > 100)
  for (const range of [[0, 0.75], [0.75, 1.6], [1.6, 3]]) {
    assert.ok(rocks.some((rock) => rock.size >= range[0] && rock.size < range[1]))
  }
  assert.equal(new Set(rocks.map((rock) => rock.cluster)).size, 18)
  for (const rock of rocks) {
    assert.ok(rock.normal.every(Number.isFinite))
    assert.ok(rock.shade >= 0.49 && rock.shade <= 0.64)
    assert.ok(Math.max(...rock.scale) / Math.min(...rock.scale) < 2.1)
  }
  // At a mesh vertex the seating height includes the horizon's exact offset.
  assert.ok(Math.abs(rockSurfaceHeight(120, 120) - (scenicHeight(120, 120) - 0.04)) < 1e-10)
})
