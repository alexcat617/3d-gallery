import { Mesh, Quaternion, Vector2, Vector3 } from 'three';
import { inToM } from '../lib/units';
import type { Point2 } from '../types';

export interface WallSegment {
  start: Point2;
  end: Point2;
  lengthIn: number;
  /** Unit along the wall from start → end. */
  along: Vector3;
  /** Normal pointing into the room (horizontal). */
  inward: Vector3;
  mid: Vector3;
}

export function polygonCentroid(corners: Point2[]): Vector2 {
  let a = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < corners.length; i++) {
    const p0 = corners[i]!;
    const p1 = corners[(i + 1) % corners.length]!;
    const cross = p0.xIn * p1.zIn - p1.xIn * p0.zIn;
    a += cross;
    cx += (p0.xIn + p1.xIn) * cross;
    cz += (p0.zIn + p1.zIn) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-6) {
    const xs = corners.map((c) => c.xIn);
    const zs = corners.map((c) => c.zIn);
    return new Vector2(
      xs.reduce((s, x) => s + x, 0) / corners.length,
      zs.reduce((s, z) => s + z, 0) / corners.length,
    );
  }
  return new Vector2(cx / (6 * a), cz / (6 * a));
}

export function wallSegment(start: Point2, end: Point2, centroid: Vector2): WallSegment {
  const sx = inToM(start.xIn);
  const sz = inToM(start.zIn);
  const ex = inToM(end.xIn);
  const ez = inToM(end.zIn);
  const dx = ex - sx;
  const dz = ez - sz;
  const length = Math.hypot(dx, dz);
  const along = new Vector3(dx / length, 0, dz / length);

  const mid = new Vector3((sx + ex) / 2, 0, (sz + ez) / 2);
  const inward = new Vector3(-along.z, 0, along.x);
  const toCentroid = new Vector3(inToM(centroid.x) - mid.x, 0, inToM(centroid.y) - mid.z);
  if (inward.dot(toCentroid) < 0) inward.multiplyScalar(-1);

  return {
    start,
    end,
    lengthIn: length / inToM(1),
    along,
    inward,
    mid,
  };
}

const _normalPlusZ = new Vector3(0, 0, 1);

export function alignMeshNormalToInward(mesh: Mesh, seg: WallSegment): void {
  mesh.quaternion.setFromUnitVectors(_normalPlusZ, seg.inward);
}

/** Reuse quaternion for Groups (same basis as mesh alignment). */
export function wallFacingQuaternion(seg: WallSegment): Quaternion {
  return new Quaternion().setFromUnitVectors(_normalPlusZ, seg.inward);
}
