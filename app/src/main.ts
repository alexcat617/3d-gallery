import './style.css';
import { Box3, type Group, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { artworks, artworksForVenue, hasVenue, loadVenue, site } from './data';
import { LoadTracker } from './lib/load-tracker';
import { pickQuality } from './lib/quality';
import { parseRoute } from './lib/route';
import { resolveViewpoints, viewpointToRoomView } from './lib/viewpoints';
import { supportsWebGL2 } from './lib/webgl';
import { addArtworkMeshes } from './scene/artwork-meshes';
import { createMeasuredRoom } from './scene/measured-room';
import type { RoomView } from './scene/placeholder-room';
import { roomExploreView, roomOrbitTarget } from './scene/explore-orbit';
import { ViewpointNavigation } from './scene/viewpoint-navigation';
import { Viewer } from './scene/viewer';
import type { Venue, Viewpoint } from './types';
import type { PitchChromeHandle } from './ui/screens';
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
let viewpointNav: ViewpointNavigation | undefined;
let pitchChrome: PitchChromeHandle | undefined;
let animationHandle = 0;
let activeRoom: Group | undefined;
let tourViewIndex = 0;
let pitchExploring = false;
let exploreEscapeHandler: ((event: KeyboardEvent) => void) | undefined;

interface PitchContext {
  venue: Venue;
  viewpoints: Viewpoint[];
  validationMessages: string[];
}

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

    const viewpoints = resolveViewpoints(loaded);
    const previewView: RoomView =
      viewpoints.length > 0
        ? viewpointToRoomView(viewpoints[0]!)
        : { position: new Vector3(0, 1.6, 2), lookAt: new Vector3(0, 1.5, 0) };

    viewer.setRoom(group, previewView);
    activeRoom = group;

    teardownOrbit();
    teardownViewpoints();
    exitExploreMode();

    if (orbitEnabled) {
      setupOrbit(previewView, group);
      showRoom(loaded, validationMessages);
      return;
    }

    if (viewpoints.length === 0) {
      showRoom(loaded, validationMessages);
      return;
    }

    screens.setProgress(1);
    screens.showIntro({
      venueName: loaded.name,
      artistName: site.artistName,
      onStart: () => beginPitch({ venue: loaded, viewpoints, validationMessages }),
    });
    viewer.render();
  } catch (error) {
    console.error(error);
    showError(venueId, venue, attempt);
  }
}

function beginPitch(ctx: PitchContext): void {
  if (!viewer || ctx.viewpoints.length === 0 || !activeRoom) return;

  exitExploreMode();
  teardownViewpoints();

  let hintDismissed = false;
  const dismissHint = () => {
    if (hintDismissed) return;
    hintDismissed = true;
    pitchChrome?.dismissHint();
  };

  const onViewChange = (index: number, vp: Viewpoint) => {
    tourViewIndex = index;
    pitchChrome?.updateViewpoint(index, vp.label);
  };

  viewpointNav = new ViewpointNavigation(viewer, ctx.viewpoints, viewer.renderer.domElement, onViewChange);
  viewpointNav.goTo(tourViewIndex, { instant: true });

  pitchChrome = screens.showPitchChrome({
    venueName: ctx.venue.name,
    artistName: site.artistName,
    onAllPieces: () =>
      showList(ctx.venue, {
        onBack: () => beginPitch(ctx),
      }),
    devModeBanner: debugMode
      ? 'Debug: wall labels, keep-clear tint, validation list. Add &orbit=1 for orbit-only dev camera.'
      : undefined,
    devValidationMessages:
      debugMode && ctx.validationMessages.length > 0 ? ctx.validationMessages : undefined,
    viewpointCount: ctx.viewpoints.length,
    viewpointIndex: tourViewIndex,
    viewpointLabel: ctx.viewpoints[tourViewIndex]?.label ?? 'Room',
    viewpoints: ctx.viewpoints.map((vp) => ({ id: vp.id, label: vp.label })),
    onPrev: () => {
      dismissHint();
      viewpointNav?.prev();
    },
    onNext: () => {
      dismissHint();
      viewpointNav?.next();
    },
    onPickViewpoint: (index: number) => {
      dismissHint();
      viewpointNav?.goTo(index);
    },
    onFirstInteraction: dismissHint,
    onExploreRoom: () => enterExploreRoom(ctx),
    onBackToTour: () => exitExploreMode(ctx),
    onRecenterExplore: () => recenterExploreOrbit(),
  });

  viewpointNav.onHintDismiss = dismissHint;
}

function enterExploreRoom(ctx: PitchContext): void {
  if (!viewer || !activeRoom || pitchExploring) return;
  tourViewIndex = viewpointNav?.currentIndex ?? tourViewIndex;
  teardownViewpoints();
  setupExploreOrbit(activeRoom);
  pitchExploring = true;
  pitchChrome?.setExploreMode(true);
  exploreEscapeHandler = (event) => {
    if (event.key === 'Escape') exitExploreMode(ctx);
  };
  document.addEventListener('keydown', exploreEscapeHandler);
}

function exitExploreMode(ctx?: PitchContext): void {
  if (!pitchExploring) return;
  pitchExploring = false;
  teardownOrbit();
  if (exploreEscapeHandler) {
    document.removeEventListener('keydown', exploreEscapeHandler);
    exploreEscapeHandler = undefined;
  }
  pitchChrome?.setExploreMode(false);
  if (ctx && viewer && activeRoom) {
    const onViewChange = (index: number, vp: Viewpoint) => {
      tourViewIndex = index;
      pitchChrome?.updateViewpoint(index, vp.label);
    };
    viewpointNav = new ViewpointNavigation(viewer, ctx.viewpoints, viewer.renderer.domElement, onViewChange);
    viewpointNav.onHintDismiss = () => pitchChrome?.dismissHint();
    viewpointNav.goTo(tourViewIndex, { instant: true });
  }
}

/** Explore orbit: pivot at room center (not the wall from the last viewpoint). */
function setupExploreOrbit(room: Group): void {
  if (!viewer) return;
  const target = roomOrbitTarget(room);
  setupOrbit({ position: viewer.camera.position.clone(), lookAt: target }, room);
}

function recenterExploreOrbit(): void {
  if (!viewer || !activeRoom || !controls) return;
  const view = roomExploreView(activeRoom);
  controls.target.copy(view.lookAt);
  viewer.camera.position.copy(view.position);
  controls.update();
  viewer.render();
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

function teardownViewpoints(): void {
  viewpointNav?.dispose();
  viewpointNav = undefined;
}

function teardownPitch(): void {
  exitExploreMode();
  teardownViewpoints();
  pitchChrome = undefined;
}

function showRoom(venue: Venue, validationMessages: string[], options: { focusAllPieces?: boolean } = {}): void {
  const showDevNotes = debugMode && validationMessages.length > 0;
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
  teardownPitch();
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
      teardownPitch();
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
