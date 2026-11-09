import { Vector3 } from 'three';
import { DEFAULT_EYE_HEIGHT_IN, type RoomView } from '../scene/placeholder-room';
import { polygonCentroid } from '../scene/wall-geometry';
import { inToM } from './units';
import type { Placement, Venue, Viewpoint } from '../types';

const DEFAULT_STANDOFF_IN = 72;
const SEATED_EYE_IN = 48;

/** Saved viewpoints or one auto view per wall that has art (pitch order). */
export function resolveViewpoints(venue: Venue): Viewpoint[] {
  if (venue.viewpoints.length > 0) return venue.viewpoints;
  return autoViewpointsForArtWalls(venue);
}

export function viewpointToRoomView(vp: Viewpoint): RoomView {
  const eyeIn = vp.eyeHeightIn ?? vp.position.yIn ?? DEFAULT_EYE_HEIGHT_IN;
  return {
    position: new Vector3(inToM(vp.position.xIn), inToM(eyeIn), inToM(vp.position.zIn)),
    lookAt: new Vector3(inToM(vp.lookAt.xIn), inToM(vp.lookAt.yIn), inToM(vp.lookAt.zIn)),
  };
}

function autoViewpointsForArtWalls(venue: Venue): Viewpoint[] {
  const wallsWithArt = new Set(venue.placements.map((p) => p.wallId));
  const centroid = polygonCentroid(venue.corners);
  const n = venue.corners.length;
  const views: Viewpoint[] = [];

  venue.walls.forEach((wall, wi) => {
    if (!wallsWithArt.has(wall.id)) return;
    const start = venue.corners[wi]!;
    const end = venue.corners[(wi + 1) % n]!;
    const vp = viewpointFacingWall(wall.id, wall.label, start, end, centroid);
    views.push(vp);
    if (wall.furnitureTopIn !== undefined && wall.furnitureTopIn > 0) {
      views.push(
        viewpointFacingWall(
          `${wall.id}-seated`,
          `From the booths — ${shortLabel(wall.label)}`,
          start,
          end,
          centroid,
          SEATED_EYE_IN,
        ),
      );
    }
  });

  return views;
}

function viewpointFacingWall(
  id: string,
  label: string,
  start: { xIn: number; zIn: number },
  end: { xIn: number; zIn: number },
  centroid: ReturnType<typeof polygonCentroid>,
  eyeIn = DEFAULT_EYE_HEIGHT_IN,
): Viewpoint {
  const midXIn = (start.xIn + end.xIn) / 2;
  const midZIn = (start.zIn + end.zIn) / 2;
  const inwardX = centroid.x - midXIn;
  const inwardZ = centroid.y - midZIn;
  const inwardLen = Math.hypot(inwardX, inwardZ) || 1;
  const ux = inwardX / inwardLen;
  const uz = inwardZ / inwardLen;
  const standoff = Math.min(DEFAULT_STANDOFF_IN, Math.max(36, inwardLen * 0.35));

  return {
    id,
    label: shortLabel(label),
    position: { xIn: midXIn + ux * standoff, yIn: eyeIn, zIn: midZIn + uz * standoff },
    lookAt: { xIn: midXIn, yIn: eyeIn, zIn: midZIn },
    eyeHeightIn: eyeIn,
  };
}

function shortLabel(label: string): string {
  const beforeParen = label.split('(')[0]?.trim();
  return beforeParen && beforeParen.length > 0 ? beforeParen : label;
}

/** Walls that have placements, in wall list order (for linking later). */
export function artWallIds(venue: Venue): string[] {
  const set = new Set(venue.placements.map((p: Placement) => p.wallId));
  return venue.walls.filter((w) => set.has(w.id)).map((w) => w.id);
}
