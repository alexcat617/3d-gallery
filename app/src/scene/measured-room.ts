import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  type LoadingManager,
} from 'three';
import { inToM } from '../lib/units';
import type { Opening, Point2, Venue, Wall } from '../types';

const DEFAULT_WALL_COLOR = '#e9e4dc';
const OPENING_COLOR = '#1a1a1a';
const OPENING_OPACITY = 0.55;
const SOFFIT_COLOR = '#8a8278';
const CLEAR_SHADE = 'rgba(255, 140, 0, 0.22)';
const CLEARANCE_DEFAULT_IN = 10;
const DEBUG_FONT = '14px system-ui, sans-serif';

function resolveAssetUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return `${base}${path.replace(/^\//, '')}`;
}

export interface RoomBuildResult {
  group: Group;
  /** Dev-only: texture aspect vs wall aspect mismatch, opening out of bounds, etc. */
  validationMessages: string[];
}

/**
 * Full measured room: textured walls when `photo` is set, openings, optional
 * soffits, fixtures, keep-clear debug shade, and optional dimension sprites.
 */
export async function createMeasuredRoom(
  venue: Venue,
  options: {
    manager: LoadingManager;
    debug: boolean;
    showLabels: boolean;
  },
): Promise<RoomBuildResult> {
  const validationMessages: string[] = [];
  if (venue.corners.length < 3) {
    throw new Error(`Venue ${venue.id} needs at least 3 corners`);
  }

  const n = venue.corners.length;
  if (venue.walls.length !== n) {
    validationMessages.push(
      `Wall count (${venue.walls.length}) does not match corner count (${n}); extra walls are ignored or indices misaligned.`,
    );
  }

  const room = new Group();
  room.name = 'measured-room';

  const ceilingDefault = venue.ceilingIn;
  const floorY = 0;

  const centroid2 = polygonCentroid(venue.corners);

  const loader = new TextureLoader(options.manager);
  const hang = venue.hang ?? {};

  for (let i = 0; i < n; i++) {
    const start = venue.corners[i]!;
    const end = venue.corners[(i + 1) % n]!;
    const wall = venue.walls[i];
    if (!wall) continue;

    const seg = wallSegment(start, end, centroid2);
    if (seg.lengthIn <= 1e-6) continue;

    const hL = wallHeightAtLeft(wall, ceilingDefault);
    const hR = wallHeightAtRight(wall, ceilingDefault);

    let material: MeshStandardMaterial;
    if (wall.photo) {
      try {
        const texture = await loadWallTexture(loader, resolveAssetUrl(wall.photo));
        material = new MeshStandardMaterial({
          map: texture,
          roughness: 1,
          metalness: 0,
          side: DoubleSide,
        });
        checkPhotoAspect(wall, seg.lengthIn, Math.max(hL, hR), texture, validationMessages);
      } catch (e) {
        console.warn(`Wall ${wall.id}: failed to load photo`, e);
        material = fallbackWallMaterial(venue.wallColor);
        validationMessages.push(`Wall "${wall.label}" (${wall.id}): photo failed to load — using fallback color.`);
      }
    } else {
      material = fallbackWallMaterial(venue.wallColor);
    }

    const wallMesh = createWallQuadMesh(seg, hL, hR, floorY, material);
    wallMesh.name = wall.id;
    room.add(wallMesh);

    if (wall.openings) {
      for (const opening of wall.openings) {
        validateOpening(wall, opening, seg.lengthIn, hL, hR, validationMessages);
        room.add(createOpeningMesh(seg, opening, hL, hR, floorY));
      }
    }

    if (wall.soffits && wall.soffits.length > 0) {
      for (const soffit of wall.soffits) {
        room.add(createSoffitMesh(seg, soffit, hL, hR, floorY, ceilingDefault));
      }
    }

    if (options.debug && (wall.wainscotIn !== undefined || wall.furnitureTopIn !== undefined)) {
      room.add(
        createKeepClearOverlay(
          seg,
          wall,
          hL,
          hR,
          floorY,
          hang.clearanceIn ?? CLEARANCE_DEFAULT_IN,
        ),
      );
    }

    if (options.showLabels) {
      const widthLabel = formatWallSize(seg.lengthIn);
      const heightLabel = formatWallSize(Math.max(hL, hR));
      const est = wall.estimated?.includes('widthIn') ?? false;
      const suffix = est ? ' (est.)' : '';
      room.add(
        createWallLabelSprite(
          seg,
          (hL + hR) / 2,
          `${widthLabel} × ${heightLabel}${suffix}`,
          floorY,
        ),
      );
    }
  }

  const outline = new Shape(venue.corners.map((c) => new Vector2(inToM(c.xIn), -inToM(c.zIn))));
  const floorGeometry = new ShapeGeometry(outline);

  const floor = new Mesh(
    floorGeometry,
    new MeshStandardMaterial({ color: '#b9ad9d', roughness: 1, side: DoubleSide }),
  );
  floor.name = 'floor';
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);

  const ceiling = new Mesh(
    floorGeometry.clone(),
    new MeshStandardMaterial({ color: '#f4f2ee', roughness: 1, side: DoubleSide }),
  );
  ceiling.name = 'ceiling';
  ceiling.rotation.x = -Math.PI / 2;
  ceiling.position.y = inToM(ceilingDefault);
  room.add(ceiling);

  if (venue.fixtures) {
    for (const fx of venue.fixtures) {
      const wallIndex = venue.walls.findIndex((w) => w.id === fx.wallId);
      if (wallIndex < 0 || wallIndex >= n) {
        validationMessages.push(`Fixture "${fx.label}" references unknown wallId "${fx.wallId}".`);
        continue;
      }
      const s = venue.corners[wallIndex]!;
      const e = venue.corners[(wallIndex + 1) % n]!;
      const seg = wallSegment(s, e, centroid2);
      room.add(createFixtureBox(seg, fx, floorY, validationMessages));
    }
  }

  room.add(new HemisphereLight('#ffffff', '#b0a89c', 1.6));
  const sun = new DirectionalLight('#ffffff', 1.2);
  sun.position.set(-3, 6, 4);
  room.add(sun);

  return { group: room, validationMessages };
}

function fallbackWallMaterial(wallColor?: string): MeshStandardMaterial {
  return new MeshStandardMaterial({
    color: new Color(wallColor ?? DEFAULT_WALL_COLOR),
    roughness: 0.95,
    side: DoubleSide,
  });
}

async function loadWallTexture(loader: TextureLoader, url: string): Promise<Texture> {
  const texture = await new Promise<Texture>((resolve, reject) => {
    loader.load(
      url,
      (tex) => resolve(tex),
      undefined,
      (err) => reject(err ?? new Error('Texture load failed')),
    );
  });
  texture.colorSpace = LinearSRGBColorSpace;
  texture.anisotropy = 4;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.flipY = false;
  return texture;
}

function checkPhotoAspect(
  wall: Wall,
  widthIn: number,
  heightIn: number,
  texture: Texture,
  messages: string[],
): void {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const iw = image?.width;
  const ih = image?.height;
  if (!iw || !ih) return;
  const aspectTex = iw / ih;
  const aspectWall = widthIn / heightIn;
  const diff = Math.abs(aspectTex - aspectWall) / aspectWall;
  if (diff > 0.1) {
    messages.push(
      `Wall "${wall.label}" (${wall.id}): photo aspect ${aspectTex.toFixed(3)} vs wall ${aspectWall.toFixed(3)} (${(diff * 100).toFixed(0)}% off).`,
    );
  }
}

function validateOpening(
  wall: Wall,
  o: Opening,
  wallWidthIn: number,
  hL: number,
  hR: number,
  messages: string[],
): void {
  if (o.fromLeftIn < 0 || o.fromLeftIn + o.widthIn > wallWidthIn) {
    messages.push(
      `Wall "${wall.label}" (${wall.id}): opening (${o.kind}) extends past wall edge (fromLeft ${o.fromLeftIn} in, width ${o.widthIn} in, wall ${wallWidthIn.toFixed(0)} in).`,
    );
  }
  const t0 = o.fromLeftIn / wallWidthIn;
  const t1 = (o.fromLeftIn + o.widthIn) / wallWidthIn;
  const topAtLeft = lerp(hL, hR, t0);
  const topAtRight = lerp(hL, hR, t1);
  const wallTopAtOpening = Math.min(topAtLeft, topAtRight);
  if (o.fromFloorIn + o.heightIn > wallTopAtOpening + 0.01) {
    messages.push(
      `Wall "${wall.label}" (${wall.id}): opening (${o.kind}) top (${(o.fromFloorIn + o.heightIn).toFixed(0)} in) above wall top (~${wallTopAtOpening.toFixed(0)} in) at that span.`,
    );
  }
}

interface WallSegment {
  start: Point2;
  end: Point2;
  lengthIn: number;
  /** Unit along the wall from start → end. */
  along: Vector3;
  /** Normal pointing into the room (horizontal). */
  inward: Vector3;
  mid: Vector3;
}

function wallSegment(start: Point2, end: Point2, centroid: Vector2): WallSegment {
  const sx = inToM(start.xIn);
  const sz = inToM(start.zIn);
  const ex = inToM(end.xIn);
  const ez = inToM(end.zIn);
  const dx = ex - sx;
  const dz = ez - sz;
  const length = Math.hypot(dx, dz);
  const along = new Vector3(dx / length, 0, dz / length);

  const mid = new Vector3((sx + ex) / 2, 0, (sz + ez) / 2);
  const inward = new Vector3(-along.z, 0, along.x);
  const toCentroid = new Vector3(inToM(centroid.x) - mid.x, 0, inToM(centroid.y) - mid.z);
  if (inward.dot(toCentroid) < 0) inward.multiplyScalar(-1);

  return {
    start,
    end,
    lengthIn: length / inToM(1),
    along,
    inward,
    mid,
  };
}

function polygonCentroid(corners: Point2[]): Vector2 {
  let a = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < corners.length; i++) {
    const p0 = corners[i]!;
    const p1 = corners[(i + 1) % corners.length]!;
    const cross = p0.xIn * p1.zIn - p1.xIn * p0.zIn;
    a += cross;
    cx += (p0.xIn + p1.xIn) * cross;
    cz += (p0.zIn + p1.zIn) * cross;
  }
  a /= 2;
  if (Math.abs(a) < 1e-6) {
    const xs = corners.map((c) => c.xIn);
    const zs = corners.map((c) => c.zIn);
    return new Vector2(
      xs.reduce((s, x) => s + x, 0) / corners.length,
      zs.reduce((s, z) => s + z, 0) / corners.length,
    );
  }
  return new Vector2(cx / (6 * a), cz / (6 * a));
}

function wallHeightAtLeft(wall: Wall, ceilingIn: number): number {
  if (wall.heightIn !== undefined) return wall.heightIn;
  if (wall.heightLeftIn !== undefined) return wall.heightLeftIn;
  return ceilingIn;
}

function wallHeightAtRight(wall: Wall, ceilingIn: number): number {
  if (wall.heightIn !== undefined) return wall.heightIn;
  if (wall.heightRightIn !== undefined) return wall.heightRightIn;
  return ceilingIn;
}

/**
 * Vertical quad: bottom follows floorY; top follows linear slope from hL at left to hR at right.
 */
function createWallQuadMesh(
  seg: WallSegment,
  hL: number,
  hR: number,
  floorY: number,
  material: MeshStandardMaterial,
): Mesh {
  const w = inToM(seg.lengthIn);
  const y0 = floorY;
  const y1l = inToM(hL);
  const y1r = inToM(hR);

  const geometry = new BufferGeometry();
  const half = w / 2;
  // Local positions: x from -half to +half along wall; y is height above floor.
  const positions = new Float32Array([
    -half,
    y0,
    0,
    half,
    y0,
    0,
    half,
    y1r,
    0,
    -half,
    y1l,
    0,
  ]);
  const maxH = Math.max(hL, hR);
  const invMax = maxH > 0 ? 1 / maxH : 1;
  const uvs = new Float32Array([
    0,
    0,
    1,
    0,
    1,
    hR * invMax,
    0,
    hL * invMax,
  ]);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();

  const mesh = new Mesh(geometry, material);
  mesh.position.set(seg.mid.x, 0, seg.mid.z);
  alignMeshNormalToInward(mesh, seg);

  return mesh;
}

function createOpeningMesh(
  seg: WallSegment,
  o: Opening,
  hL: number,
  hR: number,
  floorY: number,
): Mesh {
  const wallW = seg.lengthIn;
  const half = wallW / 2;
  const left = o.fromLeftIn;
  const right = o.fromLeftIn + o.widthIn;
  const xL = inToM(left - half);
  const xR = inToM(right - half);

  const tL = (left + half) / wallW;
  const tR = (right + half) / wallW;
  const topL = lerp(hL, hR, tL);
  const topR = lerp(hL, hR, tR);

  const yBottom = floorY + inToM(o.fromFloorIn);
  const openTop = o.fromFloorIn + o.heightIn;
  const yTopL = inToM(Math.min(topL, openTop));
  const yTopR = inToM(Math.min(topR, openTop));

  const positions = new Float32Array([
    xL,
    yBottom,
    0.002,
    xR,
    yBottom,
    0.002,
    xR,
    yTopR,
    0.002,
    xL,
    yTopL,
    0.002,
  ]);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();

  const mat = new MeshBasicMaterial({
    color: OPENING_COLOR,
    transparent: true,
    opacity: OPENING_OPACITY,
    depthWrite: false,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, mat);
  mesh.position.set(seg.mid.x, 0, seg.mid.z);
  alignMeshNormalToInward(mesh, seg);
  return mesh;
}

function createSoffitMesh(
  seg: WallSegment,
  soffit: { fromLeftIn: number; widthIn: number; dropIn: number },
  hL: number,
  hR: number,
  floorY: number,
  ceilingDefault: number,
): Mesh {
  const wallW = seg.lengthIn;
  const half = wallW / 2;
  const left = soffit.fromLeftIn;
  const right = soffit.fromLeftIn + soffit.widthIn;
  const xL = inToM(left - half);
  const xR = inToM(right - half);

  const tL = (left + half) / wallW;
  const tR = (right + half) / wallW;
  const wallTopL = lerp(hL, hR, tL);
  const wallTopR = lerp(hL, hR, tR);
  const yTopL = inToM(wallTopL);
  const yTopR = inToM(wallTopR);
  const yBotL = inToM(Math.max(0, wallTopL - soffit.dropIn));
  const yBotR = inToM(Math.max(0, wallTopR - soffit.dropIn));

  void floorY;
  void ceilingDefault;

  const geometry = new BufferGeometry();
  const positions = new Float32Array([
    xL,
    yBotL,
    0.001,
    xR,
    yBotR,
    0.001,
    xR,
    yTopR,
    0.001,
    xL,
    yTopL,
    0.001,
  ]);
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();

  const mesh = new Mesh(
    geometry,
    new MeshStandardMaterial({ color: SOFFIT_COLOR, roughness: 1, side: DoubleSide }),
  );
  mesh.position.set(seg.mid.x, 0, seg.mid.z);
  alignMeshNormalToInward(mesh, seg);
  return mesh;
}

function createKeepClearOverlay(
  seg: WallSegment,
  wall: Wall,
  hL: number,
  hR: number,
  floorY: number,
  clearanceIn: number,
): Mesh {
  const wallW = seg.lengthIn;
  const wain = wall.wainscotIn ?? 0;
  const furn = wall.furnitureTopIn ?? 0;
  const clearTop = Math.max(wain, furn);
  const bandTop = clearTop + clearanceIn;

  const positions = new Float32Array([
    inToM(-wallW / 2),
    floorY,
    0.003,
    inToM(wallW / 2),
    floorY,
    0.003,
    inToM(wallW / 2),
    inToM(Math.min(bandTop, Math.max(hL, hR))),
    0.003,
    inToM(-wallW / 2),
    inToM(Math.min(bandTop, Math.max(hL, hR))),
    0.003,
  ]);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);

  const mesh = new Mesh(
    geometry,
    new MeshBasicMaterial({
      color: CLEAR_SHADE,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  mesh.position.set(seg.mid.x, 0, seg.mid.z);
  alignMeshNormalToInward(mesh, seg);
  return mesh;
}

function createFixtureBox(
  seg: WallSegment,
  fx: { fromLeftIn: number; widthIn: number; heightIn: number; depthIn: number; label: string },
  floorY: number,
  messages: string[],
): Mesh {
  const wallW = seg.lengthIn;
  if (fx.fromLeftIn < 0 || fx.fromLeftIn + fx.widthIn > wallW) {
    messages.push(`Fixture "${fx.label}" extends past wall edge.`);
  }

  const centerAlongIn = fx.fromLeftIn + fx.widthIn / 2 - wallW / 2;
  const depth = inToM(fx.depthIn);
  const width = inToM(fx.widthIn);
  const height = inToM(fx.heightIn);

  const geom = new BoxGeometry(width, height, depth);
  const mat = new MeshStandardMaterial({ color: '#5c534a', roughness: 0.9 });
  const mesh = new Mesh(geom, mat);
  mesh.name = fx.label;

  const alongM = inToM(centerAlongIn);
  /** Box back (local -Z after rotation) sits on the wall; center is depth/2 into the room. */
  const zOff = depth / 2 + 0.001;
  mesh.position.set(
    seg.mid.x + seg.along.x * alongM,
    floorY + height / 2,
    seg.mid.z + seg.along.z * alongM,
  );
  mesh.position.addScaledVector(seg.inward, zOff);
  alignMeshNormalToInward(mesh, seg);

  return mesh;
}

const _normalPlusZ = new Vector3(0, 0, 1);

function alignMeshNormalToInward(mesh: Mesh, seg: WallSegment): void {
  mesh.quaternion.setFromUnitVectors(_normalPlusZ, seg.inward);
}

function createWallLabelSprite(seg: WallSegment, avgHeightIn: number, text: string, floorY: number): Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const pad = 12;
  ctx.font = DEBUG_FONT;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width + pad * 2);
  canvas.height = 36;
  ctx.font = DEBUG_FONT;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, pad, 22);

  const map = new CanvasTexture(canvas);
  map.colorSpace = LinearSRGBColorSpace;
  const mat = new SpriteMaterial({ map, transparent: true });
  const sprite = new Sprite(mat);
  const scale = 0.35;
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1);
  const y = floorY + inToM(avgHeightIn) + 0.15;
  sprite.position.set(seg.mid.x + seg.inward.x * 0.2, y, seg.mid.z + seg.inward.z * 0.2);
  sprite.center.set(0.5, 0);
  return sprite;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function formatWallSize(inches: number): string {
  const rounded = Math.round(inches);
  const feet = Math.floor(rounded / 12);
  const rest = rounded % 12;
  if (feet === 0) return `${rest} in`;
  if (rest === 0) return `${feet} ft`;
  return `${feet} ft ${rest} in`;
}
