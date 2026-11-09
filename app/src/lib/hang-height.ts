import type { HangRules, Venue, Wall } from '../types';

const DEFAULTS: HangRules = {
  clearanceIn: 10,
  minCenterIn: 57,
  topMarginIn: 6,
};

/**
 * Resolved hang defaults for a venue (PRD hang height).
 */
export function resolveHangRules(venue: Venue): HangRules {
  const h = venue.hang ?? {};
  return {
    clearanceIn: h.clearanceIn ?? DEFAULTS.clearanceIn,
    minCenterIn: h.minCenterIn ?? DEFAULTS.minCenterIn,
    topMarginIn: h.topMarginIn ?? DEFAULTS.topMarginIn,
  };
}

/** Top of wainscoting/furniture obstruction from the floor (0 if none). */
export function clearTopIn(wall: Wall): number {
  return Math.max(wall.wainscotIn ?? 0, wall.furnitureTopIn ?? 0);
}

/**
 * Recommended vertical center for art (inches from floor), before clamping to wall top.
 * PRD: max(minCenterIn, clearTop + clearance + artHeight/2)
 */
export function recommendedCenterFromFloorIn(
  wall: Wall,
  outerHeightIn: number,
  hang: HangRules,
): number {
  const clearTop = clearTopIn(wall);
  return Math.max(hang.minCenterIn, clearTop + hang.clearanceIn + outerHeightIn / 2);
}

/**
 * Wall top height in inches at distance `fromLeftIn` along the wall (linear slope).
 */
export function wallTopAtFromLeft(wall: Wall, fromLeftIn: number, wallWidthIn: number, ceilingIn: number): number {
  if (wallWidthIn <= 0) return ceilingIn;
  const t = Math.min(1, Math.max(0, fromLeftIn / wallWidthIn));
  const hL = wall.heightIn ?? wall.heightLeftIn ?? ceilingIn;
  const hR = wall.heightIn ?? wall.heightRightIn ?? ceilingIn;
  return hL + (hR - hL) * t;
}

/** Minimum wall top along a horizontal span [left, right] on the wall (inches). */
export function minWallTopInSpan(
  wall: Wall,
  spanLeftIn: number,
  spanRightIn: number,
  wallWidthIn: number,
  ceilingIn: number,
): number {
  return Math.min(
    wallTopAtFromLeft(wall, spanLeftIn, wallWidthIn, ceilingIn),
    wallTopAtFromLeft(wall, spanRightIn, wallWidthIn, ceilingIn),
  );
}
