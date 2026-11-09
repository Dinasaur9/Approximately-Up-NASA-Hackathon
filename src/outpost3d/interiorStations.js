// Stable station IDs and domains are extension points for future gameplay.
// These entries are educational exhibits, with no live readings or model access.
export const interiorStations = [
  {
    id: 'mission-control', name: 'Mission Control Terminal', domain: 'mission-monitoring',
    action: 'inspect', room: 'mission-control', position: [0, -11],
    description: 'Mission control brings together schedules, communications, and equipment status so a crew can coordinate its work. Comparing information from several systems helps engineers spot conflicts before making a decision.',
    function: 'Coordinate mission plans and review system information.',
    relationship: 'Future mission and crew monitoring could help balance tasks against power and life-support needs. This exhibit shows no live telemetry.',
  },
  {
    id: 'life-support', name: 'Life-Support Console', domain: 'life-support',
    action: 'inspect', room: 'life-support', position: [-6, -3],
    description: 'A pressurized habitat needs more than oxygen. Carbon dioxide removal, ventilation, temperature control, and water handling help maintain a livable environment. Sensors and regular maintenance help the crew find problems early.',
    function: 'Help operators understand and maintain the habitat environment.',
    relationship: 'Life support depends on electrical energy, stored supplies, and working equipment. Mission 01 lets you replace a filtration cartridge using inventory items. The resource simulation remains separate.',
  },
  {
    id: 'crew-quarters', name: 'Crew Quarters', domain: 'crew-health',
    action: 'inspect', room: 'crew-quarters', position: [6, 3],
    description: 'Crew members need protected space to sleep, store personal equipment, and recover between tasks. Noise control, privacy, and a planned work-rest schedule support attention and teamwork during a long mission.',
    function: 'Provide a dedicated area for rest and personal storage.',
    relationship: 'Rest and organization support crew well-being and mission logistics. Inspecting this area does not restore health or change inventory.',
  },
  {
    id: 'research', name: 'Research Workstation', domain: 'research',
    action: 'inspect', room: 'research', position: [6, -3],
    description: 'A lunar research workstation provides space to document samples, compare observations, and plan experiments. Careful labeling and records help connect a sample to its collection location and make results useful to other scientists.',
    function: 'Organize sample observations and experiment records.',
    relationship: 'Research uses crew time, equipment, power, and storage. Research objectives and inventory will be added later; this station is informational only.',
  },
]
