import Phaser from 'phaser';
import { PALETTE } from '../config/palette.ts';
import { STEP_RISER, TILE_H, TILE_RISER, TILE_W } from '../config/constants.ts';
import type { FloorKind } from '../game/map.ts';

const FLOOR_COLOUR: Record<FloorKind, string> = {
  asphalt: PALETTE.asphalt1,
  concrete: PALETTE.concrete1,
  grass: PALETTE.grime1,
  puddle: PALETTE.grime0,
};

export function drawDiamondTop(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  fill: string,
): void {
  g.fillStyle(Number(`0x${fill.slice(1)}`), 1);
  g.beginPath();
  g.moveTo(cx, cy - TILE_H / 2);
  g.lineTo(cx + TILE_W / 2, cy);
  g.lineTo(cx, cy + TILE_H / 2);
  g.lineTo(cx - TILE_W / 2, cy);
  g.closePath();
  g.fillPath();
  g.lineStyle(1, Number(`0x${PALETTE.ink0.slice(1)}`), 1);
  g.strokePath();
}

export function drawRiserFaces(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  leftColour: string,
  rightColour: string,
  riserH = TILE_RISER,
): void {
  const bottom = cy + TILE_H / 2;
  g.fillStyle(Number(`0x${leftColour.slice(1)}`), 1);
  g.beginPath();
  g.moveTo(cx - TILE_W / 2, cy);
  g.lineTo(cx, bottom);
  g.lineTo(cx, bottom + riserH);
  g.lineTo(cx - TILE_W / 2, cy + riserH);
  g.closePath();
  g.fillPath();

  g.fillStyle(Number(`0x${rightColour.slice(1)}`), 1);
  g.beginPath();
  g.moveTo(cx + TILE_W / 2, cy);
  g.lineTo(cx, bottom);
  g.lineTo(cx, bottom + riserH);
  g.lineTo(cx + TILE_W / 2, cy + riserH);
  g.closePath();
  g.fillPath();
}

export function drawFloorTile(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  floor: FloorKind,
): void {
  const base = FLOOR_COLOUR[floor];
  drawDiamondTop(g, cx, cy, base);
  if (floor === 'grass' || floor === 'puddle') {
    drawRiserFaces(g, cx, cy, PALETTE.grime0, PALETTE.grime1, STEP_RISER);
  } else if (floor === 'concrete') {
    drawRiserFaces(g, cx, cy, PALETTE.concrete0, PALETTE.concrete1, STEP_RISER);
  } else {
    drawRiserFaces(g, cx, cy, PALETTE.asphalt0, PALETTE.asphalt1, STEP_RISER);
  }
}

export function drawWallTile(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  drawDiamondTop(g, cx, cy, PALETTE.concrete2);
  drawRiserFaces(g, cx, cy, PALETTE.concrete0, PALETTE.concrete1, TILE_RISER);
  const capY = cy + TILE_H / 2 + TILE_RISER;
  g.fillStyle(Number(`0x${PALETTE.concrete2.slice(1)}`), 1);
  g.fillRect(Math.round(cx - TILE_W / 2), Math.round(capY - 4), TILE_W, 4);
}

export function drawBarricadeTile(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  drawFloorTile(g, cx, cy, 'concrete');
  drawRiserFaces(g, cx, cy, PALETTE.hazard0, PALETTE.hazard1, TILE_RISER);
  g.fillStyle(Number(`0x${PALETTE.hazard1.slice(1)}`), 1);
  g.fillRect(Math.round(cx - 12), Math.round(cy - 6), 24, 8);
}

export function drawContainerTile(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  drawFloorTile(g, cx, cy, 'asphalt');
  drawRiserFaces(g, cx, cy, PALETTE.rust0, PALETTE.rust1, TILE_RISER);
  g.fillStyle(Number(`0x${PALETTE.rust2.slice(1)}`), 1);
  g.fillRect(Math.round(cx - 14), Math.round(cy - 10), 28, 16);
}

export function drawCarTile(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  drawFloorTile(g, cx, cy, 'asphalt');
  drawRiserFaces(g, cx, cy, PALETTE.rust0, PALETTE.rust1, TILE_RISER);
  g.fillStyle(Number(`0x${PALETTE.rust1.slice(1)}`), 1);
  g.fillRect(Math.round(cx - 18), Math.round(cy - 8), 36, 12);
}

export function drawLightPool(g: Phaser.GameObjects.Graphics, cx: number, cy: number): void {
  drawFloorTile(g, cx, cy, 'concrete');
  g.fillStyle(Number(`0x${PALETTE.hazard1.slice(1)}`), 0.2);
  drawDiamondTop(g, cx, cy, PALETTE.hazard1);
}

export const TILE_DRAW_HEIGHT = TILE_H + TILE_RISER;
