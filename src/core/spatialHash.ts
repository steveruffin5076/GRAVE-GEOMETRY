import { HASH_CELL } from '../config/constants.ts';

export interface SpatialEntity {
  id: number;
  x: number;
  y: number;
}

function cellKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

function worldToCell(x: number, y: number, cellSize: number): { cx: number; cy: number } {
  return {
    cx: Math.floor(x / cellSize),
    cy: Math.floor(y / cellSize),
  };
}

export interface SpatialHash<T extends SpatialEntity> {
  clear: () => void;
  insert: (item: T) => void;
  rebuild: (items: readonly T[]) => void;
  queryRadius: (x: number, y: number, radius: number) => T[];
  queryCell: (cx: number, cy: number) => readonly T[];
}

export function createSpatialHash<T extends SpatialEntity>(
  cellSize = HASH_CELL,
): SpatialHash<T> {
  const cells = new Map<string, T[]>();

  function bucket(cx: number, cy: number): T[] {
    const key = cellKey(cx, cy);
    let list = cells.get(key);
    if (list === undefined) {
      list = [];
      cells.set(key, list);
    }
    return list;
  }

  return {
    clear(): void {
      cells.clear();
    },
    insert(item: T): void {
      const { cx, cy } = worldToCell(item.x, item.y, cellSize);
      bucket(cx, cy).push(item);
    },
    rebuild(items: readonly T[]): void {
      cells.clear();
      for (const item of items) {
        this.insert(item);
      }
    },
    queryRadius(x: number, y: number, radius: number): T[] {
      const r2 = radius * radius;
      const { cx: cx0, cy: cy0 } = worldToCell(x - radius, y - radius, cellSize);
      const { cx: cx1, cy: cy1 } = worldToCell(x + radius, y + radius, cellSize);
      const out: T[] = [];
      for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
          const list = cells.get(cellKey(cx, cy));
          if (list === undefined) continue;
          for (const item of list) {
            const dx = item.x - x;
            const dy = item.y - y;
            if (dx * dx + dy * dy <= r2) out.push(item);
          }
        }
      }
      return out;
    },
    queryCell(cx: number, cy: number): readonly T[] {
      return cells.get(cellKey(cx, cy)) ?? [];
    },
  };
}

/** Cells touched by a line segment (grid-space), for bullet sweeps. */
export function cellsAlongSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellSize: number,
): { cx: number; cy: number }[] {
  const { cx: cx0, cy: cy0 } = worldToCell(x0, y0, cellSize);
  const { cx: cx1, cy: cy1 } = worldToCell(x1, y1, cellSize);
  const seen = new Set<string>();
  const out: { cx: number; cy: number }[] = [];

  const dx = Math.abs(cx1 - cx0);
  const dy = Math.abs(cy1 - cy0);
  const sx = cx0 < cx1 ? 1 : -1;
  const sy = cy0 < cy1 ? 1 : -1;
  let err = dx - dy;
  let cx = cx0;
  let cy = cy0;

  for (;;) {
    const key = cellKey(cx, cy);
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ cx, cy });
    }
    if (cx === cx1 && cy === cy1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
  return out;
}
