export type Route =
  | { kind: 'home' }
  | { kind: 'venue'; venueId: string }
  | { kind: 'not-found' };

/** Production GitHub Pages base; also used when dev is opened with this prefix. */
const DEPLOY_BASE = '/3d-gallery/';

/** Paths are relative to Vite's base (`/3d-gallery/`). */
export function parseRoute(pathname: string, base: string): Route {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  // Stale dev servers may run with base `/` while links still use the GitHub Pages prefix.
  let effectiveBase: string | null = null;
  if (
    path.startsWith(normalizedBase) &&
    !(normalizedBase === '/' && path.startsWith(DEPLOY_BASE))
  ) {
    effectiveBase = normalizedBase;
  } else if (path.startsWith(DEPLOY_BASE)) {
    effectiveBase = DEPLOY_BASE;
  } else if (path.startsWith(normalizedBase)) {
    effectiveBase = normalizedBase;
  }
  if (!effectiveBase) return { kind: 'not-found' };
  const relative = path.slice(effectiveBase.length);
  const parts = relative.split('/').filter(Boolean);

  if (parts.length === 0) return { kind: 'home' };
  if (parts.length === 2 && parts[0] === 'v' && parts[1]) {
    return { kind: 'venue', venueId: decodeURIComponent(parts[1]) };
  }
  if (parts.length === 1 && parts[0] === 'index.html') return { kind: 'home' };
  return { kind: 'not-found' };
}
