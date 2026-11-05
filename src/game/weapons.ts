import { BALANCE } from '../config/balance.ts';
import type { RngState } from '../core/math/rng.ts';
import { nextFloat } from '../core/math/rng.ts';
import type { Vec2 } from '../core/math/vec2.ts';
import { normalize, vec2 } from '../core/math/vec2.ts';
import { stabiliserRemovesMovePenalty } from './attachments.ts';
import type { RunState } from './state.ts';
import { spawnBullet } from './bullets.ts';

export type WeaponId = keyof typeof BALANCE.weapons;

export const WEAPON_IDS = Object.keys(BALANCE.weapons) as WeaponId[];

export interface WeaponDef {
  id: WeaponId;
  damage: number;
  fireRate: number;
  magSize: number;
  reloadTime: number;
  spreadDeg: number;
  pellets: number;
  projectileSpeed: number;
  range: number;
  pierce: number;
  knockback: number;
  moveSpeedMult: number;
}

export interface WeaponInstance {
  id: WeaponId;
  ammoInMag: number;
  reloadTimer: number;
  fireCooldown: number;
}

export function getWeaponDef(id: WeaponId): WeaponDef {
  return BALANCE.weapons[id] as WeaponDef;
}

export function getEffectiveWeaponDef(state: RunState, id: WeaponId): WeaponDef {
  const base = getWeaponDef(id);
  const s = state.stats;
  let moveMult = base.moveSpeedMult;
  if (stabiliserRemovesMovePenalty(state) && (id === 'lmg' || id === 'flamethrower')) {
    moveMult = 1;
  }
  void moveMult;
  return {
    ...base,
    damage: base.damage,
    fireRate: Math.min(base.fireRate * s.fireRateMult, 30),
    magSize: Math.max(1, Math.round(base.magSize * s.magSizeMult)),
    reloadTime: base.reloadTime * s.reloadMult,
    spreadDeg: base.spreadDeg * s.spreadMult,
    pierce: base.pierce,
    knockback: base.knockback * s.knockbackMult,
  };
}

export function createWeaponInstance(id: WeaponId = 'pistol'): WeaponInstance {
  const def = getWeaponDef(id);
  return {
    id,
    ammoInMag: def.magSize,
    reloadTimer: 0,
    fireCooldown: 0,
  };
}

export function stashWeapon(state: RunState): void {
  state.weaponStores[state.weapon.id] = { ...state.weapon };
}

export function equipWeapon(state: RunState, id: WeaponId): void {
  stashWeapon(state);
  const stored = state.weaponStores[id];
  state.weapon = stored ?? createWeaponInstance(id);
  state.weapon.id = id;
}

export function cycleOwnedWeapon(state: RunState): void {
  const list = state.owned.weapons;
  if (list.length <= 1) return;
  const idx = list.indexOf(state.weapon.id);
  const next = list[(idx + 1) % list.length] ?? 'pistol';
  equipWeapon(state, next);
}

function applySpread(rng: RngState, dir: Vec2, spreadDeg: number): Vec2 {
  if (spreadDeg <= 0) return dir;
  const half = (spreadDeg * Math.PI) / 180 / 2;
  const angle = Math.atan2(dir.y, dir.x) + (nextFloat(rng) * 2 - 1) * half;
  return vec2(Math.cos(angle), Math.sin(angle));
}

export function updateWeapon(
  state: RunState,
  fire: boolean,
  reloadPressed: boolean,
  dt: number,
): void {
  const weapon = state.weapon;
  const def = getEffectiveWeaponDef(state, weapon.id);
  weapon.fireCooldown = Math.max(0, weapon.fireCooldown - dt);
  if (weapon.reloadTimer > 0) {
    weapon.reloadTimer = Math.max(0, weapon.reloadTimer - dt);
    if (weapon.reloadTimer === 0) {
      weapon.ammoInMag = def.magSize;
    }
    return;
  }

  const wantsFire = fire;
  const empty = weapon.ammoInMag <= 0;
  if ((reloadPressed || (empty && wantsFire)) && weapon.ammoInMag < def.magSize) {
    weapon.reloadTimer = def.reloadTime;
    state.presentation.push({ type: 'reload' });
    return;
  }

  if (!wantsFire || weapon.fireCooldown > 0 || empty) return;

  const baseDir = normalize(state.player.aim);
  for (let p = 0; p < def.pellets; p++) {
    const dir = applySpread(state.rng, baseDir, def.spreadDeg);
    spawnBullet(state, state.player.x, state.player.y, dir, def);
  }
  weapon.ammoInMag -= 1;
  weapon.fireCooldown = 1 / def.fireRate;
  state.presentation.push({ type: 'shot', x: state.player.x, y: state.player.y, dir: baseDir });
}

export function reloadRemaining(weapon: WeaponInstance): number {
  return weapon.reloadTimer;
}

export function fireIntervalSeconds(def: WeaponDef): number {
  return 1 / def.fireRate;
}

export function unlockWeapon(state: RunState, id: WeaponId): void {
  if (!state.owned.weapons.includes(id)) state.owned.weapons.push(id);
  state.ranks[`weapon_${id}`] = 1;
  equipWeapon(state, id);
}
