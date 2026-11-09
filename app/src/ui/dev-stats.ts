/** Optional frame timing overlay (`?debug`, FEAT-07 REQ-07-07). */
export class DevStatsOverlay {
  private readonly el: HTMLElement;
  private lastMark = performance.now();

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'dev-stats';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    document.body.append(this.el);
  }

  markFrame(): void {
    const now = performance.now();
    const ms = now - this.lastMark;
    this.lastMark = now;
    this.el.textContent = `Frame ${ms.toFixed(0)} ms`;
  }

  dispose(): void {
    this.el.remove();
  }
}
