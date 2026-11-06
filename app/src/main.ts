import './style.css';
import { Box3, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { artworks, artworksForVenue, hasVenue, loadVenue, site } from './data';
import { LoadTracker } from './lib/load-tracker';
import { pickQuality } from './lib/quality';
import { parseRoute } from './lib/route';
import { supportsWebGL2 } from './lib/webgl';
import { addArtworkMeshes } from './scene/artwork-meshes';
import { createMeasuredRoom } from './scene/measured-room';
import { initialView, type RoomView } from './scene/placeholder-room';
import { Viewer } from './scene/viewer';
import type { Venue } from './types';
import { Screens } from './ui/screens';

/** `?simulate=no-webgl` or `?simulate=load-error` exercise the fallback paths on any device. */
type Simulation = 'no-webgl' | 'load-error';

const params = new URLSearchParams(window.location.search);
const simulate = parseSimulation(params.get('simulate'));
const quality = pickQuality(params);
const debugMode = params.has('debug');
const orbitEnabled = params.get('orbit') === '1';

const stage = requireElement('#stage');
const screens = new Screens(requireElement('#ui'), stage);
let viewer: Viewer | undefined;
let controls: OrbitControls | undefined;
let animationHandle = 0;

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

    const { group, validationMessages } = await createMeasuredRoom(loaded, {
      manager: tracker.manager,
      debug: debugMode,
      showLabels: debugMode,
    });

    await addArtworkMeshes(group, loaded, artworks, {
      manager: tracker.manager,
      quality,
      validationMessages,
    });

    for (const msg of validationMessages) {
      console.warn(`[venue validation] ${msg}`);
    }

    const view = initialView(loaded);
    viewer.setRoom(group, view);

    teardownOrbit();
    if (orbitEnabled) {
      setupOrbit(view, group);
    } else {
      viewer.render();
    }

    showRoom(loaded, validationMessages);
  } catch (error) {
    console.error(error);
    showError(venueId, venue, attempt);
  }
}

function setupOrbit(view: RoomView, target: import('three').Object3D): void {
  if (!viewer) return;
  controls = new OrbitControls(viewer.camera, viewer.renderer.domElement);
  controls.target.copy(view.lookAt);
  viewer.camera.position.copy(view.position);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minPolarAngle = 0.1;
  controls.maxPolarAngle = Math.PI - 0.1;

  const box = new Box3().setFromObject(target);
  const size = box.getSize(new Vector3()).length();
  controls.minDistance = Math.max(0.5, size * 0.05);
  controls.maxDistance = Math.max(12, size * 3);

  const tick = () => {
    if (!controls) return;
    controls.update();
    viewer!.render();
    animationHandle = requestAnimationFrame(tick);
  };
  tick();
}

function teardownOrbit(): void {
  controls?.dispose();
  controls = undefined;
  cancelAnimationFrame(animationHandle);
  animationHandle = 0;
}

function showRoom(venue: Venue, validationMessages: string[], options: { focusAllPieces?: boolean } = {}): void {
  const showDevNotes = import.meta.env.DEV && (validationMessages.length > 0 || debugMode);
  screens.showRoom({
    venueName: venue.name,
    artistName: site.artistName,
    focusAllPieces: options.focusAllPieces,
    onAllPieces: () => showList(venue, { onBack: () => showRoom(venue, validationMessages, { focusAllPieces: true }) }),
    devModeBanner: debugMode
      ? 'Debug: wall labels, keep-clear tint, validation list. Add &orbit=1 to drag the camera.'
      : undefined,
    devValidationMessages: showDevNotes ? validationMessages : undefined,
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
      teardownOrbit();
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
