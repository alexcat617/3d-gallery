import {
  Mesh,
  type Material,
  type Object3D,
  PerspectiveCamera,
  Scene,
  Sprite,
  WebGLRenderer,
} from 'three';
import { QUALITY_SETTINGS, type Quality } from '../lib/quality';
import type { RoomView } from './placeholder-room';

/**
 * Owns the WebGL renderer. Renders on demand (no animation loop) so an idle
 * pitch doesn't drain a phone battery.
 */
export class Viewer {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 1, 0.05, 100);
  readonly renderer: WebGLRenderer;
  private readonly resizeObserver: ResizeObserver;
  private room: Object3D | undefined;

  constructor(
    private readonly container: HTMLElement,
    quality: Quality,
    onContextLost: () => void,
  ) {
    const settings = QUALITY_SETTINGS[quality];
    this.renderer = new WebGLRenderer({ antialias: settings.antialias });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, settings.maxPixelRatio));

    const canvas = this.renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      onContextLost();
    });
    container.append(canvas);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  setLabel(label: string): void {
    this.renderer.domElement.setAttribute('aria-label', label);
  }

  setRoom(room: Object3D, view: RoomView): void {
    if (this.room) {
      this.scene.remove(this.room);
      disposeTree(this.room);
    }
    this.room = room;
    this.scene.add(room);
    this.camera.position.copy(view.position);
    this.camera.lookAt(view.lookAt);
    this.render();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    if (this.room) disposeTree(this.room);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
}

function disposeTree(root: Object3D): void {
  const geometries = new Set<{ dispose(): void }>();
  const materials = new Set<Material>();
  root.traverse((node) => {
    if (node instanceof Mesh || node instanceof Sprite) {
      geometries.add(node.geometry);
      const list = Array.isArray(node.material) ? node.material : [node.material];
      list.forEach((material) => materials.add(material));
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => {
    const map = 'map' in material ? (material as { map?: { dispose(): void } }).map : undefined;
    map?.dispose();
    material.dispose();
  });
}
