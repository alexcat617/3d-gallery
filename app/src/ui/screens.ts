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
