import { describe, expect, it } from 'vitest';
import { applyDamagePipeline, computeDamageStages } from '../src/game/damage.ts';
import { parseMap } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { recomputeStats } from '../src/game/stats.ts';
import type { Zombie } from '../src/game/zombieEntity.ts';

function fakeZombie(): Zombie {
  return {
    active: true,
    id: 1,
    variant: 'walker',
    x: 0,
    y: 0,
    hp: 40,
    maxHp: 40,
    speed: 1,
    radius: 10,
    contactDamage: 1,
    xpValue: 1,
    state: 'SEEK',
    stateTimer: 0,
    burnStacks: 0,
    burnTimer: 0,
    slowTimer: 0,
    freezeTimer: 0,
    stunTimer: 0,
    telegraphShape: null,
    telegraphTimer: 0,
    abilityCooldown: 0,
    attackDirX: 0,
    attackDirY: 0,
    spawnling: false,
    isElite: false,
    eliteAffix: null,
    shieldRemaining: 0,
    volatileOnDeath: false,
    isTitan: false,
    damageReduction: 0,
    knockbackResist: 0,
    wobbleT: 0,
    knockVelX: 0,
    knockVelY: 0,
    boomerChainDepth: 0,
  };
}

describe('damage', () => {
  it('returns base pistol damage through pipeline stub', () => {
    const parsed = parseMap();
    const state = createRunState({
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    expect(applyDamagePipeline(state, 18)).toBeGreaterThan(0);
  });

  it('applies ammo before skill multipliers in stage order', () => {
    const parsed = parseMap();
    const state = createRunState({
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    state.activeAmmo = 'hollow';
    state.ranks.skill_bloodlust = 3;
    state.waveKills = 50;
    state.stats = recomputeStats(state);
    const z = fakeZombie();
    const stages = computeDamageStages(state, 100, z);
    expect(stages.afterAmmo).toBeGreaterThan(stages.base);
    expect(stages.afterSkills).toBeGreaterThanOrEqual(stages.afterAttachments);
  });

  it('crit chance stays clamped', () => {
    const parsed = parseMap();
    const state = createRunState({
      spawn: parsed.playerSpawn,
      obstacles: parsed.obstacles,
      mapWidth: 64,
      mapHeight: 64,
    });
    state.ranks.attach_reddot = 10;
    state.stats = recomputeStats(state);
    expect(state.stats.critChance).toBeLessThanOrEqual(0.75);
  });
});
