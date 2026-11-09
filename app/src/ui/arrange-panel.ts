import { artworkSizeLabel } from '../lib/artwork-display';
import { formatSize } from '../lib/units';
import type { Artwork, Placement, Venue, Viewpoint, Wall } from '../types';
import { el } from './dom';
import type { PlacementIssue } from '../lib/placement-validation';

export interface ArrangePanelModel {
  venue: Venue;
  artworks: Artwork[];
  selectedWallIndex: number;
  selectedArtworkId: string | undefined;
  selectedPlacementId: string | undefined;
  placementReadout: Placement | undefined;
  placementIssues: PlacementIssue[];
  allowKeepClearOverride: boolean;
  dirty: boolean;
  saveStatus: string | undefined;
  viewpoints: Viewpoint[];
}

export interface ArrangePanelCallbacks {
  onSelectWall: (index: number) => void;
  onSelectArtwork: (id: string) => void;
  onSelectPlacement: (artworkId: string) => void;
  onRemovePlacement: () => void;
  onUpdatePlacementField: (field: 'left' | 'floor', valueIn: number) => void;
  onResetHeight: () => void;
  onWallKeepClearField: (field: 'wainscotIn' | 'furnitureTopIn', value: number | undefined) => void;
  onKeepClearOverride: (allowed: boolean) => void;
  onSaveViewpoint: (label: string) => void;
  onDeleteViewpoint: (id: string) => void;
  onSave: () => void;
  onPreviewOwner: () => void;
}

export class ArrangePanel {
  private statusEl: HTMLElement | undefined;
  private issueEl: HTMLElement | undefined;
  private leftField: HTMLInputElement | undefined;
  private floorField: HTMLInputElement | undefined;

  constructor(
    private readonly root: HTMLElement,
    private callbacks: ArrangePanelCallbacks,
  ) {}

  render(model: ArrangePanelModel): void {
    this.root.replaceChildren();

    const wall = model.venue.walls[model.selectedWallIndex];
    const segLen = wallLengthIn(model.venue, model.selectedWallIndex);
    const segH = model.venue.ceilingIn;

    const wallsList = el(
      'ul',
      { class: 'arrange-walls' },
      ...model.venue.walls.map((w, i) =>
        el(
          'li',
          {},
          el(
            'button',
            {
              type: 'button',
              class: 'arrange-walls__btn',
              'aria-current': i === model.selectedWallIndex ? 'true' : undefined,
              onClick: () => this.callbacks.onSelectWall(i),
            },
            wallButtonLabel(w, model.venue, i),
          ),
        ),
      ),
    );

    const keepClear = el(
      'div',
      { class: 'arrange-keep-clear' },
      el('h3', { class: 'arrange__subtitle' }, 'Keep-clear on this wall'),
      numberField('Wainscot (in)', wall?.wainscotIn, (v) =>
        this.callbacks.onWallKeepClearField('wainscotIn', v),
      ),
      numberField('Furniture top (in)', wall?.furnitureTopIn, (v) =>
        this.callbacks.onWallKeepClearField('furnitureTopIn', v),
      ),
    );

    const library = el(
      'ul',
      { class: 'arrange-library' },
      ...model.artworks.map((art) =>
        el(
          'li',
          {},
          el(
            'button',
            {
              type: 'button',
              class: 'arrange-library__btn',
              'aria-pressed': model.selectedArtworkId === art.id ? 'true' : 'false',
              onClick: () => this.callbacks.onSelectArtwork(art.id),
            },
            el('img', {
              class: 'arrange-library__thumb',
              src: assetUrl(art.image),
              alt: '',
              loading: 'lazy',
            }),
            el('span', { class: 'arrange-library__meta' }, art.title, ' · ', artworkSizeLabel(art)),
          ),
        ),
      ),
    );

    const onWall = model.venue.placements.filter((p) => p.wallId === wall?.id);
    const placementsList = el(
      'ul',
      { class: 'arrange-placements' },
      ...onWall.map((p) => {
        const art = model.artworks.find((a) => a.id === p.artworkId);
        return el(
          'li',
          {},
          el(
            'button',
            {
              type: 'button',
              class: 'arrange-placements__btn',
              'aria-current': model.selectedPlacementId === p.artworkId ? 'true' : undefined,
              onClick: () => this.callbacks.onSelectPlacement(p.artworkId),
            },
            art?.title ?? p.artworkId,
          ),
        );
      }),
    );

    this.leftField = el('input', {
      type: 'number',
      class: 'arrange-readout__input',
      min: '0',
      step: '1',
      value: model.placementReadout?.centerFromLeftIn?.toFixed(1) ?? '',
      onChange: () => {
        const v = parseFloat(this.leftField!.value);
        if (Number.isFinite(v)) this.callbacks.onUpdatePlacementField('left', v);
      },
    });
    this.floorField = el('input', {
      type: 'number',
      class: 'arrange-readout__input',
      min: '0',
      step: '1',
      value: model.placementReadout?.centerFromFloorIn?.toFixed(1) ?? '',
      onChange: () => {
        const v = parseFloat(this.floorField!.value);
        if (Number.isFinite(v)) this.callbacks.onUpdatePlacementField('floor', v);
      },
    });

    const readout =
      model.placementReadout &&
      el(
        'section',
        { class: 'arrange-readout' },
        el('h3', { class: 'arrange__subtitle' }, 'Selected piece'),
        el('p', { class: 'arrange-readout__row' }, 'From left (in): ', this.leftField),
        el('p', { class: 'arrange-readout__row' }, 'From floor (in): ', this.floorField),
        el(
          'div',
          { class: 'actions arrange-readout__actions' },
          el(
            'button',
            { type: 'button', class: 'button button--secondary', onClick: () => this.callbacks.onResetHeight() },
            'Reset height',
          ),
          el(
            'button',
            { type: 'button', class: 'button button--secondary', onClick: () => this.callbacks.onRemovePlacement() },
            'Remove',
          ),
        ),
        model.placementIssues.some((i) => i.kind === 'keep-clear') &&
          el(
            'label',
            { class: 'arrange-override' },
            el('input', {
              type: 'checkbox',
              checked: model.allowKeepClearOverride,
              onChange: (e: Event) =>
                this.callbacks.onKeepClearOverride((e.target as HTMLInputElement).checked),
            }),
            ' Allow below keep-clear (with reason)',
          ),
        el(
          'p',
          { class: 'arrange__hint' },
          'Swap: pick another artwork in the library while this piece is selected.',
        ),
      );

    this.issueEl = el('p', { class: 'arrange-issues', role: 'alert', hidden: true }, '');
    if (model.placementIssues.length > 0) {
      this.issueEl.hidden = false;
      this.issueEl.textContent = model.placementIssues.map((i) => i.message).join(' ');
      this.issueEl.classList.toggle('arrange-issues--error', model.placementIssues.some((i) => i.severity === 'error'));
    }

    const viewpointInput = el('input', {
      type: 'text',
      class: 'arrange-viewpoint__input',
      placeholder: 'View label',
      id: 'arrange-viewpoint-label',
    });
    const vpList = el(
      'ul',
      { class: 'arrange-viewpoints' },
      ...model.viewpoints.map((vp) =>
        el(
          'li',
          { class: 'arrange-viewpoints__row' },
          el('span', {}, vp.label),
          el(
            'button',
            {
              type: 'button',
              class: 'button button--secondary arrange-viewpoints__delete',
              onClick: () => this.callbacks.onDeleteViewpoint(vp.id),
            },
            'Delete',
          ),
        ),
      ),
    );

    this.statusEl = el('p', { class: 'arrange-status', role: 'status' }, model.saveStatus ?? '');

    const header = el(
      'header',
      { class: 'arrange-panel__head' },
      el('h1', { class: 'arrange-panel__title' }, `Arrange · ${model.venue.name}`),
      el('p', { class: 'arrange__hint' }, 'Dev only. Tap wall to place · drag to move · arrows nudge.'),
      model.dirty && el('p', { class: 'arrange-dirty' }, 'Unsaved changes'),
    );

    const panel = el(
      'aside',
      { class: 'arrange-panel', 'aria-label': 'Arrange tools' },
      header,
      el('section', {}, el('h2', { class: 'arrange__heading' }, 'Walls'), wallsList),
      el('p', { class: 'arrange-wall-size' }, wall ? formatSize(segLen, segH) : ''),
      keepClear,
      el('section', {}, el('h2', { class: 'arrange__heading' }, 'Artwork library'), library),
      el('section', {}, el('h2', { class: 'arrange__heading' }, 'On this wall'), placementsList),
      readout ?? el('p', { class: 'arrange__hint' }, 'Select a piece on the wall or place from the library.'),
      this.issueEl,
      el(
        'section',
        { class: 'arrange-viewpoints-section' },
        el('h2', { class: 'arrange__heading' }, 'Viewpoints'),
        el('label', { class: 'arrange-viewpoint__label', for: 'arrange-viewpoint-label' }, 'Name this view'),
        viewpointInput,
        el(
          'button',
          {
            type: 'button',
            class: 'button button--secondary',
            onClick: () => {
              const label = viewpointInput.value.trim();
              if (label) {
                this.callbacks.onSaveViewpoint(label);
                viewpointInput.value = '';
              }
            },
          },
          'Save as viewpoint',
        ),
        vpList,
      ),
      el(
        'footer',
        { class: 'arrange-panel__foot' },
        el(
          'button',
          { type: 'button', class: 'button button--primary', onClick: () => this.callbacks.onSave() },
          'Save venue file',
        ),
        el(
          'button',
          { type: 'button', class: 'button button--secondary', onClick: () => this.callbacks.onPreviewOwner() },
          'Preview as owner',
        ),
        this.statusEl,
      ),
    );

    this.root.append(panel);
  }

  setSaveStatus(text: string): void {
    if (this.statusEl) this.statusEl.textContent = text;
  }
}

function wallButtonLabel(wall: Wall, venue: Venue, index: number): string {
  const len = wallLengthIn(venue, index);
  const h = wall.heightIn ?? venue.ceilingIn;
  return `${wall.label.split('(')[0]?.trim() ?? wall.label} — ${formatSize(len, h)}`;
}

function wallLengthIn(venue: Venue, index: number): number {
  const n = venue.corners.length;
  const a = venue.corners[index]!;
  const b = venue.corners[(index + 1) % n]!;
  return Math.hypot(b.xIn - a.xIn, b.zIn - a.zIn);
}

function numberField(
  label: string,
  value: number | undefined,
  onChange: (v: number | undefined) => void,
): HTMLElement {
  const input = el('input', {
    type: 'number',
    class: 'arrange-readout__input',
    min: '0',
    step: '1',
    value: value ?? '',
    onChange: () => {
      const raw = input.value.trim();
      onChange(raw === '' ? undefined : parseFloat(raw));
    },
  });
  return el('label', { class: 'arrange-field' }, label, input);
}

function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return /^https?:\/\//.test(path) ? path : `${base}${path.replace(/^\//, '')}`;
}
