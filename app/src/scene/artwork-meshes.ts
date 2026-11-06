import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  Texture,
  TextureLoader,
  type LoadingManager,
} from 'three';
import type { Quality } from '../lib/quality';
import {
  clearTopIn,
  minWallTopInSpan,
  recommendedCenterFromFloorIn,
  resolveHangRules,
  wallTopAtFromLeft,
} from '../lib/hang-height';
import { inToM } from '../lib/units';
import type { Artwork, Placement, Venue, Wall } from '../types';
import { polygonCentroid, wallFacingQuaternion, wallSegment, type WallSegment } from './wall-geometry';

const MAX_EDGE: Record<Quality, number> = {
  low: 1024,
  medium: 2048,
  high: 2048,
};

const ART_INWARD_EPS_M = 0.003;

export async function addArtworkMeshes(
  room: Group,
  venue: Venue,
  artworks: Artwork[],
  options: { manager: LoadingManager; quality: Quality; validationMessages: string[] },
): Promise<void> {
  const byId = new Map(artworks.map((a) => [a.id, a]));
  const hang = resolveHangRules(venue);
  const ceilingDefault = venue.ceilingIn;
  const centroid = polygonCentroid(venue.corners);
  const n = venue.corners.length;
  const loader = new TextureLoader(options.manager);
  const piecesByWall = new Map<string, Rect[]>();

  for (const placement of venue.placements) {
    const art = byId.get(placement.artworkId);
    if (!art) {
      options.validationMessages.push(`Placement references unknown artworkId "${placement.artworkId}".`);
      continue;
    }

    const wi = venue.walls.findIndex((w) => w.id === placement.wallId);
    if (wi < 0 || wi >= n) {
      options.validationMessages.push(`Artwork "${art.title}" (${art.id}): unknown wallId "${placement.wallId}".`);
      continue;
    }

    const wall = venue.walls[wi]!;
    const seg = wallSegment(venue.corners[wi]!, venue.corners[(wi + 1) % n]!, centroid);
    if (seg.lengthIn <= 1e-6) continue;

    const frameW = art.frame?.widthIn ?? 0;
    const outerWIn = art.widthIn + 2 * frameW;
    const outerHIn = art.heightIn + 2 * frameW;
    const depthIn = art.depthIn ?? 1.5;

    let centerYIn = placement.centerFromFloorIn;
    if (centerYIn === undefined) {
      centerYIn = recommendedCenterFromFloorIn(wall, outerHIn, hang);
    }

    const fit = fitVerticalCenter(placement, art, wall, seg, outerHIn, centerYIn, hang, ceilingDefault);
    centerYIn = fit.centerYIn;
    for (const msg of fit.messages) options.validationMessages.push(msg);

    const texture = await loadArtTexture(loader, art.image);
    checkArtTexture(art, texture, options.quality, options.validationMessages);

    const artworkRoot = buildArtworkGroup(art, texture, outerWIn, outerHIn, depthIn);
    positionArtworkGroup(artworkRoot, placement.centerFromLeftIn, centerYIn, seg, depthIn);
    room.add(artworkRoot);

    validatePlacement(art, wall, seg, placement, outerWIn, outerHIn, centerYIn, hang, ceilingDefault, piecesByWall, options.validationMessages);
  }
}

interface Rect {
  left: number;
  right: number;
  bottom: number;
  top: number;
}

function fitVerticalCenter(
  placement: Placement,
  art: Artwork,
  wall: Wall,
  seg: WallSegment,
  outerHIn: number,
  initialCenterY: number,
  hang: ReturnType<typeof resolveHangRules>,
  ceilingIn: number,
): { centerYIn: number; messages: string[] } {
  const messages: string[] = [];
  let cy = initialCenterY;
  const halfH = outerHIn / 2;
  const bottom = cy - halfH;
  const top = cy + halfH;

  const clearTop = clearTopIn(wall);
  const clearanceLine = clearTop + hang.clearanceIn;

  const wallTopAtCenter = wallTopAtFromLeft(wall, placement.centerFromLeftIn, seg.lengthIn, ceilingIn);

  if (bottom < clearanceLine - 0.01) {
    messages.push(
      `Artwork "${art.title}" (${art.id}) on "${wall.label}": bottom (~${bottom.toFixed(0)} in) is below keep-clear line (${clearanceLine.toFixed(0)} in).`,
    );
  }

  if (top > wallTopAtCenter - hang.topMarginIn + 0.01) {
    messages.push(
      `Artwork "${art.title}" (${art.id}) on "${wall.label}": top (~${top.toFixed(0)} in) is within ${hang.topMarginIn} in of wall top (~${wallTopAtCenter.toFixed(0)} in) at center.`,
    );
  }

  const maxCenter = wallTopAtCenter - hang.topMarginIn - halfH;
  const minCenter = clearanceLine + halfH;
  if (minCenter <= maxCenter && (cy < minCenter || cy > maxCenter)) {
    const old = cy;
    cy = Math.min(maxCenter, Math.max(minCenter, cy));
    if (Math.abs(old - cy) > 0.5 && placement.centerFromFloorIn === undefined) {
      messages.push(
        `Artwork "${art.title}" (${art.id}) on "${wall.label}": vertical center nudged to ${cy.toFixed(0)} in (recommended ${old.toFixed(0)} in) to fit between keep-clear and top margin.`,
      );
    }
  }

  return { centerYIn: cy, messages };
}

function validatePlacement(
  art: Artwork,
  wall: Wall,
  seg: WallSegment,
  placement: Placement,
  outerWIn: number,
  outerHIn: number,
  centerYIn: number,
  hang: ReturnType<typeof resolveHangRules>,
  ceilingIn: number,
  piecesByWall: Map<string, Rect[]>,
  messages: string[],
): void {
  const halfW = outerWIn / 2;
  const halfH = outerHIn / 2;
  const rect: Rect = {
    left: placement.centerFromLeftIn - halfW,
    right: placement.centerFromLeftIn + halfW,
    bottom: centerYIn - halfH,
    top: centerYIn + halfH,
  };

  if (rect.left < -0.01 || rect.right > seg.lengthIn + 0.01) {
    messages.push(
      `Artwork "${art.title}" (${art.id}): horizontal span (${rect.left.toFixed(0)}–${rect.right.toFixed(0)} in) extends past wall (${seg.lengthIn.toFixed(0)} in).`,
    );
  }

  if (wall.openings) {
    for (const o of wall.openings) {
      const oRect: Rect = {
        left: o.fromLeftIn,
        right: o.fromLeftIn + o.widthIn,
        bottom: o.fromFloorIn,
        top: o.fromFloorIn + o.heightIn,
      };
      if (rectsOverlap(rect, oRect)) {
        messages.push(
          `Artwork "${art.title}" (${art.id}) overlaps ${o.kind} on "${wall.label}" (${wall.id}).`,
        );
      }
    }
  }

  const list = piecesByWall.get(wall.id) ?? [];
  for (const other of list) {
    if (rectsOverlap(rect, other)) {
      messages.push(`Artwork "${art.title}" (${art.id}) overlaps another piece on "${wall.label}".`);
    }
  }
  list.push(rect);
  piecesByWall.set(wall.id, list);

  const spanTop = minWallTopInSpan(wall, rect.left, rect.right, seg.lengthIn, ceilingIn);
  if (rect.top > spanTop - hang.topMarginIn + 0.01) {
    messages.push(
      `Artwork "${art.title}" (${art.id}): top may exceed allowed height at that wall span (wall top ~${spanTop.toFixed(0)} in).`,
    );
  }
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom;
}

function buildArtworkGroup(art: Artwork, texture: Texture, outerWIn: number, outerHIn: number, depthIn: number): Group {
  const g = new Group();
  g.name = `artwork-${art.id}`;

  const outerW = inToM(outerWIn);
  const outerH = inToM(outerHIn);
  const depth = inToM(depthIn);

  const frameWIn = art.frame?.widthIn ?? 0;
  const frameColor = new Color(art.frame?.color ?? '#5c4d3d');

  if (frameWIn > 0 && art.frame) {
    const innerW = art.widthIn;
    const innerH = art.heightIn;
    const totalW = innerW + 2 * frameWIn;
    const totalH = innerH + 2 * frameWIn;

    const frontTex = texture.clone();
    frontTex.colorSpace = LinearSRGBColorSpace;
    frontTex.minFilter = LinearFilter;
    frontTex.magFilter = LinearFilter;
    frontTex.flipY = false;
    const uR = innerW / totalW;
    const vR = innerH / totalH;
    const uO = frameWIn / totalW;
    const vO = frameWIn / totalH;
    frontTex.repeat.set(uR, vR);
    frontTex.offset.set(uO, vO);
    frontTex.needsUpdate = true;

    const matSides = new MeshStandardMaterial({ color: frameColor, roughness: 0.85, metalness: 0 });
    const matFront = new MeshStandardMaterial({
      map: frontTex,
      roughness: 0.88,
      metalness: 0,
      side: DoubleSide,
    });
    const geom = new BoxGeometry(outerW, outerH, depth);
    const mesh = new Mesh(geom, [matSides, matSides, matSides, matSides, matFront, matSides]);
    g.add(mesh);
  } else {
    const mat = new MeshStandardMaterial({
      map: texture,
      roughness: 0.88,
      metalness: 0,
      side: DoubleSide,
    });
    g.add(new Mesh(new BoxGeometry(outerW, outerH, depth), mat));
  }

  return g;
}

function positionArtworkGroup(
  root: Group,
  centerFromLeftIn: number,
  centerFromFloorIn: number,
  seg: WallSegment,
  depthIn: number,
): void {
  const half = seg.lengthIn / 2;
  const alongM = inToM(centerFromLeftIn - half);
  const depth = inToM(depthIn);
  root.position.set(
    seg.mid.x + seg.along.x * alongM,
    inToM(centerFromFloorIn),
    seg.mid.z + seg.along.z * alongM,
  );
  root.position.addScaledVector(seg.inward, depth / 2 + ART_INWARD_EPS_M);
  root.quaternion.copy(wallFacingQuaternion(seg));
}

function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${base}${path.replace(/^\//, '')}`;
}

async function loadArtTexture(loader: TextureLoader, path: string): Promise<Texture> {
  const url = resolveAssetUrl(path);
  const texture = await new Promise<Texture>((resolve, reject) => {
    loader.load(
      url,
      (tex) => resolve(tex),
      undefined,
      (err) => reject(err ?? new Error('Art texture load failed')),
    );
  });
  texture.colorSpace = LinearSRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.flipY = false;
  return texture;
}

function checkArtTexture(art: Artwork, texture: Texture, quality: Quality, messages: string[]): void {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const iw = image?.width;
  const ih = image?.height;
  if (iw && ih) {
    const aspectImg = iw / ih;
    const aspectArt = art.widthIn / art.heightIn;
    const diff = Math.abs(aspectImg - aspectArt) / aspectArt;
    if (diff > 0.03) {
      messages.push(
        `Artwork "${art.title}" (${art.id}): image aspect ${aspectImg.toFixed(3)} vs declared ${aspectArt.toFixed(3)} (${(diff * 100).toFixed(0)}% off).`,
      );
    }
    const maxLong = Math.max(iw, ih);
    const cap = MAX_EDGE[quality];
    if (maxLong > cap) {
      messages.push(
        `Artwork "${art.title}" (${art.id}): image long edge ${maxLong}px exceeds ${cap}px for quality "${quality}".`,
      );
    }
  }
}
