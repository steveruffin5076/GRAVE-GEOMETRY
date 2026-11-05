import { describe, expect, it } from 'vitest';
import { MAP_ASCII } from '../src/data/map.ts';
import { MAP_H, MAP_W, TILE_H, TILE_RISER, TILE_W } from '../src/config/constants.ts';
import {
  ISO_TILE_RISER_PX,
  isPerimeterSealed,
  parseMap,
  playerSpawnClear,
} from '../src/game/map.ts';

describe('map', () => {
  it('has exactly one 64×64 layout', () => {
    expect(MAP_ASCII.length).toBe(MAP_H);
    for (const row of MAP_ASCII) {
      expect(row.length).toBe(MAP_W);
    }
  });

  it('seals the perimeter with walls', () => {
    expect(isPerimeterSealed()).toBe(true);
  });

  it('places player spawn away from obstacles', () => {
    const parsed = parseMap();
    expect(playerSpawnClear(parsed)).toBe(true);
    expect(parsed.grid.cells.some((c) => c.char === 'P')).toBe(true);
  });

  it('uses locked iso tile dimensions in config', () => {
    expect(TILE_W).toBe(64);
    expect(TILE_H).toBe(32);
    expect(TILE_RISER).toBe(ISO_TILE_RISER_PX);
    expect(TILE_RISER).toBe(8);
  });

  it('includes four light pool markers', () => {
    const parsed = parseMap();
    expect(parsed.lightTiles.length).toBe(4);
  });

  it('includes barricades and tall props', () => {
    const parsed = parseMap();
    const barricades = parsed.grid.cells.filter((c) => c.char === 'b').length;
    const tall = parsed.obstacles.filter((o) => o.tall).length;
    expect(barricades).toBeGreaterThanOrEqual(10);
    expect(tall).toBeGreaterThanOrEqual(6);
  });
});
