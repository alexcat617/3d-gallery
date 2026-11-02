import {
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { inToM } from '../lib/units';
import type { Venue } from '../types';

export const DEFAULT_EYE_HEIGHT_IN = 63;
const DEFAULT_WALL_COLOR = '#e9e4dc';

export interface RoomView {
  position: Vector3;
  lookAt: Vector3;
}

/**
 * Gray-box room from the venue outline: floor, ceiling, and flat walls at
 * `ceilingIn`. FEAT-01 replaces this with photo walls, openings, and soffits.
 */
export function createPlaceholderRoom(venue: Venue): Group {
  if (venue.corners.length < 3) {
    throw new Error(`Venue ${venue.id} needs at least 3 corners`);
  }

  const room = new Group();
  room.name = 'placeholder-room';
  const height = inToM(venue.ceilingIn);

  const wallMaterial = new MeshStandardMaterial({
    color: new Color(venue.wallColor ?? DEFAULT_WALL_COLOR),
    roughness: 0.95,
    side: DoubleSide,
  });

  venue.corners.forEach((start, index) => {
    const end = venue.corners[(index + 1) % venue.corners.length]!;
    const dx = inToM(end.xIn - start.xIn);
    const dz = inToM(end.zIn - start.zIn);
    const length = Math.hypot(dx, dz);
    if (length === 0) return;

    const wall = new Mesh(new PlaneGeometry(length, height), wallMaterial);
    wall.name = venue.walls[index]?.id ?? `wall-${index}`;
    wall.position.set(inToM(start.xIn) + dx / 2, height / 2, inToM(start.zIn) + dz / 2);
    wall.rotation.y = Math.atan2(-dz, dx);
    room.add(wall);
  });

  const outline = new Shape(venue.corners.map((c) => new Vector2(inToM(c.xIn), -inToM(c.zIn))));
  const floorGeometry = new ShapeGeometry(outline);

  const floor = new Mesh(
    floorGeometry,
    new MeshStandardMaterial({ color: '#b9ad9d', roughness: 1, side: DoubleSide }),
  );
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  const ceiling = new Mesh(
    floorGeometry,
    new MeshStandardMaterial({ color: '#f4f2ee', roughness: 1, side: DoubleSide }),
  );
  ceiling.name = 'ceiling';
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.y = height;
  room.add(ceiling);

  room.add(new HemisphereLight('#ffffff', '#b0a89c', 1.6));
  const sun = new DirectionalLight('#ffffff', 1.2);
  sun.position.set(-3, 6, 4);
  room.add(sun);

  return room;
}

/** First saved viewpoint, or standing just inside the last wall facing across the room. */
export function initialView(venue: Venue): RoomView {
  const first = venue.viewpoints[0];
  if (first) {
    const eye = first.eyeHeightIn ?? first.position.yIn;
    return {
      position: new Vector3(inToM(first.position.xIn), inToM(eye), inToM(first.position.zIn)),
      lookAt: new Vector3(inToM(first.lookAt.xIn), inToM(first.lookAt.yIn), inToM(first.lookAt.zIn)),
    };
  }

  const xs = venue.corners.map((c) => c.xIn);
  const zs = venue.corners.map((c) => c.zIn);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const eye = inToM(DEFAULT_EYE_HEIGHT_IN);

  return {
    position: new Vector3(inToM(centerX), eye, inToM(maxZ - 24)),
    lookAt: new Vector3(inToM(centerX), eye, inToM(minZ)),
  };
}
