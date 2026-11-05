import { BALANCE } from '../../config/balance.ts';

export type ZombieVariantId = keyof typeof BALANCE.zombies.variants;

export interface ZombieVariantDef {
  id: ZombieVariantId;
  hp: number;
  speed: number;
  contactDamage: number;
  radius: number;
  xp: number;
  unlockWave: number;
  damageReduction: number;
  knockbackResist: number;
}

export const ZOMBIE_VARIANTS: Record<ZombieVariantId, ZombieVariantDef> = BALANCE.zombies.variants;

export const COMBAT_VARIANTS: ZombieVariantId[] = (
  Object.keys(ZOMBIE_VARIANTS) as ZombieVariantId[]
).filter((id) => id !== 'spawnling');

export function getVariant(id: ZombieVariantId): ZombieVariantDef {
  return ZOMBIE_VARIANTS[id];
}

export function scaledHp(base: number, wave: number): number {
  const mult = Math.min(1 + BALANCE.waves.hpScalarPerWave * (wave - 1), BALANCE.waves.hpScalarCap);
  return Math.round(base * mult);
}

export function scaledDamage(base: number, wave: number): number {
  const mult = Math.min(1 + BALANCE.waves.damageScalarPerWave * (wave - 1), BALANCE.waves.damageScalarCap);
  return Math.round(base * mult);
}

export function xpFromKill(variant: ZombieVariantDef, wave: number): number {
  return Math.round(variant.xp * (1 + 0.03 * (wave - 1)));
}

export function telegraphDurationSeconds(variant: ZombieVariantId, kind: string): number {
  const min = BALANCE.zombies.telegraphMinSeconds;
  if (variant === 'jumper' && kind === 'leap') return Math.max(min, BALANCE.zombies.jumperTelegraph);
  if (variant === 'charger' && kind === 'dash') return Math.max(min, BALANCE.zombies.chargerWindup);
  if (variant === 'boomer' && kind === 'explode') return Math.max(min, BALANCE.zombies.boomerTelegraph);
  if (variant === 'tank' && kind === 'slam') return Math.max(min, BALANCE.zombies.tankSlamTelegraph);
  if (variant === 'spitter' && kind === 'spit') return Math.max(min, BALANCE.zombies.spitterTelegraph);
  return min;
}
