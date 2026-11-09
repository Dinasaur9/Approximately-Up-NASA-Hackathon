import { spacecraftInspections, spacecraftMainPoint, canInspectSpacecraftPoint } from './spacecraft.js'

// Shared registry: positions are accessible inspection points outside collision boxes.
export const INTERACTION_RANGE = 3
export const interactables = [
  { id: 'airlock', name: 'Habitat', action: 'inspect', panelAction: { label: 'Enter Habitat', action: 'enter' }, prompt: 'Inspect Habitat', position: [0, 1.8], function: 'Provide a pressurized home and a controlled boundary with the lunar surface.', relationship: 'Crew survival depends on breathable air, temperature control, radiation protection, power, and reliable life-support equipment.', description: 'The habitat gives astronauts a protected place to live, rest, and conduct research. Its life-support systems maintain the indoor environment. The airlock provides a controlled transition between the lunar surface and the pressurized habitat; closing one door before opening the other limits atmosphere loss.' },
  { id: 'greenhouse', name: 'Greenhouse', action: 'inspect', panelAction: { label: 'Enter Greenhouse', action: 'enter-greenhouse' }, position: [14, -2], function: 'Provide a controlled environment for agriculture.', relationship: 'Food production uses electrical power and life-support infrastructure.', description: 'Plants require light, water, nutrients, and temperature control. Protected growing space can supplement stored food, but it competes with other systems for energy. Hydroponic systems deliver water and dissolved nutrients to plant roots without soil.' },
  { id: 'solar', name: 'Solar Power Station', position: [-15, 5], function: 'Convert sunlight into electricity and store energy.', relationship: 'Stored power supports oxygen generation, agriculture, and essential habitat systems.', description: 'Solar arrays generate electricity in sunlight. Battery storage bridges periods without generation. Generating capacity and stored energy are different engineering constraints.' },
  { id: 'oxygen', name: 'Oxygen Generator', position: [7, 3], function: 'Produce and condition breathable oxygen.', relationship: 'Life support requires electrical power, feedstock, and maintenance.', description: 'Electrolysis can separate water into oxygen and hydrogen. Tanks buffer production and demand, while filters and monitoring support atmosphere management. This exhibit is informational and does not run the resource simulation.' },
  { id: 'communications', name: 'Communications Station', position: [20, 7], function: 'Link the crew with mission control.', relationship: 'Power, navigation, scientific data, and mission logistics.', description: 'A directional antenna sends telemetry and research data and receives instructions. Reliable links depend on antenna pointing, available power, and line of sight.' },
  { id: 'cargo', name: 'Cargo Storage', position: [-7, 9], function: 'Protect and organize mission supplies.', relationship: 'Food reserves, replacement parts, and mission logistics.', description: 'Cargo containers keep supplies organized and protected. Spare parts and stored provisions give the crew options when equipment fails or resupply is delayed.' },
  { id: 'lander', name: 'Lunar Lander', position: spacecraftMainPoint, function: 'Deliver crew and cargo to the lunar surface.', relationship: 'Transportation, mission logistics, and limited consumable reserves.', description: 'This fictional Apollo-inspired training lander has a modernized crew cabin/ascent stage above an insulated descent stage. Landing gear supports it, the descent engine controls landing thrust, and the antenna and communications housing carry telemetry and commands. The post-landing checklist documents three educational observations, not flight-safety certification. This spacecraft is parked; inspecting it does not start the landing simulator. It is not an exact reproduction of a NASA vehicle.' },
  ...spacecraftInspections,
]

/** Horizontal proximity; stable registry order breaks equal-distance ties. */
export function selectInteraction(x, z, entries = interactables, range = INTERACTION_RANGE) {
  if (![x, z, range].every(Number.isFinite) || range < 0) return null
  let nearest = null
  let distance = Infinity
  for (const entry of entries) {
    const candidateDistance = Math.hypot(x - entry.position[0], z - entry.position[1])
    if (candidateDistance <= range && candidateDistance < distance) {
      nearest = entry
      distance = candidateDistance
    }
  }
  return nearest
}

export function selectExteriorInteraction(x, z) {
  return selectInteraction(x, z, interactables.filter((entry) =>
    !(entry.id === 'lander' || entry.objectiveId) || canInspectSpacecraftPoint(x, z, entry.position)))
}
