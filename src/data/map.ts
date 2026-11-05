import { MAP_H, MAP_W, TILE_W } from '../config/constants.ts';

export { MAP_W as MAP_WIDTH, MAP_H as MAP_HEIGHT };

/** ASCII legend — PLAN.md §6.3 */
export const MAP_LEGEND = {
  '.': 'asphalt',
  c: 'concrete',
  g: 'grass',
  '#': 'wall',
  b: 'barricade',
  C: 'car',
  T: 'container',
  p: 'puddle',
  l: 'light',
  P: 'playerSpawn',
} as const;

/**
 * Hand-authored layout: deterministic procedural fill with fixed features.
 * One map only; identical every run.
 */
function buildAsciiRows(): string[] {
  const rows: string[][] = Array.from({ length: MAP_H }, () =>
    Array.from({ length: MAP_W }, () => '.'),
  );

  const set = (x: number, y: number, ch: string): void => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    const row = rows[y];
    if (row !== undefined) row[x] = ch;
  };

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) {
        set(x, y, '#');
      }
    }
  }

  const tower = (x: number, y: number): void => {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        set(x + dx, y + dy, '#');
      }
    }
  };
  tower(0, 0);
  tower(MAP_W - 2, 0);
  tower(0, MAP_H - 2);
  tower(MAP_W - 2, MAP_H - 2);

  const cx = Math.floor(MAP_W / 2);
  const cy = Math.floor(MAP_H / 2);
  set(cx, cy, 'P');

  const clearHalf = 6;
  for (let y = cy - clearHalf; y < cy - clearHalf + 12; y++) {
    for (let x = cx - clearHalf; x < cx - clearHalf + 12; x++) {
      if (rows[y]?.[x] === '.') set(x, y, 'c');
    }
  }
  set(cx, cy, 'P');

  const lane = (x0: number, y0: number, x1: number, y1: number): void => {
    let x = x0;
    let y = y0;
    while (x !== x1 || y !== y1) {
      if (rows[y]?.[x] !== '#') set(x, y, 'c');
      if (x < x1) x++;
      else if (x > x1) x--;
      else if (y < y1) y++;
      else if (y > y1) y--;
    }
    if (rows[y]?.[x] !== '#') set(x, y, 'c');
  };
  lane(1, cy, cx - clearHalf - 1, cy);
  lane(MAP_W - 2, cy, cx + clearHalf + 12, cy);
  lane(cx, 1, cx, cy - clearHalf - 1);
  lane(cx, MAP_H - 2, cx, cy + clearHalf + 12);

  const barricadeSpots: [number, number][] = [
    [10, 20],
    [14, 28],
    [18, 36],
    [22, 44],
    [44, 20],
    [48, 28],
    [52, 36],
    [40, 44],
    [24, 14],
    [38, 50],
    [30, 22],
    [34, 42],
    [26, 50],
    [42, 14],
  ];
  for (const [x, y] of barricadeSpots) {
    if (rows[y]?.[x] === 'c' || rows[y]?.[x] === '.') set(x, y, 'b');
  }

  const containers: [number, number][] = [
    [8, 10],
    [50, 12],
    [10, 50],
    [48, 48],
    [20, 8],
    [46, 40],
    [12, 38],
  ];
  for (const [x, y] of containers) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        if (rows[y + dy]?.[x + dx] !== '#') set(x + dx, y + dy, 'T');
      }
    }
  }

  const cars: [number, number][] = [
    [16, 16],
    [45, 18],
    [18, 46],
    [42, 44],
  ];
  for (const [x, y] of cars) {
    set(x, y, 'C');
    if (rows[y]?.[x + 1] !== '#') set(x + 1, y, 'C');
  }

  const puddles: [number, number][] = [
    [28, 18],
    [36, 26],
    [30, 40],
    [34, 34],
  ];
  for (const [x, y] of puddles) {
    if (rows[y]?.[x] === 'c' || rows[y]?.[x] === '.') set(x, y, 'p');
  }

  const lights: [number, number][] = [
    [6, 6],
    [MAP_W - 7, 6],
    [6, MAP_H - 7],
    [MAP_W - 7, MAP_H - 7],
  ];
  for (const [x, y] of lights) {
    if (rows[y]?.[x] !== '#') set(x, y, 'l');
  }

  for (let y = 8; y < MAP_H - 8; y += 9) {
    for (let x = 8; x < MAP_W - 8; x += 11) {
      const cell = rows[y]?.[x];
      if (cell === '.' || cell === 'c') set(x, y, 'g');
    }
  }

  return rows.map((r) => r.join(''));
}

export const MAP_ASCII: readonly string[] = buildAsciiRows();

export function tileWorldOrigin(tx: number, ty: number): { x: number; y: number } {
  return { x: tx * TILE_W, y: ty * TILE_W };
}
