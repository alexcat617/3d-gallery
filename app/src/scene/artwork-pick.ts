import { Group, Mesh, Object3D, Raycaster, Vector2, type PerspectiveCamera } from 'three';

const raycaster = new Raycaster();
const pointer = new Vector2();

export function artworkIdFromObject(obj: Object3D): string | undefined {
  let current: Object3D | null = obj;
  while (current) {
    if (current.name.startsWith('artwork-')) {
      return current.name.slice('artwork-'.length);
    }
    current = current.parent;
  }
  return undefined;
}

export function collectArtworkMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof Mesh && node.parent?.name.startsWith('artwork-')) {
      meshes.push(node);
    }
  });
  return meshes;
}

/** Pick an artwork from a screen-space tap/click on the canvas. */
export function pickArtworkAt(
  clientX: number,
  clientY: number,
  canvas: HTMLElement,
  camera: PerspectiveCamera,
  room: Object3D,
): string | undefined {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const meshes = collectArtworkMeshes(room);
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return undefined;
  const hit = hits[0]!.object;
  return artworkIdFromObject(hit);
}

export function findArtworkGroup(room: Object3D, artworkId: string): Group | undefined {
  const found = room.getObjectByName(`artwork-${artworkId}`);
  return found instanceof Group ? found : undefined;
}
