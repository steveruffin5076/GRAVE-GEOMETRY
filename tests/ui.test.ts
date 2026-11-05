import { describe, expect, it } from 'vitest';
import { detectLayoutMode } from '../src/ui/layout.ts';
import { createRunState } from '../src/game/state.ts';
import { parseMap } from '../src/game/map.ts';
import { MAP_H, MAP_W } from '../src/config/constants.ts';
import { simulationStep } from '../src/game/simulation.ts';
import { emptyIntent } from '../src/input/intent.ts';
import {
  loadCorruptBestSafe,
  loadPersonalBest,
  loadSettings,
} from '../src/persistence/storage.ts';

describe('ui and persistence', () => {
  it('resolves responsive breakpoints for portrait and desktop', () => {
    expect(detectLayoutMode(390, 844)).toBe('portrait');
    expect(detectLayoutMode(1920, 1080)).toBe('landscape');
    expect(detectLayoutMode(1200, 900)).toBe('compact');
  });

  it('does not advance time while paused', () => {
    const parsed = parseMap();
    const state = createRunState({
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: MAP_W,
      mapHeight: MAP_H,
    });
    state.phase = 'PAUSED';
    const t0 = state.time;
    simulationStep(state, emptyIntent(), 1);
    expect(state.time).toBe(t0);
  });

  it('never throws on corrupt persisted JSON', () => {
    expect(() => loadSettings('manual')).not.toThrow();
    expect(() => loadCorruptBestSafe()).not.toThrow();
    expect(loadPersonalBest().score).toBe(0);
  });
});
