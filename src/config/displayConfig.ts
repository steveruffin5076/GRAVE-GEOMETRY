import { DESIGN_H, DESIGN_W } from './constants.ts';

/** Phaser-free subset for tests and documentation. */
export const DISPLAY_CONFIG = {
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  width: DESIGN_W,
  height: DESIGN_H,
  renderPixelArt: true,
  powerPreference: 'high-performance' as const,
} as const;
