import { formatSize } from '../lib/units';
import type { Artwork, Venue } from '../types';
import { el } from './dom';

export interface ListOptions {
  venue: Venue;
  artworks: Artwork[];
  artistName: string;
  /** Shown when 3D can't run on this device. */
  unsupported?: boolean;
  onBack?: () => void;
}

export interface ErrorOptions {
  onRetry: () => void;
  onList?: () => void;
}

export interface RoomChromeOptions {
  venueName: string;
  artistName: string;
  /** Return focus to "All Pieces" when coming back from the list. */
  focusAllPieces?: boolean;
  onAllPieces: () => void;
  /** Dev-only: short line about ?debug / orbit. */
  devModeBanner?: string;
  /** Dev-only: validation messages (dev console + on-screen list). */
  devValidationMessages?: string[];
}

export interface IntroOptions {
  venueName: string;
  artistName: string;
  onStart: () => void;
}

export interface PitchChromeOptions extends RoomChromeOptions {
  viewpointCount: number;
  viewpointIndex: number;
  viewpointLabel: string;
  viewpoints: { id: string; label: string }[];
  onPrev: () => void;
  onNext: () => void;
  onPickViewpoint: (index: number) => void;
  onFirstInteraction: () => void;
  onExploreRoom: () => void;
  onBackToTour: () => void;
  onRecenterExplore: () => void;
}

export interface PitchChromeHandle {
  updateViewpoint: (index: number, label: string) => void;
  dismissHint: () => void;
  setExploreMode: (exploring: boolean) => void;
}

/**
 * Owns the HTML layer above the canvas. Full screens (loading, error, list,
 * not-found, home) cover the canvas; room chrome sits on top of it.
 */
export class Screens {
  private progressBar: HTMLElement | undefined;
  private progressText: HTMLElement | undefined;
  private escapeHandler: ((event: KeyboardEvent) => void) | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly stage: HTMLElement,
  ) {}

  showLoading(): void {
    this.progressBar = el('div', { class: 'progress__bar' });
    this.progressText = el('span', { class: 'progress__text' }, '0%');
    const progress = el(
      'div',
      {
        class: 'progress',
        role: 'progressbar',
        'aria-label': 'Loading the room',
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': 0,
      },
      this.progressBar,
    );

    this.showPanel(
      el(
        'section',
        { class: 'panel panel--center', 'aria-busy': 'true' },
        el('p', { class: 'panel__status', role: 'status' }, 'Loading the room…'),
        progress,
        this.progressText,
      ),
      { focus: false },
    );
  }

  setProgress(fraction: number): void {
    const percent = Math.round(Math.min(Math.max(fraction, 0), 1) * 100);
    this.progressBar?.style.setProperty('--progress', `${percent}%`);
    this.progressBar?.parentElement?.setAttribute('aria-valuenow', String(percent));
    if (this.progressText) this.progressText.textContent = `${percent}%`;
  }

  showError({ onRetry, onList }: ErrorOptions): void {
    this.showPanel(
      el(
        'section',
        { class: 'panel panel--center', role: 'alert' },
        heading('The Room Didn’t Load'),
        el('p', {}, 'This is usually a weak connection. Check your signal and try again.'),
        el(
          'div',
          { class: 'actions' },
          el('button', { type: 'button', class: 'button button--primary', onClick: onRetry }, 'Try again'),
          onList &&
            el('button', { type: 'button', class: 'button button--secondary', onClick: onList }, 'See pieces as a list'),
        ),
      ),
    );
  }

  showList({ venue, artworks, artistName, unsupported, onBack }: ListOptions): void {
    const wallLabels = new Map(venue.walls.map((wall) => [wall.id, wall.label]));
    const items = venue.placements
      .map((placement) => ({ placement, art: artworks.find((a) => a.id === placement.artworkId) }))
      .filter((item): item is { placement: typeof item.placement; art: Artwork } => item.art !== undefined);

    const list =
      items.length === 0
        ? el('p', { class: 'empty' }, 'No pieces have been added to this room yet.')
        : el(
            'ul',
            { class: 'pieces' },
            ...items.map(({ placement, art }) =>
              el(
                'li',
                { class: 'piece' },
                el('img', { class: 'piece__image', src: assetUrl(art.image), alt: '', loading: 'lazy' }),
                el(
                  'div',
                  {},
                  el('h2', { class: 'piece__title' }, art.title),
                  el('p', {}, art.medium),
                  el('p', {}, formatSize(art.widthIn, art.heightIn)),
                  el('p', { class: 'piece__wall' }, wallLabels.get(placement.wallId) ?? ''),
                ),
              ),
            ),
          );

    this.showPanel(
      el(
        'section',
        { class: 'panel' },
        onBack &&
          el('button', { type: 'button', class: 'button button--secondary button--back', onClick: onBack }, 'Back to room'),
        heading(`Pieces for ${venue.name}`),
        el('p', { class: 'byline' }, `Artwork by ${artistName}`),
        unsupported &&
          el('p', { class: 'note' }, 'This device can’t show the 3D room, so the pieces are listed here instead.'),
        list,
      ),
      { onEscape: onBack },
    );
  }

  showNotFound(artistName: string): void {
    this.showPanel(
      el(
        'section',
        { class: 'panel panel--center' },
        heading('Page Not Available'),
        el('p', {}, 'This link may be out of date. Ask the person who sent it for a new one.'),
        el('p', { class: 'byline' }, `Artwork by ${artistName}`),
      ),
    );
  }

  showIntro({ venueName, artistName, onStart }: IntroOptions): void {
    const startButton = el(
      'button',
      {
        type: 'button',
        class: 'button button--primary intro__start',
        onClick: () => onStart(),
      },
      'Start',
    );
    this.reset();
    this.stage.removeAttribute('aria-hidden');
    this.root.append(
      el(
        'main',
        { class: 'screen screen--intro' },
        el(
          'section',
          { class: 'panel panel--center intro' },
          el('h1', { class: 'panel__title' }, `Artwork by ${artistName}`),
          el('p', { class: 'intro__for' }, 'for ', el('em', {}, venueName)),
          el('p', {}, 'See how each piece fits on your walls at real size.'),
          el('div', { class: 'actions' }, startButton),
        ),
      ),
    );
    startButton.focus();
  }

  showHome(artistName: string): void {
    this.showPanel(
      el(
        'section',
        { class: 'panel panel--center' },
        heading(`Artwork by ${artistName}`),
        el('p', {}, 'Room previews are shared by private link.'),
      ),
    );
  }

  showPitchChrome(options: PitchChromeOptions): PitchChromeHandle {
    const {
      venueName,
      artistName,
      focusAllPieces,
      onAllPieces,
      devModeBanner,
      devValidationMessages,
      viewpointCount,
      viewpointIndex,
      viewpointLabel,
      viewpoints,
      onPrev,
      onNext,
      onPickViewpoint,
      onFirstInteraction,
      onExploreRoom,
      onBackToTour,
      onRecenterExplore,
    } = options;

    this.reset();
    this.stage.removeAttribute('aria-hidden');

    const statusLabel = el(
      'span',
      { class: 'viewpoint-bar__status' },
      formatViewpointStatus(viewpointIndex, viewpointCount, viewpointLabel),
    );
    const listPanel = el(
      'ul',
      { class: 'viewpoint-list', hidden: true, id: 'viewpoint-list' },
      ...viewpoints.map((vp, i) =>
        el(
          'li',
          {},
          el(
            'button',
            {
              type: 'button',
              class: 'viewpoint-list__item',
              'aria-current': i === viewpointIndex ? 'true' : undefined,
              onClick: () => {
                onFirstInteraction();
                onPickViewpoint(i);
                listPanel.hidden = true;
                picker.setAttribute('aria-expanded', 'false');
              },
            },
            vp.label,
          ),
        ),
      ),
    );

    const prevBtn = el(
      'button',
      {
        type: 'button',
        class: 'viewpoint-bar__arrow',
        'aria-label': 'Previous view',
        onClick: () => {
          onFirstInteraction();
          onPrev();
        },
      },
      '‹',
    );
    const nextBtn = el(
      'button',
      {
        type: 'button',
        class: 'viewpoint-bar__arrow',
        'aria-label': 'Next view',
        onClick: () => {
          onFirstInteraction();
          onNext();
        },
      },
      '›',
    );

    const picker = el(
      'button',
      {
        type: 'button',
        class: 'viewpoint-bar__picker',
        'aria-expanded': 'false',
        'aria-controls': 'viewpoint-list',
        onClick: () => {
          onFirstInteraction();
          const open = listPanel.hidden;
          listPanel.hidden = !open;
          picker.setAttribute('aria-expanded', open ? 'true' : 'false');
        },
      },
      statusLabel,
    );

    const hint = el(
      'p',
      {
        class: 'pitch-hint',
        role: 'status',
      },
      'Swipe or tap the arrows for each wall — or explore the whole room.',
    );

    const exploreRoom = el(
      'button',
      {
        type: 'button',
        class: 'button button--secondary',
        onClick: () => {
          onFirstInteraction();
          onExploreRoom();
        },
      },
      'Explore room',
    );

    const allPieces = el(
      'button',
      { type: 'button', class: 'button button--secondary', onClick: onAllPieces },
      'All Pieces',
    );

    const recenterExplore = el(
      'button',
      {
        type: 'button',
        class: 'button button--secondary',
        onClick: onRecenterExplore,
      },
      'Recenter',
    );

    const backToTour = el(
      'button',
      {
        type: 'button',
        class: 'button button--primary explore-bar__back',
        onClick: onBackToTour,
      },
      'Back to guided views',
    );

    const exploreActions = el('div', { class: 'explore-bar__actions' }, recenterExplore, backToTour);

    const exploreBar = el(
      'div',
      { class: 'explore-bar', hidden: true, role: 'region', 'aria-label': 'Explore the room' },
      el('p', { class: 'explore-bar__hint' }, 'Drag to look around the whole space.'),
      exploreActions,
    );

    const devBanner =
      devModeBanner && el('p', { class: 'dev-banner', role: 'status' }, devModeBanner);
    const devList =
      devValidationMessages &&
      devValidationMessages.length > 0 &&
      el(
        'aside',
        { class: 'dev-validation', 'aria-label': 'Venue validation messages' },
        el('p', { class: 'dev-validation__title' }, 'Check (dev)'),
        el('ul', {}, ...devValidationMessages.map((msg) => el('li', {}, msg))),
      );

    const viewpointBar = el(
      'nav',
      { class: 'viewpoint-bar', 'aria-label': 'Room views' },
      prevBtn,
      el('div', { class: 'viewpoint-bar__center' }, picker, listPanel),
      nextBtn,
    );

    this.root.append(
      el(
        'header',
        { class: 'topbar' },
        el(
          'div',
          { class: 'topbar__titles' },
          el('h1', { class: 'topbar__title' }, venueName),
          el('p', { class: 'topbar__byline' }, `Artwork by ${artistName}`),
        ),
        el('div', { class: 'topbar__actions' }, exploreRoom, allPieces),
      ),
      hint,
      viewpointBar,
      exploreBar,
      ...(devBanner ? [devBanner] : []),
      ...(devList ? [devList] : []),
    );

    if (focusAllPieces) allPieces.focus();

    return {
      updateViewpoint: (index: number, label: string) => {
        statusLabel.textContent = formatViewpointStatus(index, viewpointCount, label);
        listPanel.querySelectorAll<HTMLButtonElement>('.viewpoint-list__item').forEach((btn, i) => {
          btn.setAttribute('aria-current', i === index ? 'true' : 'false');
        });
      },
      dismissHint: () => {
        hint.remove();
      },
      setExploreMode: (exploring: boolean) => {
        viewpointBar.hidden = exploring;
        exploreBar.hidden = !exploring;
        exploreRoom.hidden = exploring;
        if (exploring) {
          hint.remove();
          backToTour.focus();
        }
      },
    };
  }

  showRoom({
    venueName,
    artistName,
    focusAllPieces,
    onAllPieces,
    devModeBanner,
    devValidationMessages,
  }: RoomChromeOptions): void {
    this.reset();
    this.stage.removeAttribute('aria-hidden');
    const allPieces = el(
      'button',
      { type: 'button', class: 'button button--secondary', onClick: onAllPieces },
      'All Pieces',
    );
    const devBanner =
      devModeBanner &&
      el('p', { class: 'dev-banner', role: 'status' }, devModeBanner);
    const devList =
      devValidationMessages &&
      devValidationMessages.length > 0 &&
      el(
        'aside',
        { class: 'dev-validation', 'aria-label': 'Venue validation messages' },
        el('p', { class: 'dev-validation__title' }, 'Check (dev)'),
        el('ul', {}, ...devValidationMessages.map((msg) => el('li', {}, msg))),
      );
    this.root.append(
      el(
        'header',
        { class: 'topbar' },
        el(
          'div',
          { class: 'topbar__titles' },
          el('h1', { class: 'topbar__title' }, venueName),
          el('p', { class: 'topbar__byline' }, `Artwork by ${artistName}`),
        ),
        allPieces,
      ),
      ...(devBanner ? [devBanner] : []),
      ...(devList ? [devList] : []),
    );
    if (focusAllPieces) allPieces.focus();
  }

  private showPanel(panel: HTMLElement, options: { focus?: boolean; onEscape?: () => void } = {}): void {
    this.reset();
    this.stage.setAttribute('aria-hidden', 'true');
    this.root.append(el('main', { class: 'screen' }, panel));

    if (options.onEscape) {
      const onEscape = options.onEscape;
      this.escapeHandler = (event) => {
        if (event.key === 'Escape') onEscape();
      };
      document.addEventListener('keydown', this.escapeHandler);
    }
    if (options.focus !== false) {
      panel.querySelector<HTMLElement>('h1')?.focus();
    }
  }

  private reset(): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = undefined;
    }
    this.progressBar = undefined;
    this.progressText = undefined;
    this.root.replaceChildren();
  }
}

function heading(text: string): HTMLHeadingElement {
  return el('h1', { class: 'panel__title', tabindex: -1 }, text);
}

function assetUrl(path: string): string {
  return /^https?:\/\//.test(path) ? path : `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
}

function formatViewpointStatus(index: number, total: number, label: string): string {
  if (total <= 1) return label;
  return `${index + 1} of ${total} · ${label}`;
}
