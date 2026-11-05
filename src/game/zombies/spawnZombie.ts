import { BALANCE } from '../../config/balance.ts';
import type { RunState } from '../state.ts';
import { acquireZombie, type Zombie } from '../zombieEntity.ts';
import { applyEliteToZombie, applyTitanToZombie, rollEliteAffix, type EliteAffix } from './elites.ts';
import { canSpawnZombie } from './spawnCaps.ts';
import { getVariant, scaledHp, scaledDamage, xpFromKill, type ZombieVariantId } from './types.ts';

export interface SpawnZombieOpts {
  elite?: EliteAffix | null;
  forceTitan?: boolean;
  spawnling?: boolean;
}

export function configureZombie(
  state: RunState,
  z: Zombie,
  variant: ZombieVariantId,
  x: number,
  y: number,
  opts: SpawnZombieOpts = {},
): void {
  const def = getVariant(variant);
  const wave = state.spawn.wave;
  z.variant = variant;
  z.x = x;
  z.y = y;
  z.spawnling = opts.spawnling ?? variant === 'spawnling';
  z.maxHp = scaledHp(def.hp, wave);
  z.hp = z.maxHp;
  z.speed = def.speed;
  z.radius = def.radius;
  z.contactDamage = scaledDamage(def.contactDamage, wave);
  z.xpValue = xpFromKill(def, wave);
  z.damageReduction = def.damageReduction ?? 0;
  z.knockbackResist = def.knockbackResist ?? 0;
  z.state = 'SPAWNING';
  z.stateTimer = BALANCE.zombies.spawnFadeIn;
  z.telegraphShape = null;
  z.telegraphTimer = 0;
  z.abilityCooldown = 0;
  z.attackDirX = 0;
  z.attackDirY = 0;
  z.boomerChainDepth = 0;
  z.isElite = false;
  z.eliteAffix = null;
  z.shieldRemaining = 0;
  z.volatileOnDeath = false;
  z.isTitan = false;
  z.wobbleT = 0;

  z.knockVelX = 0;
  z.knockVelY = 0;

  if (opts.forceTitan) {
    applyTitanToZombie(z);
  } else {
    const affix = opts.elite === undefined ? rollEliteAffix(state.rng, wave) : opts.elite;
    if (affix !== null) applyEliteToZombie(z, affix);
  }
}

export function spawnZombie(
  state: RunState,
  variant: ZombieVariantId,
  x: number,
  y: number,
  opts: SpawnZombieOpts = {},
): Zombie | null {
  if (!canSpawnZombie(state)) return null;
  let z: Zombie;
  try {
    z = acquireZombie(state);
  } catch {
    return null;
  }
  configureZombie(state, z, variant, x, y, opts);
  return z;
}
