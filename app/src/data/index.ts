import type { Artwork, Site, Venue } from '../types';
import artworksJson from './artworks.json';
import siteJson from './site.json';

export const site: Site = siteJson;
export const artworks: Artwork[] = artworksJson as Artwork[];

const venueModules = import.meta.glob<Venue>(['./venues/*.json', '!./venues/_*.json'], {
  import: 'default',
});

const VENUE_ID = /^[a-z0-9-]+$/;

export function hasVenue(id: string): boolean {
  return VENUE_ID.test(id) && `./venues/${id}.json` in venueModules;
}

export async function loadVenue(id: string): Promise<Venue> {
  const load = venueModules[`./venues/${id}.json`];
  if (!VENUE_ID.test(id) || !load) {
    throw new Error(`Unknown venue: ${id}`);
  }
  return load();
}

export function artworksForVenue(venue: Venue): Artwork[] {
  const byId = new Map(artworks.map((art) => [art.id, art]));
  return venue.placements
    .map((placement) => byId.get(placement.artworkId))
    .filter((art): art is Artwork => art !== undefined);
}
