const METERS_PER_INCH = 0.0254;

/** Venue and artwork data is in inches; the Three.js scene is in meters. */
export function inToM(inches: number): number {
  return inches * METERS_PER_INCH;
}

/** "24 × 36 in" */
export function formatSize(widthIn: number, heightIn: number): string {
  return `${formatInches(widthIn)} × ${formatInches(heightIn)} in`;
}

/** "14 ft 6 in", "9 in" */
export function formatFeetInches(inches: number): string {
  const rounded = Math.round(inches);
  const feet = Math.floor(rounded / 12);
  const rest = rounded % 12;
  if (feet === 0) return `${rest} in`;
  if (rest === 0) return `${feet} ft`;
  return `${feet} ft ${rest} in`;
}

function formatInches(inches: number): string {
  return Number.isInteger(inches) ? String(inches) : inches.toFixed(1);
}
