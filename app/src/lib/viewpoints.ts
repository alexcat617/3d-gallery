import { Vector3 } from 'three';
import { artworks as defaultArtworks } from '../data';
import { DEFAULT_EYE_HEIGHT_IN, type RoomView } from '../scene/placeholder-room';
import { polygonCentroid } from '../scene/wall-geometry';
import { inToM } from './units';
import type { Artwork, Placement, Venue, Viewpoint } from '../types';

const SEATED_EYE_IN = 48;

/** Matches `Viewer` vertical FOV (`scene/viewer.ts`). */
const TOUR_CAMERA_FOV_DEG = 60;
/** Portrait phone width/height for auto-framing heuristics. */
const PHONE_VIEW_ASPECT = 9 / 16;
/** Target share of vertical FOV for the tallest piece on the wall (wall context around it). */
const ART_FILL_VERTICAL = 0.36;
const ART_FILL_HORIZONTAL = 0.4;
const MIN_STANDOFF_IN = 72;
const MAX_STANDOFF_IN = 168;
const ROOM_STANDOFF_MARGIN_IN = 18;

/** Saved viewpoints or one auto view per wall that has art (pitch order). */
export function resolveViewpoints(venue: Venue, catalog: Artwork[] = defaultArtworks): Viewpoint[] {
  if (venue.viewpoints.length > 0) return venue.viewpoints;
  return autoViewpointsForArtWalls(venue, catalog);
}

export function viewpointToRoomView(vp: Viewpoint): RoomView {
  const eyeIn = vp.eyeHeightIn ?? vp.position.yIn ?? DEFAULT_EYE_HEIGHT_IN;
  return {
    position: new Vector3(inToM(vp.position.xIn), inToM(eyeIn), inToM(vp.position.zIn)),
    lookAt: new Vector3(inToM(vp.lookAt.xIn), inToM(vp.lookAt.yIn), inToM(vp.lookAt.zIn)),
  };
}

function autoViewpointsForArtWalls(venue: Venue, catalog: Artwork[]): Viewpoint[] {
  const wallsWithArt = new Set(venue.placements.map((p) => p.wallId));
  const centroid = polygonCentroid(venue.corners);
  const n = venue.corners.length;
  const views: Viewpoint[] = [];

  venue.walls.forEach((wall, wi) => {
    if (!wallsWithArt.has(wall.id)) return;
    const start = venue.corners[wi]!;
    const end = venue.corners[(wi + 1) % n]!;
    const vp = viewpointFacingWall(wall.id, wall.label, start, end, centroid, venue, catalog);
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
          catalog,
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
  catalog: Artwork[],
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

  const seated = eyeIn < DEFAULT_EYE_HEIGHT_IN;
  const framing = framingStandoffIn(wallId, venue.placements, catalog);
  const roomCap = maxStandoffIntoRoom(inwardLen);
  let standoff = Math.min(MAX_STANDOFF_IN, Math.max(MIN_STANDOFF_IN, framing));
  standoff = Math.min(standoff, roomCap);
  if (seated) standoff = Math.max(MIN_STANDOFF_IN * 0.85, standoff * 0.92);

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

/** Distance so art occupies ~ART_FILL_* of the tour camera FOV (matches phone portrait). */
function framingStandoffIn(
  wallId: string,
  placements: Placement[],
  catalog: Artwork[],
): number {
  const byId = new Map(catalog.map((a) => [a.id, a]));
  const onWall = placements.filter((p) => p.wallId === wallId);
  let maxW = 24;
  let maxH = 36;
  for (const p of onWall) {
    const art = byId.get(p.artworkId);
    if (!art) continue;
    const outer = outerSizeIn(art);
    maxW = Math.max(maxW, outer.w);
    maxH = Math.max(maxH, outer.h);
  }

  const vHalfRad = (TOUR_CAMERA_FOV_DEG * Math.PI) / 180 / 2;
  const hHalfRad = Math.atan(Math.tan(vHalfRad) * PHONE_VIEW_ASPECT);

  const distForHeight = maxH / 2 / Math.tan(vHalfRad * ART_FILL_VERTICAL);
  const distForWidth = maxW / 2 / Math.tan(hHalfRad * ART_FILL_HORIZONTAL);
  return Math.max(distForHeight, distForWidth);
}

function outerSizeIn(art: Artwork): { w: number; h: number } {
  const frameW = art.frame?.widthIn ?? 0;
  if (frameW > 0 && art.frame) {
    return { w: art.widthIn + 2 * frameW, h: art.heightIn + 2 * frameW };
  }
  return { w: art.widthIn, h: art.heightIn };
}

/** Max step into the room from a wall point (centroid distance × 2 ≈ opposite wall in a simple rectangle). */
function maxStandoffIntoRoom(inwardLenToCentroid: number): number {
  return Math.max(MIN_STANDOFF_IN, inwardLenToCentroid * 2 - ROOM_STANDOFF_MARGIN_IN);
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
