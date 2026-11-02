import { LoadingManager } from 'three';

/**
 * Wraps a Three.js LoadingManager so non-texture work (venue data) and,
 * later, textures and scans all feed one progress bar.
 */
export class LoadTracker {
  readonly manager = new LoadingManager();

  constructor(onProgress: (fraction: number) => void) {
    this.manager.onProgress = (_url, loaded, total) => {
      onProgress(total > 0 ? loaded / total : 1);
    };
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
