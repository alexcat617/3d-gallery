import { Box3, type Object3D, Vector3 } from 'three';
import { inToM } from '../lib/units';
import { DEFAULT_EYE_HEIGHT_IN, type RoomView } from './placeholder-room';

/** Orbit pivot: center of the room volume (not the last wall viewpoint). */
export function roomOrbitTarget(room: Object3D): Vector3 {
  return new Box3().setFromObject(room).getCenter(new Vector3());
}

/**
 * Camera pose for exploring the whole room — orbit target at center, standing-ish height.
 */
export function roomExploreView(room: Object3D): RoomView {
  const box = new Box3().setFromObject(room);
  const center = box.getCenter(new Vector3());
  const size = box.getSize(new Vector3());
  const span = Math.max(size.x, size.z, 1);
  const eye = Math.max(center.y, inToM(DEFAULT_EYE_HEIGHT_IN));
  const back = span * 0.72;
  const height = Math.max(span * 0.22, 0.35);

  const position = new Vector3(center.x + back * 0.35, eye + height, center.z + back * 0.65);
  return {
    position,
    lookAt: new Vector3(center.x, eye, center.z),
  };
}
