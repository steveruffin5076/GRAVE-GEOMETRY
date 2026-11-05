import Phaser from 'phaser';
import { BALANCE } from '../config/balance.ts';
import { shouldScreenShake } from './visualSettings.ts';
import type { GameSettings } from '../persistence/storage.ts';

export function applyCameraShake(
  camera: Phaser.Cameras.Scene2D.Camera,
  settings: GameSettings,
  intensity: number,
): void {
  if (!shouldScreenShake(settings)) return;
  const px = Math.min(BALANCE.vfx.screenShakeMaxPx, intensity);
  if (px <= 0) return;
  camera.shake(120, px * 0.002);
}

export function shakeOnHit(camera: Phaser.Cameras.Scene2D.Camera, settings: GameSettings, damage: number): void {
  applyCameraShake(camera, settings, Math.min(4, damage / 20));
}

export function shakeOnWave(camera: Phaser.Cameras.Scene2D.Camera, settings: GameSettings): void {
  applyCameraShake(camera, settings, BALANCE.vfx.screenShakeMaxPx);
}
