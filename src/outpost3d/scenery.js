import { BOUNDARY, groundHeight } from './world.js'

// Deterministic presentation data; the playable height/collision functions stay unchanged.
const fract = (value) => value - Math.floor(value)
export const scenicRandom = (seed) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453)
const smooth = (value) => value * value * (3 - 2 * value)
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z)
  const u = smooth(fract(x)), v = smooth(fract(z))
  const a = scenicRandom(ix * 31 + iz * 173)
  const b = scenicRandom((ix + 1) * 31 + iz * 173)
  const c = scenicRandom(ix * 31 + (iz + 1) * 173)
  const d = scenicRandom((ix + 1) * 31 + (iz + 1) * 173)
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}
export function scenicHeight(x, z) {
  const distance = Math.max(Math.abs(x), Math.abs(z))
  const blend = smooth(Math.min(1, Math.max(0, (distance - BOUNDARY - 10) / 45)))
  return groundHeight(x, z) + blend * (3 + 18 * noise(x * 0.024, z * 0.024) + 7 * noise(x * 0.057, z * 0.057))
}
export function regolithShade(x, z) {
  return 0.48 + 0.19 * noise(x * 0.12, z * 0.12) + 0.08 * noise(x * 0.7, z * 0.7)
}
// Match the distant mesh's triangles, rather than sampling the analytic height
// between vertices (which can leave a rock floating above a coarse terrain face).
export function rockSurfaceHeight(x, z) {
  const step = 3 // 480 / 160: unchanged horizon geometry.
  const x0 = Math.floor((x + 240) / step) * step - 240
  const z0 = Math.floor((z + 240) / step) * step - 240
  const u = (x - x0) / step, v = (z - z0) / step
  const a = scenicHeight(x0, z0), b = scenicHeight(x0 + step, z0)
  const c = scenicHeight(x0, z0 + step), d = scenicHeight(x0 + step, z0 + step)
  return (u + v <= 1 ? a + u * (b - a) + v * (c - a)
    : d + (1 - u) * (c - d) + (1 - v) * (b - d)) - 0.04
}
export function createScenicRocks() {
  const rocks = []
  for (let cluster = 0; cluster < 18; cluster++) {
    // Rejection sampling avoids a conspicuous circular belt around the base.
    let seed = cluster * 101 + 41, cx, cz
    do {
      cx = (scenicRandom(seed++) * 2 - 1) * 190
      cz = (scenicRandom(seed++) * 2 - 1) * 190
    } while (Math.max(Math.abs(cx), Math.abs(cz)) < 115)
    const spread = 5 + scenicRandom(seed++) * 11
    const count = 7 + Math.floor(scenicRandom(seed++) * 12)
    for (let member = 0; member < count; member++) {
      const id = cluster * 1000 + member * 17
      const angle = scenicRandom(id + 2) * Math.PI * 2
      const radius = Math.sqrt(scenicRandom(id + 3)) * spread
      const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius * (0.5 + scenicRandom(id + 4))
      const category = scenicRandom(id + 5)
      const size = category < 0.64 ? 0.22 + scenicRandom(id + 6) * 0.48
        : category < 0.94 ? 0.75 + scenicRandom(id + 6) * 0.75 : 1.6 + scenicRandom(id + 6) * 0.8
      if (Math.max(Math.abs(x), Math.abs(z)) - size * 1.6 <= 100) continue
      const sx = size * (0.9 + scenicRandom(id + 7) * 0.3)
      const sy = size * (0.6 + scenicRandom(id + 8) * 0.2)
      const sz = size * (0.85 + scenicRandom(id + 9) * 0.3)
      const dx = (rockSurfaceHeight(x + 0.15, z) - rockSurfaceHeight(x - 0.15, z)) / 0.3
      const dz = (rockSurfaceHeight(x, z + 0.15) - rockSurfaceHeight(x, z - 0.15)) / 0.3
      rocks.push({ x, z, y: rockSurfaceHeight(x, z), size, scale: [sx, sy, sz],
        normal: [-dx, 1, -dz], rotation: scenicRandom(id + 10) * Math.PI * 2,
        shade: 0.49 + scenicRandom(id + 11) * 0.15, cluster })
    }
  }
  return rocks
}
