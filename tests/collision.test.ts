import { describe, expect, it } from 'vitest';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { slideMove } from '../src/game/collision.ts';
import { vec2 } from '../src/core/math/vec2.ts';
import { TILE_W } from '../src/config/constants.ts';
import type { Obstacle } from '../src/game/map.ts';

describe('collision', () => {
  it('blocks movement into a wall obstacle', () => {
    const wall: Obstacle = {
      id: 1,
      x: 200,
      y: 200,
      halfW: 28,
      halfH: 28,
      blocksMovement: true,
      blocksBullets: true,
      tall: true,
    };
    const obstacles = [wall];
    const startX = 120;
    const startY = 200;
    const next = slideMove(startX, startY, 8, vec2(200, 0), obstacles, 64, 64);
    expect(next.x).toBeGreaterThan(startX);
    expect(next.x).toBeLessThanOrEqual(wall.x - wall.halfW - 8);
  });

  it('keeps player inside map bounds', () => {
    const parsed = parseMap();
    const state = createRunState({
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    const next = slideMove(4, 4, 8, vec2(-100, -100), parsed.obstacles, 64, 64);
    expect(next.x).toBeGreaterThanOrEqual(8);
    expect(next.y).toBeGreaterThanOrEqual(8);
    const far = slideMove(state.player.x, state.player.y, 8, vec2(9999, 0), parsed.obstacles, 64, 64);
    expect(far.x).toBeLessThanOrEqual(64 * TILE_W - 8);
  });
});
