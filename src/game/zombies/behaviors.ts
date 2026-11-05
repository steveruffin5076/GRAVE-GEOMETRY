import { BALANCE } from '../../config/balance.ts';
import { len, normalize, scale, sub, vec2 } from '../../core/math/vec2.ts';
import { thornsDamage } from '../skills.ts';
import { slideMove } from '../collision.ts';
import type { RunState } from '../state.ts';
import type { Zombie } from '../zombieEntity.ts';
import { tickEliteRegen } from './elites.ts';
import { updateAcidPools } from './hazards.ts';
import { killZombie, finishDying } from './zombieKill.ts';
import { explodeBoomer } from './boomer.ts';
import { recordDamageTaken } from '../runStats.ts';
import { updateVariantBehavior } from './variantBehaviors.ts';

function applyKnockbackMotion(state: RunState, z: Zombie, dt: number): void {
  if (z.knockVelX === 0 && z.knockVelY === 0) return;
  const next = slideMove(
    z.x,
    z.y,
    z.radius,
    { x: z.knockVelX * dt, y: z.knockVelY * dt },
    state.obstacles,
    state.mapWidth,
    state.mapHeight,
  );
  z.x = next.x;
  z.y = next.y;
  const decay = Math.max(0, 1 - 8 * dt);
  z.knockVelX *= decay;
  z.knockVelY *= decay;
  if (Math.hypot(z.knockVelX, z.knockVelY) < 2) {
    z.knockVelX = 0;
    z.knockVelY = 0;
  }
}
function statusSpeedMult(z: Zombie): number {
  if (z.freezeTimer > 0 || z.stunTimer > 0 || z.state === 'STUNNED') return 0;
  if (z.slowTimer > 0) return BALANCE.ammo.cryo.slowMult;
  return 1;
}

function contactPlayer(state: RunState, z: Zombie): void {
  if (z.contactDamage <= 0) return;
  const player = state.player;
  const distPlayer = Math.hypot(z.x - player.x, z.y - player.y);
  if (distPlayer >= z.radius + player.hitRadius || player.iFrameTimer > 0) return;
  const taken = z.contactDamage * state.stats.damageTakenMult;
  player.hp -= taken;
  recordDamageTaken(state, taken);
  player.iFrameTimer = BALANCE.player.hitIFrames;
  state.presentation.push({ type: 'playerHurt', damage: taken });
  const thorns = thornsDamage(state);
  if (thorns > 0) z.hp -= thorns;
  if (player.hp <= 0) {
    if ((state.ranks.skill_secondwind ?? 0) > 0 && state.secondWindTimer <= 0) {
      player.hp = 1;
      state.secondWindTimer = BALANCE.skills.secondwind.cooldown;
    } else {
      player.hp = 0;
      state.phase = 'GAME_OVER';
    }
  }
}

export function updateZombies(state: RunState, dt: number): void {
  updateAcidPools(state, dt);
  const player = state.player;
  if (player.slowTimer > 0) player.slowTimer = Math.max(0, player.slowTimer - dt);

  for (const z of state.zombies) {
    if (!z.active) continue;

    z.burnTimer = Math.max(0, z.burnTimer - dt);
    z.slowTimer = Math.max(0, z.slowTimer - dt);
    z.freezeTimer = Math.max(0, z.freezeTimer - dt);
    z.stunTimer = Math.max(0, z.stunTimer - dt);
    if (z.burnTimer > 0) {
      z.hp -= BALANCE.ammo.incendiary.burnDps * z.burnStacks * dt;
    }
    tickEliteRegen(z, dt);

    if (z.hp <= 0 && z.state !== 'DYING') {
      if (z.variant === 'boomer') explodeBoomer(state, z, z.boomerChainDepth);
      killZombie(state, z);
      continue;
    }

    if (z.state === 'DYING') {
      z.stateTimer -= dt;
      finishDying(state, z);
      continue;
    }
    if (z.state === 'SPAWNING') {
      z.stateTimer -= dt;
      if (z.stateTimer <= 0) z.state = 'SEEK';
      continue;
    }

    const speedMult = statusSpeedMult(z);
    if (z.state === 'SEEK' || z.state === 'TELEGRAPH' || z.state === 'ATTACK' || z.state === 'STUNNED') {
      applyKnockbackMotion(state, z, dt);
      updateVariantBehavior(state, z, dt, speedMult);
    } else if (speedMult > 0) {
      const toTarget = sub(vec2(player.x, player.y), vec2(z.x, z.y));
      if (len(toTarget) > 1) {
        const dir = normalize(toTarget);
        const delta = scale(dir, z.speed * speedMult * dt);
        const next = slideMove(z.x, z.y, z.radius, delta, state.obstacles, state.mapWidth, state.mapHeight);
        z.x = next.x;
        z.y = next.y;
      }
    }

    if (z.variant === 'boomer' && z.state === 'ATTACK') {
      explodeBoomer(state, z, z.boomerChainDepth);
      z.hp = 0;
      continue;
    }

    contactPlayer(state, z);
  }
}
