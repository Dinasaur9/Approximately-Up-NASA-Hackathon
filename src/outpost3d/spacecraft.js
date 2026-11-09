import { canWalk } from './world.js'
import { CHECKLIST_APPROACH } from './spacecraftLayout.js'

export const spacecraftMainPoint = CHECKLIST_APPROACH
export const spacecraftInspections = [
  {
    id: 'lander-gear', objectiveId: 'gear', name: 'Landing Gear', action: 'inspect',
    prompt: 'Inspect Landing Gear', position: [28.5, -4.5], marker: '01 / GEAR', markerPosition: [28.6, -5.55], markerHeight: 0.35, markerRotation: 0,
    recordLabel: 'Record Landing Gear Inspection',
    description: 'Landing legs support the spacecraft after touchdown. Wide footpads distribute its load over the lunar surface, while diagonal braces and shock-absorber sections help manage landing forces. From beside this footpad, look for visible structural damage, uneven seating, or signs of instability. This fictional training checklist does not certify real spacecraft flight safety.',
    function: 'Support the parked spacecraft and distribute loads across the surface.',
    relationship: 'Stable landing gear protects the crew, cargo, and spacecraft after touchdown. Recording this checklist does not alter landing physics.',
  },
  {
    id: 'lander-propulsion', objectiveId: 'propulsion', name: 'Propulsion Assembly', action: 'inspect',
    prompt: 'Inspect Propulsion Assembly', position: [28.5, -10], marker: '02 / ENGINE', markerPosition: [27.76, -10], markerHeight: 1.9, markerRotation: Math.PI / 2,
    recordLabel: 'Record Propulsion Inspection',
    description: 'The descent engine helps control landing by producing thrust; its bell-shaped nozzle directs the exhaust. Mounts carry engine loads, and thermal protection helps surrounding structures withstand operating conditions. View the parked engine beneath the descent stage from this side service panel and note visible damage or abnormal conditions. The engine remains off; a simple visual check is not flight-safety certification.',
    function: 'Produce and direct thrust during descent.',
    relationship: 'Post-flight inspection documents the propulsion assembly for mission planning. This parked training spacecraft does not fire its engine or consume fuel.',
  },
  {
    id: 'lander-comms', objectiveId: 'communications', name: 'Communications', action: 'inspect',
    prompt: 'Inspect Communications', position: [25, -14.5], marker: '03 / COMMS', markerPosition: [25, -13.02], markerHeight: 1.4, markerRotation: Math.PI,
    recordLabel: 'Record Communications Inspection',
    description: 'Antennas support communication with mission control or other spacecraft. The connected equipment transmits telemetry and receives commands; antenna alignment, clear lines of sight, and equipment condition affect reliability. Inspect the ground-level service housing here and look up at its connected mast and dish. This educational record does not verify an actual radio link or certify spacecraft safety.',
    function: 'Support spacecraft communications and telemetry links.',
    relationship: 'Reliable communication supports crew coordination and mission logistics. Recording this training check does not establish a real radio link.',
  },
]

export function canInspectSpacecraftPoint(x, z, point) {
  const distance = Math.hypot(x - point[0], z - point[1])
  if (!Number.isFinite(distance) || distance > 3) return false
  const steps = Math.max(1, Math.ceil(distance / 0.04))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    if (!canWalk(x + (point[0] - x) * t, z + (point[1] - z) * t)) return false
  }
  return true
}
export const atSpacecraft = (x, z) => [spacecraftMainPoint, ...spacecraftInspections.map((entry) => entry.position)].some((point) => canInspectSpacecraftPoint(x, z, point))
