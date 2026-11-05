import { BALANCE } from '../config/balance.ts';
import { nextFloat } from '../core/math/rng.ts';
import type { RunState } from './state.ts';
import { repeatableGain } from './stats.ts';

export type GrenadeId = keyof typeof BALANCE.grenades;

export const GRENADE_IDS = Object.keys(BALANCE.grenades) as GrenadeId[];

export function grantGrenadeType(state: RunState, id: GrenadeId): void {
  const key = `grenade_${id}`;
  if (!state.owned.grenades.includes(key)) state.owned.grenades.push(key);
  state.activeGrenade = id;
  state.maxGrenadeCharges = Math.min(6, state.maxGrenadeCharges + 1);
  if (state.grenadeCharges < state.maxGrenadeCharges) {
    state.grenadeCharges = Math.min(state.maxGrenadeCharges, state.grenadeCharges + 1);
  }
}

function grenadeCooldown(state: RunState): number {
  const base = state.activeGrenade ? BALANCE.grenades[state.activeGrenade].cooldown : 9;
  const scav = state.ranks.skill_scavenger ?? 0;
  let cd = base;
  for (let r = 0; r < scav; r++) {
    cd *= BALANCE.skills.scavenger.grenadeCooldownMult ** repeatableGain(1, r);
  }
  const mastery = state.ranks[`mastery_grenade_${state.activeGrenade}`] ?? 0;
  for (let r = 0; r < mastery; r++) {
    cd *= 1 - repeatableGain(0.08, r);
  }
  return Math.max(base * 0.2, cd);
}

function throwPoint(state: RunState, dist: number): { x: number; y: number } {
  const p = state.player;
  const len = Math.hypot(p.aim.x, p.aim.y) || 1;
  return { x: p.x + (p.aim.x / len) * dist, y: p.y + (p.aim.y / len) * dist };
}

function aoeDamage(state: RunState, cx: number, cy: number, radius: number, peak: number): void {
  const maxT = BALANCE.performance.maxExplosionTargets;
  let hits = 0;
  for (const z of state.zombies) {
    if (!z.active || z.state === 'SPAWNING' || z.state === 'DYING') continue;
    const d = Math.hypot(z.x - cx, z.y - cy);
    if (d > radius) continue;
    const falloff = Math.max(0.25, 1 - d / radius);
    const dmg = peak * falloff;
    z.hp -= dmg;
    hits += 1;
    if (z.hp <= 0) {
      z.state = 'DYING';
      z.stateTimer = 0.25;
    }
    if (hits >= maxT) break;
  }
  state.presentation.push({ type: 'explosion', x: cx, y: cy, radius, damage: peak });
}

export function tryThrowGrenade(state: RunState, pressed: boolean): void {
  if (!pressed || state.activeGrenade === null) return;
  if (state.grenadeCharges <= 0 || state.grenadeCooldownTimer > 0) return;
  const id = state.activeGrenade;
  const pt = throwPoint(state, 140);
  state.grenadeCharges -= 1;
  state.grenadeCooldownTimer = grenadeCooldown(state);

  if (id === 'frag') {
    const def = BALANCE.grenades.frag;
    aoeDamage(state, pt.x, pt.y, def.radius, def.damage);
  } else if (id === 'cryo') {
    const def = BALANCE.grenades.cryo;
    aoeDamage(state, pt.x, pt.y, def.radius, def.damage);
    for (const z of state.zombies) {
      if (Math.hypot(z.x - pt.x, z.y - pt.y) <= def.radius) {
        z.freezeTimer = Math.max(z.freezeTimer, def.freezeDuration);
      }
    }
  } else if (id === 'emp') {
    const def = BALANCE.grenades.emp;
    aoeDamage(state, pt.x, pt.y, def.radius, def.damage);
    for (const z of state.zombies) {
      if (Math.hypot(z.x - pt.x, z.y - pt.y) <= def.radius) {
        z.stunTimer = Math.max(z.stunTimer, def.stunDuration);
      }
    }
  } else if (id === 'cluster') {
    const def = BALANCE.grenades.cluster;
    for (let i = 0; i < def.subCount; i++) {
      const ang = nextFloat(state.rng) * Math.PI * 2;
      const r = nextFloat(state.rng) * def.scatterRadius;
      aoeDamage(state, pt.x + Math.cos(ang) * r, pt.y + Math.sin(ang) * r, 40, def.subDamage);
    }
  } else if (id === 'decoy') {
    const def = BALANCE.grenades.decoy;
    state.decoy = { x: pt.x, y: pt.y, timer: def.pullDuration, radius: def.pullRadius };
  } else if (id === 'molotov') {
    const def = BALANCE.grenades.molotov;
    state.grenadeFields.push({
      x: pt.x,
      y: pt.y,
      radius: def.radius,
      dps: def.fieldDps,
      timer: def.fieldDuration,
    });
  }
}

export function updateGrenades(state: RunState, dt: number): void {
  state.grenadeCooldownTimer = Math.max(0, state.grenadeCooldownTimer - dt);
  if (state.grenadeCharges < state.maxGrenadeCharges && state.grenadeCooldownTimer <= 0) {
    state.grenadeCharges += 1;
    state.grenadeCooldownTimer = grenadeCooldown(state);
  }

  const fields = [];
  for (const f of state.grenadeFields) {
    f.timer -= dt;
    if (f.timer <= 0) continue;
    aoeDamage(state, f.x, f.y, f.radius, f.dps * dt);
    fields.push(f);
  }
  state.grenadeFields = fields.slice(0, BALANCE.performance.maxGrenadeFields);

  if (state.decoy !== null) {
    state.decoy.timer -= dt;
    if (state.decoy.timer <= 0) {
      state.decoy = null;
    }
  }
}

export function cycleOwnedGrenade(state: RunState): void {
  const owned = state.owned.grenades
    .map((g) => g.replace('grenade_', '') as GrenadeId)
    .filter((id) => GRENADE_IDS.includes(id));
  if (owned.length <= 1) return;
  const idx = owned.indexOf(state.activeGrenade ?? owned[0]!);
  state.activeGrenade = owned[(idx + 1) % owned.length] ?? null;
}
