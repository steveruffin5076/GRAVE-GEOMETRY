import { BALANCE } from '../../config/balance.ts';
import { TILE_W } from '../../config/constants.ts';
import { len, normalize, scale, sub, vec2 } from '../../core/math/vec2.ts';
import type { Vec2 } from '../../core/math/vec2.ts';
import { isBlockedAt, slideMove } from '../collision.ts';
import type { RunState } from '../state.ts';
import { recordDamageTaken } from '../runStats.ts';
import type { Zombie } from '../zombieEntity.ts';
import { spawnZombie } from './spawnZombie.ts';
import { telegraphDurationSeconds } from './types.ts';

import type { TelegraphShape } from '../zombieEntity.ts';

function pushTelegraph(state: RunState, z: Zombie, shape: TelegraphShape, duration: number): void {
  z.telegraphShape = shape;
  z.telegraphTimer = duration;
  state.presentation.push({
    type: 'telegraph',
    variant: z.variant,
    shape,
    duration,
    x: z.x,
    y: z.y,
  });
}

function seekToward(
  z: Zombie,
  target: Vec2,
  dt: number,
  state: RunState,
  speedMult: number,
  steerJitter = 0,
): void {
  const toTarget = sub(target, vec2(z.x, z.y));
  let dir = len(toTarget) > 0.01 ? normalize(toTarget) : vec2(1, 0);
  if (steerJitter !== 0) {
    const a = Math.atan2(dir.y, dir.x) + steerJitter;
    dir = vec2(Math.cos(a), Math.sin(a));
  }
  const delta = scale(dir, z.speed * speedMult * dt);
  const next = slideMove(z.x, z.y, z.radius, delta, state.obstacles, state.mapWidth, state.mapHeight);
  z.x = next.x;
  z.y = next.y;
}

function distPlayer(z: Zombie, state: RunState): number {
  return Math.hypot(state.player.x - z.x, state.player.y - z.y);
}

export function updateVariantBehavior(state: RunState, z: Zombie, dt: number, speedMult: number): void {
  const player = state.player;
  let target = vec2(player.x, player.y);
  if (state.decoy !== null && distPlayer(z, state) < state.decoy.radius) {
    target = vec2(state.decoy.x, state.decoy.y);
  }

  if (z.state === 'STUNNED') {
    z.stateTimer -= dt;
    if (z.stateTimer <= 0) z.state = 'SEEK';
    return;
  }

  if (z.state === 'TELEGRAPH') {
    z.telegraphTimer -= dt;
    z.stateTimer -= dt;
    if (z.stateTimer <= 0) {
      z.state = 'ATTACK';
      z.stateTimer = attackDuration(z);
    }
    return;
  }

  if (z.state === 'ATTACK') {
    runAttack(state, z, dt, target);
    z.stateTimer -= dt;
    if (z.stateTimer <= 0) {
      z.state = 'SEEK';
      z.abilityCooldown = abilityInterval(z);
    }
    return;
  }

  z.abilityCooldown = Math.max(0, z.abilityCooldown - dt);

  switch (z.variant) {
    case 'walker':
      z.wobbleT += dt * 6;
      seekToward(z, target, dt, state, speedMult, Math.sin(z.wobbleT) * 0.08);
      break;
    case 'runner':
      seekToward(z, target, dt, state, speedMult, ((state.time * 17 + z.id) % 2 ? 1 : -1) * 0.26);
      break;
    case 'spitter': {
      const d = distPlayer(z, state);
      if (d < BALANCE.zombies.spitterMinRange) {
        const away = normalize(sub(vec2(z.x, z.y), target));
        seekToward(z, vec2(z.x + away.x * 80, z.y + away.y * 80), dt, state, speedMult);
      } else if (d > BALANCE.zombies.spitterMaxRange) {
        seekToward(z, target, dt, state, speedMult);
      } else if (z.abilityCooldown <= 0) {
        beginTelegraph(state, z, 'spit', 'sac');
      }
      break;
    }
    case 'jumper':
      seekToward(z, target, dt, state, speedMult);
      if (z.abilityCooldown <= 0) beginTelegraph(state, z, 'leap', 'diamond');
      break;
    case 'charger':
      seekToward(z, target, dt, state, speedMult);
      if (z.abilityCooldown <= 0 && distPlayer(z, state) < 220) {
        beginTelegraph(state, z, 'dash', 'arrow');
        const dir = normalize(sub(target, vec2(z.x, z.y)));
        z.attackDirX = dir.x;
        z.attackDirY = dir.y;
      }
      break;
    case 'boomer':
      seekToward(z, target, dt, state, speedMult);
      if (distPlayer(z, state) <= BALANCE.zombies.boomerArmRange && z.abilityCooldown <= 0) {
        beginTelegraph(state, z, 'explode', 'pulse');
      }
      break;
    case 'tank':
      seekToward(z, target, dt, state, speedMult * 0.85);
      if (z.abilityCooldown <= 0) beginTelegraph(state, z, 'slam', 'ring');
      break;
    default:
      seekToward(z, target, dt, state, speedMult);
  }
}

function abilityInterval(z: Zombie): number {
  if (z.variant === 'jumper') return BALANCE.zombies.jumperLeapInterval;
  if (z.variant === 'tank') return BALANCE.zombies.tankSlamInterval;
  return 2.5;
}

function attackDuration(z: Zombie): number {
  if (z.variant === 'charger') return BALANCE.zombies.chargerDashDuration;
  if (z.variant === 'jumper') return 0.25;
  if (z.variant === 'boomer') return 0.05;
  if (z.variant === 'spitter') return 0.1;
  if (z.variant === 'tank') return 0.15;
  return 0.2;
}

function beginTelegraph(state: RunState, z: Zombie, kind: string, shape: TelegraphShape): void {
  const dur = telegraphDurationSeconds(z.variant, kind);
  z.state = 'TELEGRAPH';
  z.stateTimer = dur;
  pushTelegraph(state, z, shape, dur);
}

function runAttack(state: RunState, z: Zombie, dt: number, target: Vec2): void {
  if (z.variant === 'charger') {
    const delta = scale(vec2(z.attackDirX, z.attackDirY), BALANCE.zombies.chargerDashSpeed * dt);
    const nx = z.x + delta.x;
    const ny = z.y + delta.y;
    if (isBlockedAt(nx, ny, z.radius, state.obstacles)) {
      z.state = 'STUNNED';
      z.stateTimer = BALANCE.zombies.chargerStunDuration;
      z.damageReduction += 0.5;
      return;
    }
    z.x = nx;
    z.y = ny;
    return;
  }
  if (z.variant === 'jumper') {
    const dir = normalize(sub(target, vec2(z.x, z.y)));
    z.x += dir.x * BALANCE.zombies.jumperLeapDist;
    z.y += dir.y * BALANCE.zombies.jumperLeapDist;
    z.x = Math.max(z.radius, Math.min(state.mapWidth * TILE_W - z.radius, z.x));
    z.y = Math.max(z.radius, Math.min(state.mapHeight * TILE_W - z.radius, z.y));
    aoePlayer(state, z.x, z.y, BALANCE.zombies.jumperLandRadius, BALANCE.zombies.jumperLandDamage);
    return;
  }
  if (z.variant === 'spitter') {
    state.acidPools.push({
      x: target.x,
      y: target.y,
      radius: BALANCE.zombies.acidPoolRadius,
      dps: BALANCE.zombies.acidPoolDps,
      timer: BALANCE.zombies.acidPoolDuration,
    });
    return;
  }
  if (z.variant === 'tank') {
    aoePlayer(state, z.x, z.y, BALANCE.zombies.tankSlamRadius, BALANCE.zombies.tankSlamDamage);
    return;
  }
}

function aoePlayer(state: RunState, cx: number, cy: number, radius: number, damage: number): void {
  const p = state.player;
  const d = Math.hypot(p.x - cx, p.y - cy);
  if (d > radius + p.hitRadius) return;
  if (p.iFrameTimer > 0) return;
  const falloff = Math.max(0.25, 1 - d / radius);
  const taken = damage * falloff * state.stats.damageTakenMult;
  p.hp -= taken;
  recordDamageTaken(state, taken);
  p.iFrameTimer = BALANCE.player.hitIFrames;
  state.presentation.push({ type: 'playerHurt', damage: taken });
}

export function spawnSplitterChildren(state: RunState, z: Zombie): void {
  if (z.spawnling || z.variant !== 'splitter') return;
  for (let i = 0; i < BALANCE.zombies.spawnlingCount; i++) {
    const ang = (Math.PI * 2 * i) / BALANCE.zombies.spawnlingCount;
    spawnZombie(state, 'spawnling', z.x + Math.cos(ang) * 20, z.y + Math.sin(ang) * 20, {
      spawnling: true,
      elite: null,
    });
  }
}
