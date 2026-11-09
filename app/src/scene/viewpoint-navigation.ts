import { PerspectiveCamera, Vector3 } from 'three';
import { viewpointToRoomView } from '../lib/viewpoints';
import type { Viewpoint } from '../types';
import type { RoomView } from './placeholder-room';
import type { Viewer } from './viewer';

const GLIDE_MS = 700;
const YAW_LIMIT = (35 * Math.PI) / 180;
const PITCH_LIMIT = (15 * Math.PI) / 180;
const EASE_BACK_MS = 350;
const SWIPE_THRESHOLD_PX = 48;

const _forward = new Vector3();
const _right = new Vector3();
const _up = new Vector3(0, 1, 0);
const _lookAt = new Vector3();

export type ViewpointChangeHandler = (index: number, viewpoint: Viewpoint) => void;

/**
 * Owner camera: glide between saved views; drag to look within yaw/pitch limits.
 */
export class ViewpointNavigation {
  private readonly views: RoomView[];
  private index = 0;
  private yaw = 0;
  private pitch = 0;
  private animating = false;
  private animStart = 0;
  private animDuration = GLIDE_MS;
  private animFrom = new RoomViewVectors();
  private animTo = new RoomViewVectors();
  private easeBackStart = 0;
  private pointerId: number | undefined;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private swipeStartX = 0;
  private swipeStartY = 0;
  private raf = 0;
  private readonly reducedMotion: boolean;
  private disposed = false;

  constructor(
    private readonly viewer: Viewer,
    private readonly viewpoints: Viewpoint[],
    private readonly canvas: HTMLElement,
    private readonly onChange: ViewpointChangeHandler,
  ) {
    this.views = viewpoints.map((vp) => viewpointToRoomView(vp));
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.animDuration = this.reducedMotion ? 0 : GLIDE_MS;

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);
    document.addEventListener('keydown', this.onKeyDown);
  }

  get currentIndex(): number {
    return this.index;
  }

  get count(): number {
    return this.viewpoints.length;
  }

  currentViewpoint(): Viewpoint {
    return this.viewpoints[this.index]!;
  }

  goTo(index: number, options: { instant?: boolean } = {}): void {
    if (this.viewpoints.length === 0 || this.views.length === 0) return;
    const next = Math.max(0, Math.min(this.viewpoints.length - 1, index));
    if (next === this.index && !this.animating && !options.instant) {
      this.applyLook();
      this.viewer.render();
      return;
    }
    this.yaw = 0;
    this.pitch = 0;
    this.index = next;
    const view = this.views[next]!;
    const instant = options.instant || this.animDuration <= 0;

    if (instant) {
      this.viewer.camera.position.copy(view.position);
      this.viewer.camera.lookAt(view.lookAt);
      this.animating = false;
      this.viewer.render();
    } else {
      this.animFrom.copyFrom(this.viewer.camera);
      this.animTo.set(view);
      this.animating = true;
      this.animStart = performance.now();
      this.startLoop();
    }

    this.onChange(this.index, this.viewpoints[this.index]!);
  }

  next(): void {
    if (this.index < this.viewpoints.length - 1) this.goTo(this.index + 1);
  }

  prev(): void {
    if (this.index > 0) this.goTo(this.index - 1);
  }

  /** Called on first drag / nav so the one-time hint can hide. */
  onHintDismiss?: () => void;

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    document.removeEventListener('keydown', this.onKeyDown);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.onHintDismiss?.();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.onHintDismiss?.();
      this.prev();
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    this.onHintDismiss?.();
    this.pointerId = event.pointerId;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    this.swipeStartX = event.clientX;
    this.swipeStartY = event.clientY;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId || this.animating) return;
    const dx = event.clientX - this.lastPointerX;
    const dy = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    const yawDelta = (-dx / this.canvas.clientWidth) * YAW_LIMIT * 2.2;
    const pitchDelta = (-dy / this.canvas.clientHeight) * PITCH_LIMIT * 2.2;
    this.yaw = clamp(this.yaw + yawDelta, -YAW_LIMIT, YAW_LIMIT);
    this.pitch = clamp(this.pitch + pitchDelta, -PITCH_LIMIT, PITCH_LIMIT);
    this.applyLook();
    this.viewer.render();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    const totalDx = event.clientX - this.swipeStartX;
    const totalDy = event.clientY - this.swipeStartY;
    if (Math.abs(totalDx) > SWIPE_THRESHOLD_PX && Math.abs(totalDx) > Math.abs(totalDy) * 1.2) {
      if (totalDx < 0) this.next();
      else this.prev();
    }
    this.pointerId = undefined;
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    if (Math.abs(this.yaw) > 1e-5 || Math.abs(this.pitch) > 1e-5) {
      this.easeBackStart = performance.now();
      this.startLoop();
    }
  };

  private startLoop(): void {
    if (this.disposed) return;
    cancelAnimationFrame(this.raf);
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      let needsFrame = false;

      if (this.animating) {
        const t = this.animDuration <= 0 ? 1 : Math.min(1, (now - this.animStart) / this.animDuration);
        const ease = this.reducedMotion ? t : easeInOutCubic(t);
        this.animFrom.lerpTo(this.animTo, ease, this.viewer.camera);
        if (t >= 1) {
          this.animating = false;
          this.animTo.apply(this.viewer.camera);
        }
        needsFrame = true;
      }

      if (!this.animating && this.easeBackStart > 0 && (this.yaw !== 0 || this.pitch !== 0)) {
        const t = Math.min(1, (now - this.easeBackStart) / (this.reducedMotion ? 1 : EASE_BACK_MS));
        const k = 1 - easeOutCubic(t);
        this.yaw *= k;
        this.pitch *= k;
        if (t >= 1) {
          this.yaw = 0;
          this.pitch = 0;
          this.easeBackStart = 0;
        }
        this.applyLook();
        needsFrame = true;
      }

      this.viewer.render();
      if (needsFrame) {
        this.raf = requestAnimationFrame(tick);
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private applyLook(): void {
    const view = this.views[this.index]!;
    const camera = this.viewer.camera;
    camera.position.copy(view.position);
    _forward.copy(view.lookAt).sub(view.position).normalize();
    _right.crossVectors(_forward, _up).normalize();
    if (_right.lengthSq() < 1e-6) _right.set(1, 0, 0);

    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    const dir = new Vector3()
      .addScaledVector(_forward, cosP * cosY)
      .addScaledVector(_right, cosP * sinY)
      .addScaledVector(_up, sinP)
      .normalize();

    const dist = view.position.distanceTo(view.lookAt);
    _lookAt.copy(view.position).addScaledVector(dir, dist);
    camera.lookAt(_lookAt);
  }
}

class RoomViewVectors {
  readonly position = new Vector3();
  readonly lookAt = new Vector3();

  set(view: RoomView): void {
    this.position.copy(view.position);
    this.lookAt.copy(view.lookAt);
  }

  copyFrom(camera: PerspectiveCamera): void {
    this.position.copy(camera.position);
    camera.getWorldDirection(_forward);
    this.lookAt.copy(camera.position).addScaledVector(_forward, 4);
  }

  apply(camera: PerspectiveCamera): void {
    camera.position.copy(this.position);
    camera.lookAt(this.lookAt);
  }

  lerpTo(to: RoomViewVectors, t: number, camera: PerspectiveCamera): void {
    camera.position.lerpVectors(this.position, to.position, t);
    const look = new Vector3().lerpVectors(this.lookAt, to.lookAt, t);
    camera.lookAt(look);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
