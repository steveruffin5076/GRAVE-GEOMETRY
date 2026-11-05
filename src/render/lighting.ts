import Phaser from 'phaser';
import { PALETTE } from '../config/palette.ts';
import { LAYER } from '../config/constants.ts';
import { worldToScreen } from '../core/math/iso.ts';
import type { RunState } from '../game/state.ts';

export class LightingRenderer {
  private gfx: Phaser.GameObjects.Graphics;
  private enabled = true;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(LAYER.FX - 1);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.gfx.clear();
  }

  draw(state: RunState): void {
    this.gfx.clear();
    if (!this.enabled) return;
    for (const pool of state.acidPools) {
      const s = worldToScreen(pool.x, pool.y);
      const cx = Math.round(s.x);
      const cy = Math.round(s.y);
      this.gfx.fillStyle(Number(`0x${PALETTE.acid1.slice(1)}`), 0.12);
      this.gfx.fillCircle(cx, cy - 4, Math.round(pool.radius * 0.55));
    }
    const ps = worldToScreen(state.player.x, state.player.y);
    this.gfx.fillStyle(Number(`0x${PALETTE.ui3.slice(1)}`), 0.08);
    this.gfx.fillCircle(Math.round(ps.x), Math.round(ps.y - 10), 28);
  }
}
