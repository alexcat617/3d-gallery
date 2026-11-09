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
    const vp = viewpointFacingWall(wall.id, wall.label, start, end, centroid, venue);
    views.push(vp);
    if (wall.furnitureTopIn !== undefined && wall.furnitureTopIn > 0) {
      views.push(
        viewpointFacingWall(
          `${wall.id}-seated`,
          `From the booths — ${shortLabel(wall.label)}`,
          start,
          end,
          centroid,
          venue,
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
  venue: Venue,
  eyeIn = DEFAULT_EYE_HEIGHT_IN,
): Viewpoint {
  const wallId = id.replace(/-seated$/, '');
  const wallLenIn =
    Math.hypot(end.xIn - start.xIn, end.zIn - start.zIn) || 1;
  const focal = artFocalOnWall(wallId, venue, wallLenIn, eyeIn);

  const t = Math.max(0, Math.min(1, focal.alongIn / wallLenIn));
  const targetXIn = start.xIn + (end.xIn - start.xIn) * t;
  const targetZIn = start.zIn + (end.zIn - start.zIn) * t;

  const inwardX = centroid.x - targetXIn;
  const inwardZ = centroid.y - targetZIn;
  const inwardLen = Math.hypot(inwardX, inwardZ) || 1;
  const ux = inwardX / inwardLen;
  const uz = inwardZ / inwardLen;
  const standoff = Math.min(DEFAULT_STANDOFF_IN, Math.max(36, inwardLen * 0.35));

  return {
    id,
    label: shortLabel(label),
    position: {
      xIn: targetXIn + ux * standoff,
      yIn: eyeIn,
      zIn: targetZIn + uz * standoff,
    },
    lookAt: { xIn: targetXIn, yIn: focal.lookYIn, zIn: targetZIn },
    eyeHeightIn: eyeIn,
  };
}

/** Center auto views on hung art instead of the geometric wall midpoint. */
function artFocalOnWall(
  wallId: string,
  venue: Venue,
  wallLenIn: number,
  eyeIn: number,
): { alongIn: number; lookYIn: number } {
  const onWall = venue.placements.filter((p) => p.wallId === wallId);
  if (onWall.length === 0) {
    return { alongIn: wallLenIn / 2, lookYIn: eyeIn };
  }
  const alongIn =
    onWall.reduce((sum, p) => sum + p.centerFromLeftIn, 0) / onWall.length;
  const heights = onWall
    .map((p) => p.centerFromFloorIn)
    .filter((y): y is number => y !== undefined);
  const lookYIn =
    heights.length > 0
      ? heights.reduce((a, b) => a + b, 0) / heights.length
      : eyeIn;
  return { alongIn, lookYIn };
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
