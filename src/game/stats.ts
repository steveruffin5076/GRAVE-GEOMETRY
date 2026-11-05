import { BALANCE } from '../config/balance.ts';
import { applyAttachmentStats } from './attachments.ts';
import { applySkillStats } from './skills.ts';
import type { RunState } from './state.ts';

export function repeatableGain(base: number, rankBefore: number): number {
  return base * Math.max(0.2, 0.85 ** rankBefore);
}

export interface DerivedStats {
  damageMult: number;
  fireRateMult: number;
  moveSpeed: number;
  maxHpBonus: number;
  reloadMult: number;
  pickupRadius: number;
  critChance: number;
  critDamageMult: number;
  damageTakenMult: number;
  xpGainMult: number;
  magSizeMult: number;
  prestigeMult: number;
  spreadMult: number;
  knockbackMult: number;
  regenPerSecond: number;
}

export function defaultDerivedStats(): DerivedStats {
  const p = BALANCE.player;
  return {
    damageMult: 1,
    fireRateMult: 1,
    moveSpeed: p.moveSpeed,
    maxHpBonus: 0,
    reloadMult: 1,
    pickupRadius: p.pickupRadius,
    critChance: 0,
    critDamageMult: 1.2,
    damageTakenMult: 1,
    xpGainMult: 1,
    magSizeMult: 1,
    prestigeMult: 1,
    spreadMult: 1,
    knockbackMult: 1,
    regenPerSecond: 0,
  };
}

export function clampDerivedStats(raw: DerivedStats): DerivedStats {
  const baseMove = BALANCE.player.moveSpeed;
  let moveSpeed = Math.min(raw.moveSpeed, 400);
  moveSpeed = Math.max(moveSpeed, baseMove * 0.5);
  const maxFireMult = 30 / BALANCE.weapons.pistol.fireRate;
  const fireRateMult = Math.min(raw.fireRateMult, maxFireMult);
  return {
    ...raw,
    moveSpeed,
    fireRateMult,
    critChance: Math.min(raw.critChance, 0.75),
    damageTakenMult: Math.max(raw.damageTakenMult, 0.25),
    pickupRadius: Math.min(raw.pickupRadius, 400),
    reloadMult: Math.max(0.2, raw.reloadMult),
    spreadMult: Math.max(0.2, raw.spreadMult),
  };
}

export function recomputeStats(state: RunState): DerivedStats {
  const ranks = state.ranks;
  const s = defaultDerivedStats();

  const prestigeRank = ranks.prestige_all ?? 0;
  if (prestigeRank > 0) {
    let mult = 1;
    for (let r = 0; r < prestigeRank; r++) {
      mult *= 1 + repeatableGain(0.1, r);
    }
    s.prestigeMult = mult;
    s.damageMult *= mult;
    s.fireRateMult *= mult;
  }

  for (const wid of Object.keys(BALANCE.weapons)) {
    const mr = ranks[`mastery_weapon_${wid}`] ?? 0;
    for (let r = 0; r < mr; r++) {
      s.damageMult += repeatableGain(0.03, r);
    }
  }

  applyAttachmentStats(state, s);
  applySkillStats(state, s);

  const cacheIds = [
    'cache_weapon',
    'cache_ammo',
    'cache_attachment',
    'cache_grenade',
    'cache_skill',
  ] as const;
  for (const id of cacheIds) {
    const rank = ranks[id] ?? 0;
    for (let r = 0; r < rank; r++) {
      const g = repeatableGain(0.04, r);
      if (id === 'cache_weapon') s.damageMult += g;
      if (id === 'cache_ammo') s.damageMult += g * 0.5;
      if (id === 'cache_attachment') s.reloadMult *= 1 - g * 0.5;
      if (id === 'cache_grenade') s.damageMult += g * 0.25;
      if (id === 'cache_skill') s.moveSpeed += BALANCE.player.moveSpeed * g;
    }
  }

  return clampDerivedStats(s);
}

export function syncPlayerFromStats(state: RunState): void {
  const s = state.stats;
  const prevMax = state.player.maxHp;
  state.player.maxHp = BALANCE.player.maxHp + s.maxHpBonus;
  if (state.player.maxHp > prevMax) {
    state.player.hp += state.player.maxHp - prevMax;
  }
  state.player.moveSpeed = s.moveSpeed;
  const dashRank = state.ranks.skill_dashmaster ?? 0;
  state.player.dashCharges = Math.min(3, 1 + dashRank * BALANCE.skills.dashmaster.dashCharges);
}
