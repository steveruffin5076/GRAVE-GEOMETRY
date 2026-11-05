import { BALANCE } from '../config/balance.ts';
import type { DerivedStats } from './stats.ts';
import { repeatableGain } from './stats.ts';
import type { RunState } from './state.ts';

export type SkillId = keyof typeof BALANCE.skills;

export const SKILL_IDS = Object.keys(BALANCE.skills) as SkillId[];

export function applySkillStats(state: RunState, stats: DerivedStats): void {
  const ranks = state.ranks;
  const p = BALANCE.player;

  const fleet = ranks.skill_fleetfoot ?? 0;
  for (let r = 0; r < fleet; r++) {
    stats.moveSpeed += p.moveSpeed * repeatableGain(BALANCE.skills.fleetfoot.moveSpeedMult, r);
  }

  stats.maxHpBonus += (ranks.skill_vitality ?? 0) * BALANCE.skills.vitality.maxHp;

  const hands = ranks.skill_fasthands ?? 0;
  for (let r = 0; r < hands; r++) {
    stats.reloadMult *= 1 - repeatableGain(BALANCE.skills.fasthands.reloadMult, r);
  }

  const magnet = ranks.skill_magnet ?? 0;
  for (let r = 0; r < magnet; r++) {
    stats.pickupRadius += p.pickupRadius * repeatableGain(BALANCE.skills.magnet.pickupMult, r);
  }

  const deadeye = ranks.skill_deadeye ?? 0;
  for (let r = 0; r < deadeye; r++) {
    stats.critChance += repeatableGain(BALANCE.skills.deadeye.critChance, r);
    stats.critDamageMult *= 1 + (BALANCE.skills.deadeye.critDamageMult - 1) * repeatableGain(1, r);
  }

  stats.xpGainMult += (ranks.skill_scholar ?? 0) * BALANCE.skills.scholar.xpMult;

  const bulwark = ranks.skill_bulwark ?? 0;
  for (let r = 0; r < bulwark; r++) {
    stats.damageTakenMult *= BALANCE.skills.bulwark.damageTakenMult ** repeatableGain(1, r);
  }

  stats.regenPerSecond += (ranks.skill_regenerator ?? 0) * BALANCE.skills.regenerator.hpPerSecond;
}

export function arsenalRank(state: RunState): number {
  return state.ranks.skill_arsenal ?? 0;
}

export function adrenalineFireMult(state: RunState): number {
  const rank = state.ranks.skill_adrenaline ?? 0;
  if (rank <= 0) return 1;
  const threshold = BALANCE.skills.adrenaline.lowHpThreshold;
  if (state.player.hp / state.player.maxHp > threshold) return 1;
  return BALANCE.skills.adrenaline.fireRateMult;
}

export function bloodlustDamageMult(state: RunState): number {
  const rank = state.ranks.skill_bloodlust ?? 0;
  if (rank <= 0) return 1;
  const stacks = Math.floor(state.waveKills / 25);
  return 1 + stacks * BALANCE.skills.bloodlust.damagePer25Kills * rank;
}

export function executionerDamageMult(state: RunState, targetHpRatio: number): number {
  const rank = state.ranks.skill_executioner ?? 0;
  if (rank <= 0) return 1;
  if (targetHpRatio > BALANCE.skills.executioner.executeThreshold) return 1;
  return BALANCE.skills.executioner.lowHpDamageMult;
}

export function thornsDamage(state: RunState): number {
  const rank = state.ranks.skill_thorns ?? 0;
  return rank * BALANCE.skills.thorns.contactReflect;
}
