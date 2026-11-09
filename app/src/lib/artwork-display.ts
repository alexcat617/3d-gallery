import { formatSize } from './units';
import type { Artwork } from '../types';

/** Card/list size line: "24 × 36 in" plus framed note when applicable. */
export function artworkSizeLabel(art: Artwork): string {
  const base = formatSize(art.widthIn, art.heightIn);
  return art.frame?.widthIn ? `${base} (framed)` : base;
}

/** Accessible name for focus targets: "Harbor Dusk, 24 × 36 in". */
export function artworkAccessibleName(art: Artwork): string {
  return `${art.title}, ${artworkSizeLabel(art)}`;
}
