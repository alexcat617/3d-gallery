import { Vector3 } from 'three';
import { DEFAULT_EYE_HEIGHT_IN, type RoomView } from '../scene/placeholder-room';
import { polygonCentroid, wallSegment } from '../scene/wall-geometry';
import { inToM } from '../lib/units';
import type { Venue } from '../types';

const ARRANGE_STANDOFF_IN = 84;

/** Straight-on camera for arrange mode when a wall is selected. */
export function wallStraightOnView(venue: Venue, wallIndex: number): RoomView {
  const n = venue.corners.length;
  const start = venue.corners[wallIndex]!;
  const end = venue.corners[(wallIndex + 1) % n]!;
  const centroid = polygonCentroid(venue.corners);
  const midXIn = (start.xIn + end.xIn) / 2;
  const midZIn = (start.zIn + end.zIn) / 2;
  const inwardX = centroid.x - midXIn;
  const inwardZ = centroid.y - midZIn;
  const inwardLen = Math.hypot(inwardX, inwardZ) || 1;
  const ux = inwardX / inwardLen;
  const uz = inwardZ / inwardLen;
  const eyeIn = DEFAULT_EYE_HEIGHT_IN;

  return {
    position: new Vector3(
      inToM(midXIn + ux * ARRANGE_STANDOFF_IN),
      inToM(eyeIn),
      inToM(midZIn + uz * ARRANGE_STANDOFF_IN),
    ),
    lookAt: new Vector3(inToM(midXIn), inToM(eyeIn), inToM(midZIn)),
  };
}

export function wallSegmentForIndex(venue: Venue, wallIndex: number) {
  const n = venue.corners.length;
  const centroid = polygonCentroid(venue.corners);
  return wallSegment(venue.corners[wallIndex]!, venue.corners[(wallIndex + 1) % n]!, centroid);
}
