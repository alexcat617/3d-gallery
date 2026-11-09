/** All lengths are inches unless the name says otherwise. See PRD §7 "Data model". */

export interface Site {
  artistName: string;
  /** Absolute origin for OG URLs, e.g. https://user.github.io/3d-gallery */
  pagesOrigin: string;
}

export interface Frame {
  color: string;
  widthIn: number;
}

export interface Artwork {
  id: string;
  title: string;
  medium: string;
  widthIn: number;
  heightIn: number;
  depthIn?: number;
  frame?: Frame;
  image: string;
}

export interface Point2 {
  xIn: number;
  zIn: number;
}

export interface Point3 {
  xIn: number;
  yIn: number;
  zIn: number;
}

export interface Opening {
  kind: 'door' | 'window' | 'vent' | 'switch' | 'other';
  fromLeftIn: number;
  fromFloorIn: number;
  widthIn: number;
  heightIn: number;
}

export interface Soffit {
  fromLeftIn: number;
  widthIn: number;
  dropIn: number;
}

export interface Wall {
  id: string;
  label: string;
  photo?: string;
  heightIn?: number;
  heightLeftIn?: number;
  heightRightIn?: number;
  soffits?: Soffit[];
  wainscotIn?: number;
  furnitureTopIn?: number;
  openings?: Opening[];
  estimated?: string[];
}

export interface Fixture {
  id: string;
  label: string;
  wallId: string;
  fromLeftIn: number;
  widthIn: number;
  heightIn: number;
  depthIn: number;
}

export interface HangRules {
  clearanceIn: number;
  minCenterIn: number;
  topMarginIn: number;
}

export interface Placement {
  artworkId: string;
  wallId: string;
  centerFromLeftIn: number;
  centerFromFloorIn?: number;
}

export interface Viewpoint {
  id: string;
  label: string;
  position: Point3;
  lookAt: Point3;
  eyeHeightIn?: number;
}

/** Gaussian splat scan hosted outside git (FEAT-06, REQ-06-02). */
export interface VenueScan {
  url: string;
  format?: 'spz' | 'ply';
  scale?: number;
  rotation?: [number, number, number];
  offset?: Point3;
}

export interface Venue {
  id: string;
  name: string;
  /** Optional link-preview image under `public/` (FEAT-07). */
  shareImage?: string;
  /** When set and load succeeds, show scan instead of textured measured walls (FEAT-06). */
  scan?: VenueScan;
  ceilingIn: number;
  /** Floor outline, clockwise from the entrance. Wall i runs corners[i] → corners[i + 1]. */
  corners: Point2[];
  wallColor?: string;
  hang?: Partial<HangRules>;
  walls: Wall[];
  fixtures?: Fixture[];
  placements: Placement[];
  viewpoints: Viewpoint[];
}
