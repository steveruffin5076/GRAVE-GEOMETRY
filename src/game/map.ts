import { MAP_ASCII, MAP_HEIGHT, MAP_WIDTH, tileWorldOrigin } from '../data/map.ts';
import { MAP_H, MAP_W, TILE_RISER, TILE_W } from '../config/constants.ts';
import type { Vec2 } from '../core/math/vec2.ts';
import { vec2 } from '../core/math/vec2.ts';

export type FloorKind = 'asphalt' | 'concrete' | 'grass' | 'puddle';

export type TileKind =
  | { type: 'floor'; floor: FloorKind }
  | { type: 'wall' }
  | { type: 'barricade' }
  | { type: 'car'; part: 'body' }
  | { type: 'container'; part: 'fill' }
  | { type: 'light' }
  | { type: 'playerSpawn' };

export interface TileCell {
  tx: number;
  ty: number;
  kind: TileKind;
  char: string;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  halfW: number;
  halfH: number;
  blocksMovement: boolean;
  blocksBullets: boolean;
  tall: boolean;
}

export interface TileGrid {
  width: number;
  height: number;
  cells: TileCell[];
}

export interface ParsedMap {
  grid: TileGrid;
  obstacles: Obstacle[];
  playerSpawn: Vec2;
  lightTiles: Vec2[];
}

function parseChar(_tx: number, _ty: number, ch: string): TileKind {
  switch (ch) {
    case '.':
      return { type: 'floor', floor: 'asphalt' };
    case 'c':
      return { type: 'floor', floor: 'concrete' };
    case 'g':
      return { type: 'floor', floor: 'grass' };
    case 'p':
      return { type: 'floor', floor: 'puddle' };
    case '#':
      return { type: 'wall' };
    case 'b':
      return { type: 'barricade' };
    case 'C':
      return { type: 'car', part: 'body' };
    case 'T':
      return { type: 'container', part: 'fill' };
    case 'l':
      return { type: 'light' };
    case 'P':
      return { type: 'playerSpawn' };
    default:
      return { type: 'floor', floor: 'asphalt' };
  }
}

function tileCenter(tx: number, ty: number): Vec2 {
  const o = tileWorldOrigin(tx, ty);
  return vec2(o.x + TILE_W / 2, o.y + TILE_W / 2);
}

let nextObstacleId = 1;

function addObstacle(
  list: Obstacle[],
  tx: number,
  ty: number,
  half: number,
  opts: Pick<Obstacle, 'blocksMovement' | 'blocksBullets' | 'tall'>,
): void {
  const c = tileCenter(tx, ty);
  list.push({
    id: nextObstacleId++,
    x: c.x,
    y: c.y,
    halfW: half,
    halfH: half,
    ...opts,
  });
}

export function parseMap(rows: readonly string[] = MAP_ASCII): ParsedMap {
  nextObstacleId = 1;
  if (rows.length !== MAP_H) {
    throw new Error(`map height expected ${MAP_H}, got ${rows.length}`);
  }
  const cells: TileCell[] = [];
  const obstacles: Obstacle[] = [];
  const lightTiles: Vec2[] = [];
  let playerSpawn = vec2((MAP_W / 2) * TILE_W, (MAP_H / 2) * TILE_W);

  const seenCar = new Set<string>();
  const seenContainer = new Set<string>();

  for (let ty = 0; ty < rows.length; ty++) {
    const row = rows[ty] ?? '';
    if (row.length !== MAP_W) {
      throw new Error(`map row ${ty} width expected ${MAP_W}, got ${row.length}`);
    }
    for (let tx = 0; tx < MAP_W; tx++) {
      const ch = row[tx] ?? '.';
      const kind = parseChar(tx, ty, ch);
      cells.push({ tx, ty, kind, char: ch });

      if (ch === 'P') {
        playerSpawn = tileCenter(tx, ty);
      }
      if (ch === 'l') {
        lightTiles.push(tileCenter(tx, ty));
      }
      if (ch === '#') {
        addObstacle(obstacles, tx, ty, TILE_W / 2 - 2, {
          blocksMovement: true,
          blocksBullets: true,
          tall: true,
        });
      }
      if (ch === 'b') {
        addObstacle(obstacles, tx, ty, TILE_W / 2 - 4, {
          blocksMovement: true,
          blocksBullets: false,
          tall: false,
        });
      }
      if (ch === 'T') {
        const key = `${tx - (tx % 2)},${ty - (ty % 2)}`;
        if (!seenContainer.has(key)) {
          seenContainer.add(key);
          const c = tileCenter(tx + 0.5, ty + 0.5);
          obstacles.push({
            id: nextObstacleId++,
            x: c.x,
            y: c.y,
            halfW: TILE_W - 4,
            halfH: TILE_W - 4,
            blocksMovement: true,
            blocksBullets: true,
            tall: true,
          });
        }
      }
      if (ch === 'C') {
        const key = `${tx - (tx % 2)},${ty}`;
        if (!seenCar.has(key)) {
          seenCar.add(key);
          obstacles.push({
            id: nextObstacleId++,
            x: tileCenter(tx, ty).x + TILE_W / 2,
            y: tileCenter(tx, ty).y,
            halfW: TILE_W - 2,
            halfH: TILE_W / 2 - 4,
            blocksMovement: true,
            blocksBullets: true,
            tall: true,
          });
        }
      }
    }
  }

  return {
    grid: { width: MAP_WIDTH, height: MAP_HEIGHT, cells },
    obstacles,
    playerSpawn,
    lightTiles,
  };
}

export function isPerimeterSealed(rows: readonly string[] = MAP_ASCII): boolean {
  for (let x = 0; x < MAP_W; x++) {
    if ((rows[0]?.[x] ?? '') !== '#') return false;
    if ((rows[MAP_H - 1]?.[x] ?? '') !== '#') return false;
  }
  for (let y = 0; y < MAP_H; y++) {
    if ((rows[y]?.[0] ?? '') !== '#') return false;
    if ((rows[y]?.[MAP_W - 1] ?? '') !== '#') return false;
  }
  return true;
}

export function playerSpawnClear(parsed: ParsedMap): boolean {
  const { x, y } = parsed.playerSpawn;
  for (const o of parsed.obstacles) {
    const dx = Math.abs(o.x - x);
    const dy = Math.abs(o.y - y);
    if (dx < o.halfW + TILE_W / 2 && dy < o.halfH + TILE_W / 2) {
      return false;
    }
  }
  return true;
}

export const ISO_TILE_RISER_PX = TILE_RISER;
