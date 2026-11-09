// Fictional training lander dimensions, not a reproduction of a flight vehicle.
export const LANDER_ORIGIN = [25, -10]
export const FOOT_OFFSET = 3.6
export const FOOT_RADIUS = 0.8
export const CHECKLIST_TERMINAL_POSITION = [23, -4.8]
export const CHECKLIST_APPROACH = [23, -3.5]
export const legDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
export const spacecraftFootprints = [
  [22.3, 27.7, -13.1, -7.2], // Descent stage, rear service housing, nozzle and access ladder
  ...legDirections.map(([x, z]) => {
    const xs = [25 + x * 1.6, 25 + x * FOOT_OFFSET - FOOT_RADIUS, 25 + x * FOOT_OFFSET + FOOT_RADIUS]
    const zs = [-10 + z * 1.6, -10 + z * FOOT_OFFSET - FOOT_RADIUS, -10 + z * FOOT_OFFSET + FOOT_RADIUS]
    return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
  }),
  [CHECKLIST_TERMINAL_POSITION[0] - 0.45, CHECKLIST_TERMINAL_POSITION[0] + 0.45,
    CHECKLIST_TERMINAL_POSITION[1] - 0.35, CHECKLIST_TERMINAL_POSITION[1] + 0.35],
]
