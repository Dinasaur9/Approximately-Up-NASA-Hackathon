// Shared registry: positions are accessible inspection points outside collision boxes.
export const INTERACTION_RANGE = 3
export const interactables = [
  { id: 'airlock', name: 'Airlock', position: [0, 1.8], function: 'Maintain a controlled pressure boundary.', relationship: 'Oxygen conservation and crew protection.', description: 'An airlock provides a controlled transition between the lunar surface and the pressurized habitat. Closing one door before opening the other limits atmosphere loss. Interior access is planned for a later phase.' },
  { id: 'greenhouse', name: 'Greenhouse', position: [14, -2], function: 'Provide a controlled environment for agriculture.', relationship: 'Food production uses electrical power and life-support infrastructure.', description: 'Plants require light, water, nutrients, and temperature control. Protected growing space can supplement stored food, but it competes with other systems for energy.' },
  { id: 'solar', name: 'Solar Power Station', position: [-15, 5], function: 'Convert sunlight into electricity and store energy.', relationship: 'Stored power supports oxygen generation, agriculture, and essential habitat systems.', description: 'Solar arrays generate electricity in sunlight. Battery storage bridges periods without generation. Generating capacity and stored energy are different engineering constraints.' },
  { id: 'oxygen', name: 'Oxygen Generator', position: [7, 3], function: 'Produce and condition breathable oxygen.', relationship: 'Life support requires electrical power, feedstock, and maintenance.', description: 'Electrolysis can separate water into oxygen and hydrogen. Tanks buffer production and demand, while filters and monitoring support atmosphere management. This exhibit is informational and does not run the resource simulation.' },
  { id: 'communications', name: 'Communications Station', position: [20, 7], function: 'Link the crew with mission control.', relationship: 'Power, navigation, scientific data, and mission logistics.', description: 'A directional antenna sends telemetry and research data and receives instructions. Reliable links depend on antenna pointing, available power, and line of sight.' },
  { id: 'cargo', name: 'Cargo Storage', position: [-7, 9], function: 'Protect and organize mission supplies.', relationship: 'Food reserves, replacement parts, and mission logistics.', description: 'Cargo containers keep supplies organized and protected. Spare parts and stored provisions give the crew options when equipment fails or resupply is delayed.' },
  { id: 'lander', name: 'Lunar Lander', position: [25, -4], function: 'Deliver crew and cargo to the lunar surface.', relationship: 'Transportation, mission logistics, and limited consumable reserves.', description: 'Landing legs spread loads over the ground, while the descent engine controls touchdown. Insulation, communications, and observation ports support the mission. This spacecraft is parked; inspecting it does not start the landing simulator.' },
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
