import type { Venue, VenueScan } from '../types';

export type RoomVisualMode = 'measured' | 'scan';

/**
 * FEAT-06: measured room is always the fallback. Spark integration will return
 * `scan` when `venue.scan` loads within the time budget (REQ-06-06).
 */
export function resolveInitialRoomMode(venue: Venue): RoomVisualMode {
  if (!venue.scan?.url) return 'measured';
  return 'measured';
}

export function describeScan(scan: VenueScan | undefined): string | null {
  if (!scan?.url) return null;
  const fmt = scan.format ?? guessScanFormat(scan.url);
  return `scan (${fmt}) ${scan.url}`;
}

function guessScanFormat(url: string): 'spz' | 'ply' {
  const lower = url.toLowerCase();
  if (lower.endsWith('.ply')) return 'ply';
  return 'spz';
}
