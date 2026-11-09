import { LoadingManager } from 'three';

/**
 * Wraps a Three.js LoadingManager so non-texture work (venue data) and,
 * later, textures and scans all feed one progress bar.
 */
export class LoadTracker {
  readonly manager = new LoadingManager();

  constructor(onProgress: (fraction: number) => void) {
    let maxReported = 0;
    const report = (fraction: number) => {
      const next = Math.max(maxReported, Math.min(1, fraction));
      maxReported = next;
      onProgress(next);
    };
    this.manager.onProgress = (_url, loaded, total) => {
      report(total > 0 ? loaded / total : 0);
    };
    this.manager.onLoad = () => report(1);
  }

  async track<T>(key: string, work: Promise<T>): Promise<T> {
    this.manager.itemStart(key);
    try {
      return await work;
    } catch (error) {
      this.manager.itemError(key);
      throw error;
    } finally {
      this.manager.itemEnd(key);
    }
  }
}
