// Invented, simplified gameplay values: NOT verified NASA engineering,
// nutrition, radiation safety, or medical data. Lighting is compressed;
// feedstocks, battery losses, crop startup, and individual crew are not modeled.
export const OUTPOST_CONFIG = Object.freeze({
  missionHours: 72,
  crewCount: 4,
  turnHours: 1,
  initialOxygenKg: 2.4,
  oxygenCapacityKg: 6,
  initialBatteryKWh: 18,
  batteryCapacityKWh: 24,
  initialFoodKg: 12,
  foodCapacityKg: 16,
  initialHealth: 100,
  maximumHealth: 100,
  radiationFailureMGy: 60,
  lightingCycleHours: 12,
  sunlightHoursPerCycle: 6,
  stormWindows: Object.freeze([
    Object.freeze([25, 30]),
    Object.freeze([49, 54]),
  ]),
  solarPowerKW: 5,
  habitatPowerKW: 1,
  shelterPowerKW: 0.5,
  oxygenPowerKW: 2,
  foodPowerKW: 1,
  oxygenProductionKgPerHour: 0.24,
  oxygenConsumptionKgPerHour: 0.16, // Total for all four astronauts.
  foodProductionKgPerHour: 0.10,
  foodConsumptionKgPerHour: 0.20, // Total for all four astronauts.
  normalDoseMGyPerHour: 1,
  stormDoseMGyPerHour: 8,
  passiveTransmission: 0.50,
  shelterTransmission: 0.10,
  oxygenShortageHealthPenalty: 40,
  foodShortageHealthPenalty: 10,
  habitatOutageHealthPenalty: 25,
})
