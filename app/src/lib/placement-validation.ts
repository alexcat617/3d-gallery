import {
  clearTopIn,
  minWallTopInSpan,
  recommendedCenterFromFloorIn,
  resolveHangRules,
  wallTopAtFromLeft,
} from './hang-height';
import type { Artwork, Placement, Venue, Wall } from '../types';
import type { WallSegment } from '../scene/wall-geometry';

export interface PlacementIssue {
  severity: 'error' | 'warn';
  message: string;
  kind: 'keep-clear' | 'opening' | 'overlap' | 'bounds' | 'ceiling';
}

function outerSize(art: Artwork): { w: number; h: number } {
  const frameW = art.frame?.widthIn ?? 0;
  return { w: art.widthIn + 2 * frameW, h: art.heightIn + 2 * frameW };
}

function rectsOverlap(
  a: { left: number; right: number; bottom: number; top: number },
  b: { left: number; right: number; bottom: number; top: number },
): boolean {
  return a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom;
}

/** Validate one placement for arrange mode (no auto-nudge). */
export function validatePlacementForArrange(
  venue: Venue,
  wall: Wall,
  seg: WallSegment,
  placement: Placement,
  art: Artwork,
  allOnWall: Placement[],
  artworksById: Map<string, Artwork>,
  options: { allowKeepClearOverride?: boolean },
): PlacementIssue[] {
  const issues: PlacementIssue[] = [];
  const hang = resolveHangRules(venue);
  const { w: outerWIn, h: outerHIn } = outerSize(art);
  const halfW = outerWIn / 2;
  const halfH = outerHIn / 2;
  const centerY =
    placement.centerFromFloorIn ??
    recommendedCenterFromFloorIn(wall, outerHIn, hang);
  const rect = {
    left: placement.centerFromLeftIn - halfW,
    right: placement.centerFromLeftIn + halfW,
    bottom: centerY - halfH,
    top: centerY + halfH,
  };

  if (rect.left < -0.01 || rect.right > seg.lengthIn + 0.01) {
    issues.push({
      severity: 'error',
      kind: 'bounds',
      message: `Off the wall (${rect.left.toFixed(0)}–${rect.right.toFixed(0)} in on a ${seg.lengthIn.toFixed(0)} in wall).`,
    });
  }

  const clearTop = clearTopIn(wall);
  const clearanceLine = clearTop + hang.clearanceIn;
  if (rect.bottom < clearanceLine - 0.01) {
    const gap = clearanceLine - rect.bottom;
    const msg = `Too low: clears furniture by ${gap.toFixed(0)} in (${hang.clearanceIn} in recommended above ${clearTop.toFixed(0)} in).`;
    if (options.allowKeepClearOverride) {
      issues.push({ severity: 'warn', kind: 'keep-clear', message: msg });
    } else {
      issues.push({ severity: 'error', kind: 'keep-clear', message: msg });
    }
  }

  if (wall.openings) {
    for (const o of wall.openings) {
      const oRect = {
        left: o.fromLeftIn,
        right: o.fromLeftIn + o.widthIn,
        bottom: o.fromFloorIn,
        top: o.fromFloorIn + o.heightIn,
      };
      if (rectsOverlap(rect, oRect)) {
        issues.push({
          severity: 'error',
          kind: 'opening',
          message: `Overlaps ${o.kind} on this wall.`,
        });
      }
    }
  }

  for (const other of allOnWall) {
    if (other.artworkId === placement.artworkId) continue;
    const otherArt = artworksById.get(other.artworkId);
    if (!otherArt) continue;
    const oSize = outerSize(otherArt);
    const ocy =
      other.centerFromFloorIn ??
      recommendedCenterFromFloorIn(wall, oSize.h, hang);
    const oRect = {
      left: other.centerFromLeftIn - oSize.w / 2,
      right: other.centerFromLeftIn + oSize.w / 2,
      bottom: ocy - oSize.h / 2,
      top: ocy + oSize.h / 2,
    };
    if (rectsOverlap(rect, oRect)) {
      issues.push({
        severity: 'error',
        kind: 'overlap',
        message: `Overlaps "${otherArt.title}".`,
      });
    }
  }

  const spanTop = minWallTopInSpan(wall, rect.left, rect.right, seg.lengthIn, venue.ceilingIn);
  if (rect.top > spanTop - hang.topMarginIn + 0.01) {
    issues.push({
      severity: 'error',
      kind: 'ceiling',
      message: `Too high for this wall (top ~${rect.top.toFixed(0)} in; limit ~${(spanTop - hang.topMarginIn).toFixed(0)} in).`,
    });
  }

  const wallTopAtCenter = wallTopAtFromLeft(
    wall,
    placement.centerFromLeftIn,
    seg.lengthIn,
    venue.ceilingIn,
  );
  void wallTopAtCenter;

  return issues;
}

export function hasBlockingIssues(issues: PlacementIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}
