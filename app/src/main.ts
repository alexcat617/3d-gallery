import './style.css';
import { artworksForVenue, hasVenue, loadVenue, site } from './data';
import { LoadTracker } from './lib/load-tracker';
import { pickQuality } from './lib/quality';
import { parseRoute } from './lib/route';
import { supportsWebGL2 } from './lib/webgl';
import { createPlaceholderRoom, initialView } from './scene/placeholder-room';
import { Viewer } from './scene/viewer';
import type { Venue } from './types';
import { Screens } from './ui/screens';

/** `?simulate=no-webgl` or `?simulate=load-error` exercise the fallback paths on any device. */
type Simulation = 'no-webgl' | 'load-error';

const params = new URLSearchParams(window.location.search);
const simulate = parseSimulation(params.get('simulate'));
const quality = pickQuality(params);

const stage = requireElement('#stage');
const screens = new Screens(requireElement('#ui'), stage);
let viewer: Viewer | undefined;

function start(): void {
  document.documentElement.dataset.quality = quality;
  const route = parseRoute(window.location.pathname, import.meta.env.BASE_URL);

  if (route.kind === 'venue' && hasVenue(route.venueId)) {
    void openVenue(route.venueId, 0);
  } else if (route.kind === 'home') {
    screens.showHome(site.artistName);
  } else {
    document.title = 'Page not available';
    screens.showNotFound(site.artistName);
  }
}

async function openVenue(venueId: string, attempt: number): Promise<void> {
  screens.showLoading();
  const tracker = new LoadTracker((fraction) => screens.setProgress(fraction));
  let venue: Venue | undefined;

  try {
    venue = await tracker.track(`venue:${venueId}`, loadVenue(venueId));
    document.title = `Artwork by ${site.artistName} for ${venue.name}`;

    if (simulate === 'no-webgl' || !supportsWebGL2()) {
      showList(venue, { unsupported: true });
      return;
    }
    if (simulate === 'load-error' && attempt === 0) {
      throw new Error('Simulated load error (?simulate=load-error)');
    }

    const loaded = venue;
    viewer ??= new Viewer(stage, quality, () => showError(venueId, loaded, attempt));
    viewer.setLabel(`3D view of ${venue.name}`);
    viewer.setRoom(createPlaceholderRoom(venue), initialView(venue));
    showRoom(venue);
  } catch (error) {
    console.error(error);
    showError(venueId, venue, attempt);
  }
}

function showRoom(venue: Venue, options: { focusAllPieces?: boolean } = {}): void {
  screens.showRoom({
    venueName: venue.name,
    artistName: site.artistName,
    focusAllPieces: options.focusAllPieces,
    onAllPieces: () => showList(venue, { onBack: () => showRoom(venue, { focusAllPieces: true }) }),
  });
}

function showList(venue: Venue, options: { unsupported?: boolean; onBack?: () => void }): void {
  screens.showList({
    venue,
    artworks: artworksForVenue(venue),
    artistName: site.artistName,
    ...options,
  });
}

function showError(venueId: string, venue: Venue | undefined, attempt: number): void {
  screens.showError({
    onRetry: () => {
      viewer?.dispose();
      viewer = undefined;
      void openVenue(venueId, attempt + 1);
    },
    onList: venue ? () => showList(venue, { onBack: () => showError(venueId, venue, attempt) }) : undefined,
  });
}

function parseSimulation(value: string | null): Simulation | null {
  return value === 'no-webgl' || value === 'load-error' ? value : null;
}

function requireElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector} in index.html`);
  return element;
}

start();
