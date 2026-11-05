import Phaser from 'phaser';
import { PALETTE } from '../config/palette.ts';
import { worldToScreen } from '../core/math/iso.ts';
import type { PlayerState } from '../game/state.ts';

const USE_PLACEHOLDERS = import.meta.env.VITE_USE_PLACEHOLDERS !== 'false';

export function getSpritePlaceholderFlag(): boolean {
  return USE_PLACEHOLDERS;
}

export function drawWeaponOverlay(g: Phaser.GameObjects.Graphics, player: PlayerState): void {
  if (!USE_PLACEHOLDERS) return;
  const s = worldToScreen(player.x, player.y);
  const cx = Math.round(s.x);
  const cy = Math.round(s.y);
  const ax = Math.round(player.aim.x * 8);
  const ay = Math.round(player.aim.y * 8);
  g.lineStyle(2, Number(`0x${PALETTE.ui3.slice(1)}`), 1);
  g.lineBetween(cx, cy - 6, cx + ax, cy - 6 + ay);
}
