import { BALANCE } from '../../config/balance.ts';
import { nextFloat } from '../../core/math/rng.ts';
import type { RngState } from '../../core/math/rng.ts';
import type { Zombie } from '../zombieEntity.ts';
import { eliteChance } from './weights.ts';

export type EliteAffix = 'frenzied' | 'armoured' | 'volatile' | 'regenerating' | 'shielded';

const AFFIXES: EliteAffix[] = ['frenzied', 'armoured', 'volatile', 'regenerating', 'shielded'];

export function rollEliteAffix(rng: RngState, wave: number): EliteAffix | null {
  if (nextFloat(rng) > eliteChance(wave)) return null;
  return AFFIXES[Math.floor(nextFloat(rng) * AFFIXES.length)] as EliteAffix;
}

export function applyEliteToZombie(z: Zombie, affix: EliteAffix): void {
  z.isElite = true;
  z.eliteAffix = affix;
  z.maxHp = Math.round(z.maxHp * BALANCE.zombies.eliteHpMult);
  z.hp = z.maxHp;
  z.xpValue = Math.round(z.xpValue * BALANCE.zombies.eliteXpMult);
  if (affix === 'frenzied') z.speed *= 1.4;
  if (affix === 'armoured') z.damageReduction += 0.25;
  if (affix === 'shielded') z.shieldRemaining = BALANCE.zombies.eliteShieldAmount;
  if (affix === 'volatile') z.volatileOnDeath = true;
}

export function applyTitanToZombie(z: Zombie): void {
  z.isTitan = true;
  z.maxHp = Math.round(z.maxHp * BALANCE.zombies.titanHpMult);
  z.hp = z.maxHp;
  z.xpValue = Math.round(z.xpValue * BALANCE.zombies.titanXpMult);
  z.radius = Math.min(z.radius * 2, BALANCE.zombies.titanRadiusCap);
}

export function tickEliteRegen(z: Zombie, dt: number): void {
  if (z.eliteAffix !== 'regenerating') return;
  z.hp = Math.min(z.maxHp, z.hp + z.maxHp * BALANCE.zombies.eliteRegenPct * dt);
}
