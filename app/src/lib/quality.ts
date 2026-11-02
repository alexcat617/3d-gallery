export type Quality = 'low' | 'medium' | 'high';

export interface QualitySettings {
  maxPixelRatio: number;
  antialias: boolean;
}

export const QUALITY_SETTINGS: Record<Quality, QualitySettings> = {
  low: { maxPixelRatio: 1, antialias: false },
  medium: { maxPixelRatio: 1.5, antialias: true },
  high: { maxPixelRatio: 2, antialias: true },
};

function isQuality(value: string | null): value is Quality {
  return value === 'low' || value === 'medium' || value === 'high';
}

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * `?quality=` wins. Local dev defaults to `low` because the dev laptop has
 * integrated graphics (PRD §6.1). Production picks from the device.
 */
export function pickQuality(params: URLSearchParams): Quality {
  const requested = params.get('quality');
  if (isQuality(requested)) return requested;
  if (import.meta.env.DEV) return 'low';

  const memory = (navigator as NavigatorWithMemory).deviceMemory;
  const cores = navigator.hardwareConcurrency || 4;
  if ((memory !== undefined && memory <= 4) || cores <= 4) return 'low';
  if (window.matchMedia('(pointer: coarse)').matches) return 'medium';
  return 'high';
}
