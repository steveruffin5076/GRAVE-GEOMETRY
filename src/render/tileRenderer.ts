import Phaser from 'phaser';
import { LAYER, TILE_W } from '../config/constants.ts';
import { worldToScreen } from '../core/math/iso.ts';
import { tileWorldOrigin } from '../data/map.ts';
import type { ParsedMap, TileCell } from '../game/map.ts';
import {
  drawBarricadeTile,
  drawCarTile,
  drawContainerTile,
  drawFloorTile,
  drawLightPool,
  drawWallTile,
} from './placeholderArt.ts';

const CHUNK_TILES = 8;

function drawCell(g: Phaser.GameObjects.Graphics, cell: TileCell): void {
  const origin = tileWorldOrigin(cell.tx, cell.ty);
  const centerWorld = { x: origin.x + TILE_W / 2, y: origin.y + TILE_W / 2 };
  const s = worldToScreen(centerWorld.x, centerWorld.y);
  const cx = Math.round(s.x);
  const cy = Math.round(s.y);

  switch (cell.kind.type) {
    case 'floor':
      drawFloorTile(g, cx, cy, cell.kind.floor);
      break;
    case 'wall':
      drawWallTile(g, cx, cy);
      break;
    case 'barricade':
      drawBarricadeTile(g, cx, cy);
      break;
    case 'car':
      drawCarTile(g, cx, cy);
      break;
    case 'container':
      drawContainerTile(g, cx, cy);
      break;
    case 'light':
      drawLightPool(g, cx, cy);
      break;
    case 'playerSpawn':
      drawFloorTile(g, cx, cy, 'concrete');
      break;
    default:
      break;
  }
}

export interface MapRenderResult {
  layer: Phaser.GameObjects.Container;
  worldWidth: number;
  worldHeight: number;
}

export function renderMapToScene(scene: Phaser.Scene, parsed: ParsedMap): MapRenderResult {
  const container = scene.add.container(0, 0);
  container.setDepth(LAYER.GROUND);

  const byChunk = new Map<string, TileCell[]>();
  for (const cell of parsed.grid.cells) {
    const chunkX = Math.floor(cell.tx / CHUNK_TILES);
    const chunkY = Math.floor(cell.ty / CHUNK_TILES);
    const key = `${chunkX},${chunkY}`;
    const list = byChunk.get(key);
    if (list === undefined) byChunk.set(key, [cell]);
    else list.push(cell);
  }

  const sortedChunks = [...byChunk.entries()].sort(([a], [b]) => {
    const aParts = a.split(',').map(Number);
    const bParts = b.split(',').map(Number);
    const ax = aParts[0] ?? 0;
    const ay = aParts[1] ?? 0;
    const bx = bParts[0] ?? 0;
    const by = bParts[1] ?? 0;
    return ax + ay - (bx + by);
  });

  for (const [, cells] of sortedChunks) {
    cells.sort((a, b) => a.tx + a.ty - (b.tx + b.ty));
    const g = scene.add.graphics();
    for (const cell of cells) {
      drawCell(g, cell);
    }
    container.add(g);
  }

  const worldWidth = parsed.grid.width * TILE_W;
  const worldHeight = parsed.grid.height * TILE_W;
  return { layer: container, worldWidth, worldHeight };
}
