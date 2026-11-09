/** Pause WebGL redraw loops when the tab is hidden (FEAT-07 REQ-07-05). */
let paused = false;

export function setRenderPaused(value: boolean): void {
  paused = value;
}

export function isRenderPaused(): boolean {
  return paused;
}

export function bindVisibilityPause(): void {
  if (typeof document === 'undefined') return;
  const sync = () => setRenderPaused(document.visibilityState === 'hidden');
  sync();
  document.addEventListener('visibilitychange', sync);
}
