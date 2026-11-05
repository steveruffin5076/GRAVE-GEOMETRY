import Phaser from 'phaser';
import { DESIGN_H, DESIGN_W } from './constants.ts';
import { DISPLAY_CONFIG } from './displayConfig.ts';
import { BACKGROUND_COLOUR } from './palette.ts';

export const PHASER_GAME_CONFIG = {
  type: Phaser.AUTO,
  width: DISPLAY_CONFIG.width,
  height: DISPLAY_CONFIG.height,
  backgroundColor: BACKGROUND_COLOUR,
  pixelArt: DISPLAY_CONFIG.pixelArt,
  roundPixels: DISPLAY_CONFIG.roundPixels,
  antialias: DISPLAY_CONFIG.antialias,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_W,
    height: DESIGN_H,
  },
  render: {
    pixelArt: DISPLAY_CONFIG.renderPixelArt,
    powerPreference: DISPLAY_CONFIG.powerPreference,
  },
  dom: {
    createContainer: true,
  },
} as const;
