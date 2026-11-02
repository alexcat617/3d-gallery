export type Route =
  | { kind: 'home' }
  | { kind: 'venue'; venueId: string }
  | { kind: 'not-found' };

/** Paths are relative to Vite's base (`/3d-gallery/`). */
export function parseRoute(pathname: string, base: string): Route {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!path.startsWith(base)) return { kind: 'not-found' };
  const relative = path.slice(base.length);
  const parts = relative.split('/').filter(Boolean);

  if (parts.length === 0) return { kind: 'home' };
  if (parts.length === 2 && parts[0] === 'v' && parts[1]) {
    return { kind: 'venue', venueId: decodeURIComponent(parts[1]) };
  }
  if (parts.length === 1 && parts[0] === 'index.html') return { kind: 'home' };
  return { kind: 'not-found' };
}
