import { depthOf } from '../core/math/iso.ts';

export interface DepthSortable {
  id: number;
  x: number;
  y: number;
}

export function depthKey(x: number, y: number): number {
  return depthOf(x, y);
}

export function sortByDepth<T extends DepthSortable>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const da = depthKey(a.x, a.y);
    const db = depthKey(b.x, b.y);
    if (da !== db) return da - db;
    return a.id - b.id;
  });
}
