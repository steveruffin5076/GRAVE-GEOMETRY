import Phaser from 'phaser';
import { aimAtGridUnderDrawPoint } from '../core/math/aimGrid.ts';
import type { Vec2 } from '../core/math/vec2.ts';

const worldScratch = new Phaser.Math.Vector2();

export function aimFromCameraPointer(
  cam: Phaser.Cameras.Scene2D.Camera,
  pointerViewX: number,
  pointerViewY: number,
  playerWorldX: number,
  playerWorldY: number,
  previousAim: Vec2,
): Vec2 {
  cam.getWorldPoint(pointerViewX, pointerViewY, worldScratch);
  return aimAtGridUnderDrawPoint(
    worldScratch.x,
    worldScratch.y,
    playerWorldX,
    playerWorldY,
    previousAim,
  );
}
