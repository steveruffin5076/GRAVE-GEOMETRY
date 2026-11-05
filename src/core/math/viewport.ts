import { worldToScreen } from './iso.ts';

/** Iso draw-space → canvas pixels (matches Phaser camera scroll/zoom). */
export function mapDrawToViewport(
  drawX: number,
  drawY: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
): { x: number; y: number } {
  return { x: (drawX - scrollX) * zoom, y: (drawY - scrollY) * zoom };
}

export function playerDrawToViewport(
  playerWorldX: number,
  playerWorldY: number,
  scrollX: number,
  scrollY: number,
  zoom: number,
): { x: number; y: number } {
  const draw = worldToScreen(playerWorldX, playerWorldY);
  return mapDrawToViewport(draw.x, draw.y, scrollX, scrollY, zoom);
}

/** Follow camera keeps the player near the view center — use for mouse aim. */
export function cameraAimAnchor(viewWidth: number, viewHeight: number): { x: number; y: number } {
  return { x: viewWidth * 0.5, y: viewHeight * 0.5 };
}
