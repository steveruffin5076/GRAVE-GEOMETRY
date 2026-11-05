import { BALANCE } from '../config/balance.ts';
import { nextFloat } from '../core/math/rng.ts';
import { applyAmmoModifier } from './ammo.ts';
import { getAttachmentDamageMult } from './attachments.ts';
import type { Obstacle } from './map.ts';
import {
  adrenalineFireMult,
  bloodlustDamageMult,
  executionerDamageMult,
} from './skills.ts';
import type { RunState } from './state.ts';
import type { Zombie } from './zombieEntity.ts';
import { recordDamageDealt } from './runStats.ts';
import { killZombie } from './zombies/zombieKill.ts';
import { getEffectiveWeaponDef } from './weapons.ts';

export interface DamageContext {
  base: number;
  pierce: number;
  isTank: boolean;
}

export interface DamageStages {
  base: number;
  afterAmmo: number;
  afterAttachments: number;
  afterSkills: number;
  afterCrit: number;
  final: number;
}

function skillDamageMult(state: RunState, target: Zombie): number {
  return bloodlustDamageMult(state) * adrenalineFireMult(state) * executionerDamageMult(state, target.hp / target.maxHp);
}

export function computeDamageStages(state: RunState, weaponBase: number, target: Zombie): DamageStages {
  const base = weaponBase;
  const isTank = target.variant === 'tank';
  const afterAmmo = applyAmmoModifier(state, { base, pierce: 0, isTank }).base;
  const afterAttachments = afterAmmo * getAttachmentDamageMult(state);
  const afterSkills = afterAttachments * skillDamageMult(state, target);
  let afterCrit = afterSkills;
  if (nextFloat(state.rng) < state.stats.critChance) {
    afterCrit *= state.stats.critDamageMult;
  }
  return {
    base,
    afterAmmo,
    afterAttachments,
    afterSkills,
    afterCrit,
    final: afterCrit,
  };
}

export function computeBulletDamage(_state: RunState, ctx: DamageContext): number {
  return ctx.base;
}

export function applyBulletHitDamage(state: RunState, damage: number, target: Obstacle): void {
  void state;
  void target;
  void damage;
}

export function applyBulletHitZombie(state: RunState, z: Zombie, bullet: { vx: number; vy: number }): void {
  if (z.state === 'SPAWNING' || z.state === 'DYING') return;
  const weapon = getEffectiveWeaponDef(state, state.weapon.id);
  const weaponBase = weapon.damage;
  const stages = computeDamageStages(state, weaponBase, z);
  let final = stages.final * (1 - z.damageReduction);
  if (z.shieldRemaining > 0) {
    const absorbed = Math.min(z.shieldRemaining, final);
    z.shieldRemaining -= absorbed;
    final -= absorbed;
  }
  z.hp -= final;
  recordDamageDealt(state, final);
  state.presentation.push({ type: 'hit', x: z.x, y: z.y, damage: final });
  const kb = weapon.knockback * state.stats.knockbackMult;
  const spd = Math.hypot(bullet.vx, bullet.vy) || 1;
  const resist = 1 - z.knockbackResist;
  z.knockVelX += (bullet.vx / spd) * kb * resist;
  z.knockVelY += (bullet.vy / spd) * kb * resist;
  applyAmmoOnHit(state, z);
  if (z.hp <= 0) {
    killZombie(state, z);
  }
}

function applyAmmoOnHit(state: RunState, z: Zombie): void {
  const id = state.activeAmmo;
  if (id === 'incendiary') {
    z.burnStacks = Math.min(BALANCE.ammo.incendiary.maxBurnStacks, z.burnStacks + 1);
    z.burnTimer = BALANCE.ammo.incendiary.burnDuration;
  } else if (id === 'cryo') {
    z.slowTimer = BALANCE.ammo.cryo.slowDuration;
    if (nextFloat(state.rng) < BALANCE.ammo.cryo.freezeChance) {
      z.freezeTimer = Math.max(z.freezeTimer, BALANCE.ammo.cryo.freezeDuration);
    }
  } else if (id === 'explosive') {
    const splash = BALANCE.ammo.explosive;
    for (const other of state.zombies) {
      if (other === z || !other.active) continue;
      const d = Math.hypot(other.x - z.x, other.y - z.y);
      if (d <= splash.splashRadius) {
        other.hp -= splash.splashDamage;
      }
    }
  }
}

export function applyDamagePipeline(state: RunState, base: number): number {
  const afterAmmo = applyAmmoModifier(state, { base, pierce: 0, isTank: false }).base;
  return afterAmmo * getAttachmentDamageMult(state) * state.stats.damageMult;
}
