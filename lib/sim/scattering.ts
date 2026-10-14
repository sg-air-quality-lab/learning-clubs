// Physics behind the "Inside the sensor" simulation, kept separate from the drawing so it can be tested.
//
// Simplified model:
// - A low-cost optical sensor converts flashes into a mass estimate assuming dry particles.
// - In humid air, haze particles take up water and swell. Their volume grows by
//   1 + κ · RH / (100 − RH)  (a simplified κ-Köhler growth law; κ ≈ 0.15 here).
// - Because the sensor treats the swollen particles as dry, its mass estimate grows by the same factor.
// This reproduces the well-known pattern: little error below ~60 % humidity, a large overestimate above ~85 %.

export const KAPPA = 0.15;

/** Factor by which particle volume grows at a given relative humidity (percent). */
export function volumeGrowth(rh: number, kappa = KAPPA): number {
  const r = Math.min(Math.max(rh, 0), 99);
  return 1 + (kappa * r) / (100 - r);
}

/** Factor by which particle diameter grows (cube root of the volume factor). */
export function diameterGrowth(rh: number, kappa = KAPPA): number {
  return Math.cbrt(volumeGrowth(rh, kappa));
}

/** What an uncorrected low-cost sensor would report for a true PM2.5 concentration (µg/m³). */
export function sensorReading(truePm25: number, rh: number, kappa = KAPPA): number {
  return truePm25 * volumeGrowth(rh, kappa);
}

/** Particles entering the drawn chamber per second for a given concentration. Purely visual scaling. */
export function spawnRate(truePm25: number): number {
  return 0.6 + truePm25 * 0.12;
}

/** Brightness of a flash: scattered light grows with the particle's cross-section (diameter squared). */
export function flashStrength(diameter: number): number {
  return diameter * diameter;
}

/** NEA 1-hour PM2.5 bands, as used on the dashboard. */
export function pm25Band(v: number): string {
  if (v < 55) return 'Normal';
  if (v < 150) return 'Elevated';
  if (v < 250) return 'High';
  return 'Very high';
}
