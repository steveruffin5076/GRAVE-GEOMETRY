import Phaser from 'phaser';
import { DESIGN_H, DESIGN_W } from '../config/constants.ts';
import { worldToScreen } from '../core/math/iso.ts';
import { mapDrawToViewport } from '../core/math/viewport.ts';
import type { LayoutMode } from '../ui/layout.ts';
import { portraitCameraZoom } from '../ui/layout.ts';

export { mapDrawToViewport, playerDrawToViewport } from '../core/math/viewport.ts';

export function playerViewportPosition(
  playerWorldX: number,
  playerWorldY: number,
  cam: Phaser.Cameras.Scene2D.Camera,
): { x: number; y: number } {
  const draw = worldToScreen(playerWorldX, playerWorldY);
  return mapDrawToViewport(draw.x, draw.y, cam.scrollX, cam.scrollY, cam.zoom);
}

export function applyIntegerGameScale(
  cam: Phaser.Cameras.Scene2D.Camera,
  layoutMode: LayoutMode = 'landscape',
): void {
  /* Phaser Scale.RESIZE already integer-scales the canvas; only apply portrait zoom here. */
  cam.setZoom(portraitCameraZoom(layoutMode));
}

export function setupMapCamera(
  scene: Phaser.Scene,
  focusWorldX: number,
  focusWorldY: number,
  worldW: number,
  worldH: number,
  followTarget?: Phaser.GameObjects.Zone,
): Phaser.Cameras.Scene2D.Camera {
  const cam = scene.cameras.main;
  cam.setRoundPixels(true);

  if (followTarget !== undefined) {
    cam.startFollow(followTarget, true, 0.12, 0.12);
  } else {
    const scr = worldToScreen(focusWorldX, focusWorldY);
    const focusScreen = scene.add.zone(Math.round(scr.x), Math.round(scr.y), 1, 1);
    cam.startFollow(focusScreen, true, 0.1, 0.1);
  }

  const corners = [
    worldToScreen(0, 0),
    worldToScreen(worldW, 0),
    worldToScreen(0, worldH),
    worldToScreen(worldW, worldH),
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    minY = Math.min(minY, c.y);
    maxX = Math.max(maxX, c.x);
    maxY = Math.max(maxY, c.y);
  }

  cam.setBounds(
    Math.floor(minX - DESIGN_W / 2),
    Math.floor(minY - DESIGN_H / 2),
    Math.ceil(maxX - minX + DESIGN_W),
    Math.ceil(maxY - minY + DESIGN_H),
  );
  return cam;
}

export function bindResponsiveScale(
  game: Phaser.Game,
  scene: Phaser.Scene,
  getLayout: () => LayoutMode = () => 'landscape',
): void {
  const refresh = (): void => {
    applyIntegerGameScale(scene.cameras.main, getLayout());
  };
  refresh();
  window.addEventListener('resize', refresh);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener('resize', refresh);
  });
  game.scale.on('resize', refresh);
}
