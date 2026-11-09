import type { Site, Venue } from '../types';

const DEFAULT_SHARE_IMAGE = 'art/harbor-dusk.svg';

export function shareTitle(site: Site, venue: Venue): string {
  return `Artwork by ${site.artistName} for ${venue.name}`;
}

export function shareDescription(venue: Venue): string {
  return `See how each piece fits on the walls at ${venue.name}, at real size.`;
}

/** Path under the Vite base (e.g. `art/harbor-dusk.svg`). */
export function resolveShareImagePath(venue: Venue): string {
  if (venue.shareImage) return venue.shareImage.replace(/^\//, '');
  const wallPhoto = venue.walls.find((w) => w.photo)?.photo;
  if (wallPhoto) return wallPhoto.replace(/^\//, '');
  return DEFAULT_SHARE_IMAGE;
}

export function absoluteShareUrl(site: Site, pathUnderBase: string): string {
  const base = site.pagesOrigin.replace(/\/?$/, '/');
  return `${base}${pathUnderBase.replace(/^\//, '')}`;
}

export function venuePageUrl(site: Site, venueId: string): string {
  return absoluteShareUrl(site, `v/${venueId}/`);
}

/** Update runtime meta for dev / client navigation (OG mostly from built HTML). */
export function applyRuntimeShareMeta(site: Site, venue: Venue): void {
  const title = shareTitle(site, venue);
  document.title = title;

  const description = shareDescription(venue);
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  const image = absoluteShareUrl(site, resolveShareImagePath(venue));
  setMeta('property', 'og:image', image);
  setMeta('property', 'og:url', venuePageUrl(site, venue.id));
  setMeta('name', 'twitter:card', 'summary_large_image');
}

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.append(el);
  }
  el.content = content;
}
