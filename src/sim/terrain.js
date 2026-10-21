import deGerlache from './terrain/deGerlache.json'

const CANVAS_WIDTH = 800
const TERRAIN_Y_TOP = 380 // pixel y of the highest terrain point (rim peak)
const TERRAIN_Y_BOTTOM = 560 // pixel y of the lowest terrain point (crater floor)
const PAD_WIDTH_PX = 120
const EDGE_MARGIN_PX = 50 // keep the pad clear of the canvas edges

export const TERRAIN_TOP_Y = TERRAIN_Y_TOP

// site metadata is the same regardless of where the pad lands this run
export const SITE = {
  site: deGerlache.site,
  source: deGerlache.source,
  centerLatDeg: deGerlache.centerLatDeg,
  centerLonDeg: deGerlache.centerLonDeg,
  realWidthM: deGerlache.realWidthM,
}

function findPadCandidates(elevations, widthInSamples, xForIndex) {
  const n = elevations.length
  const windows = []
  for (let i = 0; i <= n - widthInSamples; i++) {
    const x0 = xForIndex(i)
    const x1 = xForIndex(i + widthInSamples)
    if (x0 < EDGE_MARGIN_PX || x1 > CANVAS_WIDTH - EDGE_MARGIN_PX) continue
    let min = Infinity
    let max = -Infinity
    for (let j = i; j < i + widthInSamples; j++) {
      if (elevations[j] < min) min = elevations[j]
      if (elevations[j] > max) max = elevations[j]
    }
    windows.push({ start: i, range: max - min })
  }
  // mirrors how real Artemis candidate sites are picked for benign slopes:
  // prefer flatter spans, but keep several well-separated options for variety
  windows.sort((a, b) => a.range - b.range)
  const picked = []
  for (const w of windows) {
    if (picked.length >= 8) break
    const tooClose = picked.some((p) => Math.abs(p.start - w.start) < widthInSamples * 1.5)
    if (!tooClose) picked.push(w)
  }
  return picked
}

// remembered across calls (but not persisted) so two calls in a row never
// land on the same spot by chance, which would feel like it isn't random
let lastCandidateIndex = -1

// builds a fresh terrain instance with the landing pad placed at a random
// (but reasonably flat) spot, so every run of the sim looks different
export function createTerrain() {
  const elevations = deGerlache.elevationsM.slice()
  const n = elevations.length
  const xForIndex = (i) => (i / (n - 1)) * CANVAS_WIDTH
  const widthInSamples = Math.max(2, Math.round(PAD_WIDTH_PX / (CANVAS_WIDTH / (n - 1))))

  const candidates = findPadCandidates(elevations, widthInSamples, xForIndex)
  let index = Math.floor(Math.random() * candidates.length)
  if (candidates.length > 1 && index === lastCandidateIndex) {
    index = (index + 1 + Math.floor(Math.random() * (candidates.length - 1))) % candidates.length
  }
  lastCandidateIndex = index
  const chosen = candidates[index]

  const padStart = chosen.start
  const padEnd = padStart + widthInSamples
  let padSum = 0
  for (let i = padStart; i < padEnd; i++) padSum += elevations[i]
  const padElevation = padSum / widthInSamples
  for (let i = padStart; i < padEnd; i++) elevations[i] = padElevation

  const elevMin = Math.min(...elevations)
  const elevMax = Math.max(...elevations)
  const yForElevation = (e) =>
    TERRAIN_Y_BOTTOM -
    ((e - elevMin) / (elevMax - elevMin)) * (TERRAIN_Y_BOTTOM - TERRAIN_Y_TOP)

  const points = elevations.map((e, i) => ({ x: xForIndex(i), y: yForElevation(e) }))
  const padX = xForIndex(padStart)
  const padY = yForElevation(padElevation)

  function terrainYAt(x) {
    const clampedX = Math.min(Math.max(x, 0), CANVAS_WIDTH)
    const t = (clampedX / CANVAS_WIDTH) * (points.length - 1)
    const i0 = Math.floor(t)
    const i1 = Math.min(i0 + 1, points.length - 1)
    const frac = t - i0
    return points[i0].y + (points[i1].y - points[i0].y) * frac
  }

  return {
    points,
    padX,
    padWidth: xForIndex(padEnd) - padX,
    padY,
    terrainYAt,
    ...SITE,
  }
}
