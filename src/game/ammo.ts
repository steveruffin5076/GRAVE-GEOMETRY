import { BALANCE } from '../config/balance.ts';
import type { RunState } from './state.ts';

export type AmmoId = keyof typeof BALANCE.ammo;

export const AMMO_IDS = Object.keys(BALANCE.ammo) as AmmoId[];

export function defaultAmmoId(): AmmoId {
  return 'fmj';
}

export function setActiveAmmo(state: RunState, id: AmmoId): void {
  state.activeAmmo = id;
  if (!state.owned.ammo.includes(`ammo_${id}`) && id !== 'fmj') {
    state.owned.ammo.push(`ammo_${id}`);
  }
}

export interface AmmoDamageContext {
  base: number;
  pierce: number;
  isTank: boolean;
}

export function applyAmmoModifier(state: RunState, ctx: AmmoDamageContext): AmmoDamageContext {
  const id = state.activeAmmo;
  if (id === 'fmj') return ctx;
  const def = BALANCE.ammo[id];
  let damage = ctx.base;
  let pierce = ctx.pierce;
  if ('damageMult' in def && def.damageMult !== undefined) {
    damage *= def.damageMult;
  }
  if ('pierceDelta' in def && def.pierceDelta !== undefined) {
    pierce = Math.max(0, pierce + def.pierceDelta);
  }
  if ('tankMult' in def && def.tankMult !== undefined && ctx.isTank) {
    damage *= def.tankMult;
  }
  return { base: damage, pierce, isTank: ctx.isTank };
}

export function cycleOwnedAmmo(state: RunState): void {
  const owned = state.owned.ammo
    .map((k) => k.replace('ammo_', '') as AmmoId)
    .filter((id) => AMMO_IDS.includes(id));
  const list: AmmoId[] = ['fmj', ...owned.filter((a) => a !== 'fmj')];
  if (list.length <= 1) return;
  const idx = list.indexOf(state.activeAmmo);
  const next = list[(idx + 1) % list.length] ?? 'fmj';
  state.activeAmmo = next;
}
