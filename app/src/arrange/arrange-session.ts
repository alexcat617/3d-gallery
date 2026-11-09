import { Group, type LoadingManager } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { artworks } from '../data';
import {
  hasBlockingIssues,
  validatePlacementForArrange,
  type PlacementIssue,
} from '../lib/placement-validation';
import { recommendedCenterFromFloorIn, resolveHangRules } from '../lib/hang-height';
import { inToM } from '../lib/units';
import { addArtworkMeshes } from '../scene/artwork-meshes';
import { ArtworkOutline } from '../scene/artwork-outline';
import { findArtworkGroup, pickArtworkAt } from '../scene/artwork-pick';
import { createMeasuredRoom } from '../scene/measured-room';
import type { Viewer } from '../scene/viewer';
import type { Artwork, Placement, Venue, Viewpoint } from '../types';
import { ArrangePanel } from '../ui/arrange-panel';
import type { Screens } from '../ui/screens';
import { wallSegmentForIndex, wallStraightOnView } from './wall-camera';
import { pickWallPlacement } from './wall-pick';

const SNAP_IN = 1;
const NUDGE_IN = 1;
const NUDGE_SHIFT_IN = 6;

export interface ArrangeSessionDeps {
  viewer: Viewer;
  screens: Screens;
  stage: HTMLElement;
  uiRoot: HTMLElement;
  venueId: string;
  initialVenue: Venue;
  initialRoom: Group;
  manager: LoadingManager;
  quality: import('../lib/quality').Quality;
  onPreviewOwner: (venue: Venue) => void;
}

export class ArrangeSession {
  private draft: Venue;
  private room: Group;
  private controls: OrbitControls | undefined;
  private panel: ArrangePanel;
  private animationHandle = 0;
  private dirty = false;
  private selectedWallIndex = 0;
  private selectedArtworkId: string | undefined;
  private selectedPlacementId: string | undefined;
  private keepClearOverride = new Set<string>();
  private outline = new ArtworkOutline();
  private pointerDown: { x: number; y: number; mode: 'place' | 'drag' | 'select' } | undefined;
  private disposed = false;

  constructor(private readonly deps: ArrangeSessionDeps) {
    this.draft = structuredClone(deps.initialVenue);
    this.room = deps.initialRoom;
    this.panel = new ArrangePanel(deps.uiRoot, {
      onSelectWall: (i) => void this.selectWall(i),
      onSelectArtwork: (id) => this.selectArtwork(id),
      onSelectPlacement: (id) => this.selectPlacement(id),
      onRemovePlacement: () => void this.removePlacement(),
      onUpdatePlacementField: (field, v) => void this.updateField(field, v),
      onResetHeight: () => void this.resetHeight(),
      onWallKeepClearField: (field, v) => void this.updateWallKeepClear(field, v),
      onKeepClearOverride: (allowed) => this.setKeepClearOverride(allowed),
      onSaveViewpoint: (label) => this.saveViewpoint(label),
      onDeleteViewpoint: (id) => this.deleteViewpoint(id),
      onSave: () => void this.saveVenue(),
      onPreviewOwner: () => this.previewOwner(),
    });

    document.body.classList.add('arrange-active');
    deps.stage.classList.add('arrange-stage');
    window.addEventListener('beforeunload', this.beforeUnload);
    document.addEventListener('keydown', this.onKeyDown);
    this.bindCanvas();
    void this.selectWall(0);
    this.syncPanel();
  }

  dispose(): void {
    this.disposed = true;
    document.body.classList.remove('arrange-active');
    this.deps.stage.classList.remove('arrange-stage');
    window.removeEventListener('beforeunload', this.beforeUnload);
    document.removeEventListener('keydown', this.onKeyDown);
    this.outline.clear();
    this.controls?.dispose();
    this.controls = undefined;
    cancelAnimationFrame(this.animationHandle);
    this.deps.uiRoot.replaceChildren();
    this.unbindCanvas();
  }

  private readonly beforeUnload = (event: BeforeUnloadEvent): void => {
    if (!this.dirty) return;
    event.preventDefault();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.selectedPlacementId) return;
    const step = event.shiftKey ? NUDGE_SHIFT_IN : NUDGE_IN;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      void this.nudgePlacement(-step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      void this.nudgePlacement(step, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      void this.nudgePlacement(0, step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      void this.nudgePlacement(0, -step);
    }
  };

  private bindCanvas(): void {
    const canvas = this.deps.viewer.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
  }

  private unbindCanvas(): void {
    const canvas = this.deps.viewer.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const artId = pickArtworkAt(
      event.clientX,
      event.clientY,
      this.deps.viewer.renderer.domElement,
      this.deps.viewer.camera,
      this.room,
    );
    if (artId) {
      this.selectedPlacementId = artId;
      this.pointerDown = { x: event.clientX, y: event.clientY, mode: 'drag' };
      return;
    }
    if (this.selectedArtworkId && !this.selectedPlacementId) {
      this.pointerDown = { x: event.clientX, y: event.clientY, mode: 'place' };
    } else {
      this.pointerDown = { x: event.clientX, y: event.clientY, mode: 'select' };
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.pointerDown || this.pointerDown.mode !== 'drag' || !this.selectedPlacementId) return;
    const dx = event.clientX - this.pointerDown.x;
    const dy = event.clientY - this.pointerDown.y;
    if (Math.hypot(dx, dy) < 4) return;
    void this.movePlacementTo(event.clientX, event.clientY);
    this.pointerDown.x = event.clientX;
    this.pointerDown.y = event.clientY;
  };

  private readonly onPointerUp = async (event: PointerEvent): Promise<void> => {
    if (!this.pointerDown) return;
    const start = this.pointerDown;
    this.pointerDown = undefined;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > 6) return;

    if (start.mode === 'place' && this.selectedArtworkId) {
      await this.placeArtwork(event.clientX, event.clientY);
    } else if (start.mode === 'select') {
      const artId = pickArtworkAt(
        event.clientX,
        event.clientY,
        this.deps.viewer.renderer.domElement,
        this.deps.viewer.camera,
        this.room,
      );
      if (artId) this.selectPlacement(artId);
    } else if (start.mode === 'drag' && this.selectedPlacementId) {
      this.syncSelectionOutline();
    }
  };

  private setupOrbit(): void {
    this.controls?.dispose();
    const view = wallStraightOnView(this.draft, this.selectedWallIndex);
    this.controls = new OrbitControls(this.deps.viewer.camera, this.deps.viewer.renderer.domElement);
    this.controls.target.copy(view.lookAt);
    this.deps.viewer.camera.position.copy(view.position);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.update();
    const tick = () => {
      if (!this.controls || this.disposed) return;
      this.controls.update();
      this.deps.viewer.render();
      this.animationHandle = requestAnimationFrame(tick);
    };
    tick();
  }

  private async selectWall(index: number): Promise<void> {
    this.selectedWallIndex = index;
    this.selectedPlacementId = undefined;
    await this.rebuildRoomIfNeeded(true);
    this.setupOrbit();
    this.syncPanel();
    this.deps.viewer.render();
  }

  private selectArtwork(id: string): void {
    if (this.selectedPlacementId) {
      void this.swapArtwork(id);
      return;
    }
    this.selectedArtworkId = id;
    this.syncPanel();
  }

  private selectPlacement(artworkId: string): void {
    this.selectedPlacementId = artworkId;
    this.selectedArtworkId = undefined;
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private syncSelectionOutline(): void {
    if (!this.selectedPlacementId) {
      this.outline.clear();
      return;
    }
    const group = findArtworkGroup(this.room, this.selectedPlacementId);
    const issues = this.issuesForSelected();
    const valid = !hasBlockingIssues(issues);
    this.outline.setSelection(this.deps.viewer.scene, group, valid);
    this.deps.viewer.render();
  }

  private async placeArtwork(clientX: number, clientY: number): Promise<void> {
    const wall = this.draft.walls[this.selectedWallIndex];
    if (!wall || !this.selectedArtworkId) return;
    const hit = pickWallPlacement(
      clientX,
      clientY,
      this.deps.viewer.renderer.domElement,
      this.deps.viewer.camera,
      this.room,
      this.draft,
      wall.id,
    );
    if (!hit) return;

    const art = artworks.find((a) => a.id === this.selectedArtworkId);
    if (!art) return;
    const hang = resolveHangRules(this.draft);
    const frameW = art.frame?.widthIn ?? 0;
    const outerH = art.heightIn + 2 * frameW;
    let left = hit.centerFromLeftIn;
    const seg = wallSegmentForIndex(this.draft, hit.wallIndex);
    left = this.applySnapHorizontal(left, seg.lengthIn, wall.id, this.selectedArtworkId);
    const floor = recommendedCenterFromFloorIn(wall, outerH, hang);

    const placement: Placement = {
      artworkId: this.selectedArtworkId,
      wallId: wall.id,
      centerFromLeftIn: left,
      centerFromFloorIn: floor,
    };
    this.draft.placements = this.draft.placements.filter((p) => p.artworkId !== placement.artworkId);
    this.draft.placements.push(placement);
    this.markDirty();
    this.selectedPlacementId = placement.artworkId;
    this.selectedArtworkId = undefined;
    await this.rebuildArt();
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private async movePlacementTo(clientX: number, clientY: number): Promise<void> {
    const p = this.getSelectedPlacement();
    if (!p) return;
    const hit = pickWallPlacement(
      clientX,
      clientY,
      this.deps.viewer.renderer.domElement,
      this.deps.viewer.camera,
      this.room,
      this.draft,
      p.wallId,
    );
    if (!hit) return;
    const seg = wallSegmentForIndex(this.draft, hit.wallIndex);
    let left = hit.centerFromLeftIn;
    left = this.applySnapHorizontal(left, seg.lengthIn, p.wallId, p.artworkId);
    p.centerFromLeftIn = left;
    p.centerFromFloorIn = hit.centerFromFloorIn;
    this.markDirty();
    await this.rebuildArt();
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private applySnapHorizontal(
    leftIn: number,
    wallLenIn: number,
    wallId: string,
    skipArtId: string,
  ): number {
    const center = wallLenIn / 2;
    if (Math.abs(leftIn - center) <= SNAP_IN) return center;

    const onWall = this.draft.placements.filter((p) => p.wallId === wallId && p.artworkId !== skipArtId);
    for (const other of onWall) {
      if (Math.abs(leftIn - other.centerFromLeftIn) <= SNAP_IN) return other.centerFromLeftIn;
    }
    return leftIn;
  }

  private async nudgePlacement(dx: number, dy: number): Promise<void> {
    const p = this.getSelectedPlacement();
    if (!p) return;
    p.centerFromLeftIn += dx;
    if (p.centerFromFloorIn !== undefined) p.centerFromFloorIn += dy;
    else p.centerFromFloorIn = recommendedCenterFromFloorIn(
      this.draft.walls.find((w) => w.id === p.wallId)!,
      this.outerHeight(p.artworkId),
      resolveHangRules(this.draft),
    ) + dy;
    this.markDirty();
    await this.rebuildArt();
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private async removePlacement(): Promise<void> {
    if (!this.selectedPlacementId) return;
    this.draft.placements = this.draft.placements.filter((p) => p.artworkId !== this.selectedPlacementId);
    this.keepClearOverride.delete(this.selectedPlacementId);
    this.selectedPlacementId = undefined;
    this.markDirty();
    await this.rebuildArt();
    this.syncPanel();
  }

  private async swapArtwork(newArtId: string): Promise<void> {
    const p = this.getSelectedPlacement();
    if (!p) return;
    const oldId = p.artworkId;
    p.artworkId = newArtId;
    this.draft.placements = this.draft.placements.filter((x) => x === p || x.artworkId !== newArtId);
    this.selectedPlacementId = newArtId;
    this.keepClearOverride.delete(oldId);
    this.markDirty();
    await this.rebuildArt();
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private async updateField(field: 'left' | 'floor', valueIn: number): Promise<void> {
    const p = this.getSelectedPlacement();
    if (!p) return;
    if (field === 'left') p.centerFromLeftIn = valueIn;
    else p.centerFromFloorIn = valueIn;
    this.markDirty();
    await this.rebuildArt();
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private async resetHeight(): Promise<void> {
    const p = this.getSelectedPlacement();
    if (!p) return;
    const wall = this.draft.walls.find((w) => w.id === p.wallId);
    const art = artworks.find((a) => a.id === p.artworkId);
    if (!wall || !art) return;
    delete p.centerFromFloorIn;
    const hang = resolveHangRules(this.draft);
    p.centerFromFloorIn = recommendedCenterFromFloorIn(wall, this.outerHeight(p.artworkId), hang);
    this.markDirty();
    await this.rebuildArt();
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private async updateWallKeepClear(
    field: 'wainscotIn' | 'furnitureTopIn',
    value: number | undefined,
  ): Promise<void> {
    const wall = this.draft.walls[this.selectedWallIndex];
    if (!wall) return;
    wall[field] = value;
    this.markDirty();
    await this.rebuildRoomIfNeeded(true);
    this.syncPanel();
  }

  private setKeepClearOverride(allowed: boolean): void {
    if (!this.selectedPlacementId) return;
    if (allowed) this.keepClearOverride.add(this.selectedPlacementId);
    else this.keepClearOverride.delete(this.selectedPlacementId);
    this.syncSelectionOutline();
    this.syncPanel();
  }

  private saveViewpoint(label: string): void {
    if (!this.controls) return;
    const cam = this.deps.viewer.camera;
    const toIn = (m: number) => m / inToM(1);
    const id = slugId(label);
    const vp: Viewpoint = {
      id,
      label,
      position: {
        xIn: toIn(cam.position.x),
        yIn: toIn(cam.position.y),
        zIn: toIn(cam.position.z),
      },
      lookAt: {
        xIn: toIn(this.controls.target.x),
        yIn: toIn(this.controls.target.y),
        zIn: toIn(this.controls.target.z),
      },
      eyeHeightIn: toIn(cam.position.y),
    };
    this.draft.viewpoints = [...this.draft.viewpoints.filter((v) => v.id !== id), vp];
    this.markDirty();
    this.syncPanel();
  }

  private deleteViewpoint(id: string): void {
    this.draft.viewpoints = this.draft.viewpoints.filter((v) => v.id !== id);
    this.markDirty();
    this.syncPanel();
  }

  private async saveVenue(): Promise<void> {
    const blockers = this.allBlockingIssues();
    if (blockers.length > 0) {
      this.panel.setSaveStatus(`Fix ${blockers.length} placement issue(s) before saving.`);
      return;
    }
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
    try {
      const res = await fetch(`${base}api/arrange/save-venue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.draft),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? 'Save failed');
      this.dirty = false;
      this.panel.setSaveStatus('Saved. Check Source Control for the venue JSON.');
    } catch (e) {
      this.panel.setSaveStatus(e instanceof Error ? e.message : 'Save failed');
    }
  }

  private previewOwner(): void {
    this.dispose();
    this.deps.onPreviewOwner(this.draft);
  }

  private markDirty(): void {
    this.dirty = true;
    this.syncPanel();
  }

  private getSelectedPlacement(): Placement | undefined {
    if (!this.selectedPlacementId) return undefined;
    return this.draft.placements.find((p) => p.artworkId === this.selectedPlacementId);
  }

  private outerHeight(artworkId: string): number {
    const art = artworks.find((a) => a.id === artworkId);
    if (!art) return 24;
    const frameW = art.frame?.widthIn ?? 0;
    return art.heightIn + 2 * frameW;
  }

  private issuesForSelected(): PlacementIssue[] {
    const p = this.getSelectedPlacement();
    if (!p) return [];
    return this.issuesForPlacement(p);
  }

  private issuesForPlacement(p: Placement): PlacementIssue[] {
    const art = artworks.find((a) => a.id === p.artworkId);
    const wall = this.draft.walls.find((w) => w.id === p.wallId);
    const wi = this.draft.walls.findIndex((w) => w.id === p.wallId);
    if (!art || !wall || wi < 0) return [];
    const seg = wallSegmentForIndex(this.draft, wi);
    const onWall = this.draft.placements.filter((x) => x.wallId === p.wallId);
    return validatePlacementForArrange(this.draft, wall, seg, p, art, onWall, artworksById(), {
      allowKeepClearOverride: this.keepClearOverride.has(p.artworkId),
    });
  }

  private allBlockingIssues(): string[] {
    const msgs: string[] = [];
    for (const p of this.draft.placements) {
      const issues = this.issuesForPlacement(p);
      for (const i of issues) {
        if (i.severity === 'error') msgs.push(`${p.artworkId}: ${i.message}`);
      }
    }
    return msgs;
  }

  private syncPanel(): void {
    const p = this.getSelectedPlacement();
    this.panel.render({
      venue: this.draft,
      artworks,
      selectedWallIndex: this.selectedWallIndex,
      selectedArtworkId: this.selectedArtworkId,
      selectedPlacementId: this.selectedPlacementId,
      placementReadout: p,
      placementIssues: this.issuesForSelected(),
      allowKeepClearOverride: this.selectedPlacementId
        ? this.keepClearOverride.has(this.selectedPlacementId)
        : false,
      dirty: this.dirty,
      saveStatus: undefined,
      viewpoints: this.draft.viewpoints,
    });
  }

  private async rebuildArt(): Promise<void> {
    this.stripArtMeshes();
    const msgs: string[] = [];
    await addArtworkMeshes(this.room, this.draft, artworks, {
      manager: this.deps.manager,
      quality: this.deps.quality,
      validationMessages: msgs,
    });
    this.deps.viewer.render();
  }

  private async rebuildRoomIfNeeded(full: boolean): Promise<void> {
    if (!full) {
      await this.rebuildArt();
      return;
    }
    this.deps.viewer.scene.remove(this.room);
    const { group } = await createMeasuredRoom(this.draft, {
      manager: this.deps.manager,
      debug: true,
      showLabels: false,
    });
    this.room = group;
    await addArtworkMeshes(group, this.draft, artworks, {
      manager: this.deps.manager,
      quality: this.deps.quality,
      validationMessages: [],
    });
    this.deps.viewer.setRoom(group, wallStraightOnView(this.draft, this.selectedWallIndex));
    this.deps.stage.querySelector('canvas')?.focus();
  }

  private stripArtMeshes(): void {
    const remove: Group[] = [];
    this.room.children.forEach((child) => {
      if (child.name.startsWith('artwork-')) remove.push(child as Group);
    });
    for (const g of remove) this.room.remove(g);
  }
}

function artworksById(): Map<string, Artwork> {
  return new Map(artworks.map((a) => [a.id, a]));
}

function slugId(label: string): string {
  const base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || `view-${Date.now()}`;
}
