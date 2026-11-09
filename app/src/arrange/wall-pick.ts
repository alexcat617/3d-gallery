import { Mesh, Object3D, Raycaster, Vector2, Vector3, type PerspectiveCamera } from 'three';
import type { Venue } from '../types';
import { inToM } from '../lib/units';
import { wallSegmentForIndex } from './wall-camera';

const raycaster = new Raycaster();
const pointer = new Vector2();
const _hit = new Vector3();

export interface WallHit {
  wallIndex: number;
  wallId: string;
  centerFromLeftIn: number;
  centerFromFloorIn: number;
}

export function pickWallPlacement(
  clientX: number,
  clientY: number,
  canvas: HTMLElement,
  camera: PerspectiveCamera,
  room: Object3D,
  venue: Venue,
  activeWallId: string | undefined,
): WallHit | undefined {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const wallMeshes: Mesh[] = [];
  room.traverse((node) => {
    if (node instanceof Mesh && venue.walls.some((w) => w.id === node.name)) {
      if (!activeWallId || node.name === activeWallId) wallMeshes.push(node);
    }
  });

  const hits = raycaster.intersectObjects(wallMeshes, false);
  if (hits.length === 0) return undefined;

  const wallId = hits[0]!.object.name;
  const wallIndex = venue.walls.findIndex((w) => w.id === wallId);
  if (wallIndex < 0) return undefined;

  const seg = wallSegmentForIndex(venue, wallIndex);
  _hit.copy(hits[0]!.point);
  const alongM = new Vector3().subVectors(_hit, seg.mid).dot(seg.along);
  let centerFromLeftIn = alongM / inToM(1) + seg.lengthIn / 2;
  centerFromLeftIn = Math.max(0, Math.min(seg.lengthIn, centerFromLeftIn));
  const centerFromFloorIn = _hit.y / inToM(1);

  return { wallIndex, wallId, centerFromLeftIn, centerFromFloorIn };
}
