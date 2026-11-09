import { BoxHelper, type ColorRepresentation, type Object3D, type Scene } from 'three';

const OUTLINE_COLOR: ColorRepresentation = 0xe86c2a;

/** Single selection outline (not color-only — shared rule 7). */
export class ArtworkOutline {
  private helper: BoxHelper | undefined;

  setSelection(scene: Scene, target: Object3D | undefined): void {
    this.clear();
    if (!target) return;
    this.helper = new BoxHelper(target, OUTLINE_COLOR);
    this.helper.name = 'artwork-selection-outline';
    scene.add(this.helper);
  }

  clear(): void {
    if (!this.helper) return;
    this.helper.parent?.remove(this.helper);
    this.helper.geometry.dispose();
    this.helper = undefined;
  }
}
