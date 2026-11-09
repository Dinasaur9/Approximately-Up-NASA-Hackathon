import { spacecraftFootprints } from './spacecraftLayout.js'

// Procedural scenery only; independent of the resource and landing simulations.
export const BOUNDARY = 65
export const EYE_HEIGHT = 1.7
export const craters = [[-24, -20, 9], [27, 22, 11], [-32, 30, 7], [36, -35, 13]]
export function groundHeight(x, z) {
  let height = 0.18 * Math.sin(x * 0.13) * Math.cos(z * 0.17)
  for (const [cx, cz, radius] of craters) {
    const distance = Math.hypot(x - cx, z - cz) / radius
    height += 0.7 * Math.exp(-(((distance - 1) / 0.17) ** 2)) - 1.1 * Math.exp(-((distance / 0.7) ** 4))
  }
  return height
}

// World-space footprints expanded by the player's radius in canWalk().
export const footprints = [
  [-6, 6, -12, -4], // Habitat
  [-1.8, 1.8, -4.2, -0.8], // Airlock
  [10, 18, -12, -4], // Greenhouse
  ...[-15, -23].map((x) => [x - 3.5, x + 3.5, -12, 2]),
  ...spacecraftFootprints,
  [6, 8, -1, 1], // Oxygen equipment
  [-17, -13, 2.4, 3.6], // Battery bank
  [18.5, 21.5, 3, 5], // Communications pedestal
  [-9.1, -4.9, 5.1, 6.9], // Cargo
]
export function canWalk(x, z) {
  const radius = 0.45
  return Math.abs(x) <= BOUNDARY && Math.abs(z) <= BOUNDARY &&
    !footprints.some(([left, right, back, front]) =>
      x > left - radius && x < right + radius && z > back - radius && z < front + radius)
}
