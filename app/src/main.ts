import './style.css';
import { Box3, type Group, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { artworks, artworksForVenue, hasVenue, loadVenue, site } from './data';
import { LoadTracker } from './lib/load-tracker';
import { pickQuality } from './lib/quality';
import { bindVisibilityPause, isRenderPaused } from './lib/render-schedule';
import { parseRoute } from './lib/route';
import { applyRuntimeShareMeta } from './lib/share-meta';
import { viewpointIndexForArtwork } from './lib/viewpoint-for-art';
import { resolveViewpoints, viewpointToRoomView } from './lib/viewpoints';
import { supportsWebGL2 } from './lib/webgl';
import { addArtworkMeshes } from './scene/artwork-meshes';
import { ArtworkOutline } from './scene/artwork-outline';
import { findArtworkGroup, pickArtworkAt } from './scene/artwork-pick';
import { createMeasuredRoom } from './scene/measured-room';
import type { RoomView } from './scene/placeholder-room';
import { roomExploreView, roomOrbitTarget } from './scene/explore-orbit';
import { ViewpointNavigation } from './scene/viewpoint-navigation';
import { Viewer } from './scene/viewer';
import type { Artwork, Venue, Viewpoint } from './types';
import type { PitchChromeHandle } from './ui/screens';
import { ArrangeSession } from './arrange/arrange-session';
import { DevStatsOverlay } from './ui/dev-stats';
import { Screens } from './ui/screens';

/** `?simulate=no-webgl` or `?simulate=load-error` exercise the fallback paths on any device. */
type Simulation = 'no-webgl' | 'load-error';

const params = new URLSearchParams(window.location.search);
const simulate = parseSimulation(params.get('simulate'));
const quality = pickQuality(params);
const debugMode = params.has('debug');
const arrangeMode = import.meta.env.DEV && params.has('arrange');
const orbitEnabled = params.get('orbit') === '1' && !arrangeMode;

const stage = requireElement('#stage');
const uiRoot = requireElement('#ui');
const screens = new Screens(uiRoot, stage);
let viewer: Viewer | undefined;
let controls: OrbitControls | undefined;
let viewpointNav: ViewpointNavigation | undefined;
let pitchChrome: PitchChromeHandle | undefined;
let animationHandle = 0;
let activeRoom: Group | undefined;
let tourViewIndex = 0;
let pitchExploring = false;
let exploreEscapeHandler: ((event: KeyboardEvent) => void) | undefined;
let disposeExploreArtPick: (() => void) | undefined;
let pitchCtx: PitchContext | undefined;
const artworkOutline = new ArtworkOutline();
let devStats: DevStatsOverlay | undefined;
let arrangeSession: ArrangeSession | undefined;

interface PitchContext {
  venue: Venue;
  viewpoints: Viewpoint[];
  validationMessages: string[];
}

function start(): void {
  bindVisibilityPause();
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
    applyRuntimeShareMeta(site, venue);
    if (debugMode && !devStats) devStats = new DevStatsOverlay();

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
      debug: debugMode || arrangeMode,
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

    if (arrangeMode) {
      screens.setProgress(1);
      arrangeSession?.dispose();
      teardownPitch();
      document.title = `Arrange — ${loaded.name}`;
      arrangeSession = new ArrangeSession({
        viewer,
        screens,
        stage,
        uiRoot,
        venueId,
        initialVenue: loaded,
        initialRoom: group,
        manager: tracker.manager,
        quality,
        onPreviewOwner: (draft) => {
          arrangeSession = undefined;
          const viewpoints = resolveViewpoints(draft);
          const msgs: string[] = [];
          pitchCtx = { venue: draft, viewpoints, validationMessages: msgs };
          activeRoom = group;
          if (viewpoints.length === 0) {
            showRoom(draft, msgs);
            return;
          }
          screens.showIntro({
            venueName: draft.name,
            artistName: site.artistName,
            onStart: () => beginPitch({ venue: draft, viewpoints, validationMessages: msgs }),
          });
        },
      });
      return;
    }

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

  pitchCtx = ctx;
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
    if (screens.isArtworkCardOpen()) {
      screens.closeArtworkCard();
    } else {
      artworkOutline.clear();
      viewer?.render();
    }
  };

  viewpointNav = new ViewpointNavigation(viewer, ctx.viewpoints, viewer.renderer.domElement, onViewChange);
  bindViewpointArtPick();
  viewpointNav.goTo(tourViewIndex, { instant: true });

  const venueArtworks = artworksForVenue(ctx.venue);

  pitchChrome = screens.showPitchChrome({
    venueName: ctx.venue.name,
    artistName: site.artistName,
    focusArtworks: venueArtworks,
    onOpenArtwork: (artworkId) => {
      const trigger = document.activeElement;
      openArtworkCard(
        artworkId,
        trigger instanceof HTMLElement ? trigger : undefined,
      );
    },
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

function bindViewpointArtPick(): void {
  if (!viewpointNav || !viewer || !activeRoom) return;
  viewpointNav.onShortTap = (clientX, clientY) => handleArtPick(clientX, clientY);
}

function attachExploreArtPick(): void {
  teardownExploreArtPick();
  if (!viewer) return;
  const canvas = viewer.renderer.domElement;
  const tapThreshold = 12;
  let down: { x: number; y: number } | undefined;
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    down = { x: event.clientX, y: event.clientY };
  };
  const onUp = (event: PointerEvent) => {
    if (!down) return;
    const dx = event.clientX - down.x;
    const dy = event.clientY - down.y;
    down = undefined;
    if (Math.abs(dx) < tapThreshold && Math.abs(dy) < tapThreshold) {
      handleArtPick(event.clientX, event.clientY);
    }
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  disposeExploreArtPick = () => {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointerup', onUp);
  };
}

function teardownExploreArtPick(): void {
  disposeExploreArtPick?.();
  disposeExploreArtPick = undefined;
}

function artworkById(id: string): Artwork | undefined {
  return artworks.find((art) => art.id === id);
}

function highlightArtwork(artworkId: string): void {
  if (!viewer || !activeRoom) return;
  const group = findArtworkGroup(activeRoom, artworkId);
  artworkOutline.setSelection(viewer.scene, group);
  viewer.render();
}

function openArtworkCard(artworkId: string, returnFocus?: HTMLElement): void {
  if (!viewer || !activeRoom) return;
  const art = artworkById(artworkId);
  if (!art) return;
  highlightArtwork(artworkId);
  pitchChrome?.setCardOpen(true);
  screens.showArtworkCard(art, {
    onClose: () => {
      pitchChrome?.setCardOpen(false);
      artworkOutline.clear();
      viewer?.render();
    },
    returnFocus,
  });
}

function handleArtPick(clientX: number, clientY: number): void {
  if (!viewer || !activeRoom || screens.isArtworkCardOpen()) return;
  const id = pickArtworkAt(
    clientX,
    clientY,
    viewer.renderer.domElement,
    viewer.camera,
    activeRoom,
  );
  if (id) openArtworkCard(id);
}

function showArtworkOnWall(artworkId: string, ctx: PitchContext): void {
  beginPitch(ctx);
  const index = viewpointIndexForArtwork(artworkId, ctx.venue, ctx.viewpoints);
  viewpointNav?.goTo(index);
  highlightArtwork(artworkId);
}

function enterExploreRoom(ctx: PitchContext): void {
  if (!viewer || !activeRoom || pitchExploring) return;
  tourViewIndex = viewpointNav?.currentIndex ?? tourViewIndex;
  teardownViewpoints();
  setupExploreOrbit(activeRoom);
  attachExploreArtPick();
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
  teardownExploreArtPick();
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
      if (screens.isArtworkCardOpen()) {
        screens.closeArtworkCard();
      } else {
        artworkOutline.clear();
        viewer!.render();
      }
    };
    viewpointNav = new ViewpointNavigation(viewer, ctx.viewpoints, viewer.renderer.domElement, onViewChange);
    bindViewpointArtPick();
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
    if (isRenderPaused()) {
      animationHandle = requestAnimationFrame(tick);
      return;
    }
    controls.update();
    paintFrame();
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
  teardownExploreArtPick();
  screens.closeArtworkCard();
  artworkOutline.clear();
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
  const viewpoints = resolveViewpoints(venue);
  const canShowOnWall = !options.unsupported && viewer !== undefined && viewpoints.length > 0;
  screens.showList({
    venue,
    artworks: artworksForVenue(venue),
    artistName: site.artistName,
    onShowOnWall: canShowOnWall
      ? (artworkId) => {
          const ctx: PitchContext =
            pitchCtx?.venue.id === venue.id
              ? pitchCtx
              : { venue, viewpoints, validationMessages: [] };
          showArtworkOnWall(artworkId, ctx);
        }
      : undefined,
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

function paintFrame(): void {
  viewer?.render();
  devStats?.markFrame();
}

function requireElement(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector} in index.html`);
  return element;
}

start();
