import { describe, expect, it } from 'vitest';
import { HASH_CELL } from '../src/config/constants.ts';
import { createSpatialHash, type SpatialEntity } from '../src/core/spatialHash.ts';

interface E extends SpatialEntity {
  tag: string;
}

describe('spatialHash', () => {
  it('finds entities within radius', () => {
    const hash = createSpatialHash<E>(HASH_CELL);
    const entities: E[] = [
      { id: 1, x: 0, y: 0, tag: 'a' },
      { id: 2, x: 50, y: 0, tag: 'b' },
      { id: 3, x: 200, y: 0, tag: 'c' },
    ];
    hash.rebuild(entities);
    const near = hash.queryRadius(0, 0, 60);
    expect(near.map((e) => e.id).sort()).toEqual([1, 2]);
  });
});
