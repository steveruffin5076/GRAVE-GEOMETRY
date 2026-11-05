import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance.ts';
import { worldToScreen } from '../src/core/math/iso.ts';
import { normalize, vec2 } from '../src/core/math/vec2.ts';
import { sweepFirstObstacle } from '../src/game/bullets.ts';
import type { Obstacle } from '../src/game/map.ts';
import { createRunState } from '../src/game/state.ts';
import { emptyIntent } from '../src/input/intent.ts';
import { simulationStep } from '../src/game/simulation.ts';
import {
  fireIntervalSeconds,
  getWeaponDef,
  updateWeapon,
} from '../src/game/weapons.ts';

describe('weapons & bullets', () => {
  it('reload timing matches balance config', () => {
    const wall: Obstacle = {
      id: 1,
      x: 500,
      y: 500,
      halfW: 20,
      halfH: 20,
      blocksMovement: true,
      blocksBullets: true,
      tall: true,
    };
    const state = createRunState({
      spawn: vec2(100, 500),
      obstacles: [wall],
      mapWidth: 64,
      mapHeight: 64,
    });
    state.weapon.ammoInMag = 0;
    updateWeapon(state, false, true, 0);
    expect(state.weapon.reloadTimer).toBeCloseTo(BALANCE.weapons.pistol.reloadTime);
    let t = 0;
    while (state.weapon.reloadTimer > 0 && t < 3) {
      updateWeapon(state, false, false, 1 / 60);
      t += 1 / 60;
    }
    expect(state.weapon.reloadTimer).toBe(0);
    expect(state.weapon.ammoInMag).toBe(BALANCE.weapons.pistol.magSize);
  });

  it('fire interval matches balance fire rate', () => {
    const def = getWeaponDef('pistol');
    expect(fireIntervalSeconds(def)).toBeCloseTo(1 / BALANCE.weapons.pistol.fireRate);
  });

  it('bullet grid motion matches iso screen direction', () => {
    const aim = normalize(vec2(1, 0));
    const px = 400;
    const py = 400;
    const s0 = worldToScreen(px, py);
    const s1 = worldToScreen(px + aim.x * 32, py + aim.y * 32);
    const screenDir = normalize(vec2(s1.x - s0.x, s1.y - s0.y));
    const bulletVel = 240;
    const dt = 1 / 60;
    const bs0 = worldToScreen(px, py);
    const bs1 = worldToScreen(px + aim.x * bulletVel * dt, py + aim.y * bulletVel * dt);
    const travelScreen = normalize(vec2(bs1.x - bs0.x, bs1.y - bs0.y));
    expect(travelScreen.x).toBeCloseTo(screenDir.x, 2);
    expect(travelScreen.y).toBeCloseTo(screenDir.y, 2);
  });

  it('segment sweep detects wall at 240 units/s without tunnelling', () => {
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
    const speed = 240;
    const dir = normalize(vec2(1, 0));
    let x = 80;
    let y = 200;
    let hit = false;
    for (let i = 0; i < 120; i++) {
      const block = sweepFirstObstacle(x, y, dir.x * speed, dir.y * speed, 1 / 60, obstacles);
      if (block !== null) {
        hit = true;
        break;
      }
      x += dir.x * speed * (1 / 60);
      y += dir.y * speed * (1 / 60);
    }
    expect(hit).toBe(true);
    expect(x).toBeLessThanOrEqual(wall.x - wall.halfW + 4);
  });

  it('simulation fires with manual intent', () => {
    const state = createRunState({
      spawn: vec2(200, 200),
      obstacles: [],
      mapWidth: 64,
      mapHeight: 64,
    });
    const intent = emptyIntent();
    intent.fire = true;
    intent.aim = vec2(1, 0);
    const startAmmo = state.weapon.ammoInMag;
    simulationStep(state, intent, 1 / 60);
    expect(state.weapon.ammoInMag).toBe(startAmmo - 1);
    expect(state.bullets.length).toBe(1);
  });
});
