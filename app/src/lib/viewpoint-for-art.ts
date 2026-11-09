import type { Viewpoint, Venue } from '../types';

/** Viewpoint index that best shows a wall (prefers standing over seated). */
export function viewpointIndexForWall(wallId: string, viewpoints: Viewpoint[]): number {
  const exact = viewpoints.findIndex((v) => v.id === wallId);
  if (exact >= 0) return exact;
  return viewpoints.findIndex((v) => v.id === `${wallId}-seated` || v.id.startsWith(`${wallId}-`));
}

export function viewpointIndexForArtwork(
  artworkId: string,
  venue: Venue,
  viewpoints: Viewpoint[],
): number {
  const placement = venue.placements.find((p) => p.artworkId === artworkId);
  if (!placement) return 0;
  const idx = viewpointIndexForWall(placement.wallId, viewpoints);
  return idx >= 0 ? idx : 0;
}
