import { BALANCE } from '../config/balance.ts';
import { isMobilePlatform } from '../config/platform.ts';
import { createObjectPool, type PooledItem } from '../core/objectPool.ts';
import type { RunState } from './state.ts';
import type { EliteAffix } from './zombies/elites.ts';
import type { ZombieVariantId } from './zombies/types.ts';

export type TelegraphShape = 'diamond' | 'arrow' | 'pulse' | 'ring' | 'sac';

export type ZombieStateKind =
  | 'SPAWNING'
  | 'SEEK'
  | 'TELEGRAPH'
  | 'ATTACK'
  | 'STUNNED'
  | 'DYING';

export interface Zombie extends PooledItem {
  id: number;
  variant: ZombieVariantId;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  contactDamage: number;
  xpValue: number;
  state: ZombieStateKind;
  stateTimer: number;
  burnStacks: number;
  burnTimer: number;
  slowTimer: number;
  freezeTimer: number;
  stunTimer: number;
  telegraphShape: TelegraphShape | null;
  telegraphTimer: number;
  abilityCooldown: number;
  attackDirX: number;
  attackDirY: number;
  spawnling: boolean;
  isElite: boolean;
  eliteAffix: EliteAffix | null;
  shieldRemaining: number;
  volatileOnDeath: boolean;
  isTitan: boolean;
  damageReduction: number;
  knockbackResist: number;
  wobbleT: number;
  knockVelX: number;
  knockVelY: number;
  boomerChainDepth: number;
}

export interface XpShard extends PooledItem {
  id: number;
  x: number;
  y: number;
  value: number;
}

let nextZombieId = 1;
let nextShardId = 1;

function shardCap(): number {
  return isMobilePlatform()
    ? BALANCE.performance.maxShardsMobile
    : BALANCE.performance.maxShardsDesktop;
}

function zombieCap(): number {
  return isMobilePlatform()
    ? BALANCE.performance.maxZombiesMobile
    : BALANCE.performance.maxZombiesDesktop;
}

export function createZombiePool(): ReturnType<typeof createObjectPool<Zombie>> {
  return createObjectPool<Zombie>(
    zombieCap(),
    () => ({
      active: false,
      id: 0,
      variant: 'walker',
      x: 0,
      y: 0,
      hp: 0,
      maxHp: 0,
      speed: 0,
      radius: 10,
      contactDamage: 0,
      xpValue: 0,
      state: 'SPAWNING',
      stateTimer: 0,
      burnStacks: 0,
      burnTimer: 0,
      slowTimer: 0,
      freezeTimer: 0,
      stunTimer: 0,
      telegraphShape: null,
      telegraphTimer: 0,
      abilityCooldown: 0,
      attackDirX: 0,
      attackDirY: 0,
      spawnling: false,
      isElite: false,
      eliteAffix: null,
      shieldRemaining: 0,
      volatileOnDeath: false,
      isTitan: false,
      damageReduction: 0,
      knockbackResist: 0,
      wobbleT: 0,
      knockVelX: 0,
      knockVelY: 0,
      boomerChainDepth: 0,
    }),
    (z) => {
      z.id = 0;
      z.hp = 0;
      z.state = 'SPAWNING';
      z.stateTimer = 0;
      z.telegraphShape = null;
      z.isElite = false;
      z.eliteAffix = null;
    },
  );
}

export function createShardPool(): ReturnType<typeof createObjectPool<XpShard>> {
  return createObjectPool<XpShard>(
    shardCap(),
    () => ({ active: false, id: 0, x: 0, y: 0, value: 0 }),
    (s) => {
      s.id = 0;
      s.value = 0;
    },
  );
}

export function acquireZombie(state: RunState): Zombie {
  const z = state.zombiePool.acquire();
  z.id = nextZombieId++;
  state.zombies.push(z);
  return z;
}

export function releaseZombie(state: RunState, z: Zombie): void {
  state.zombiePool.release(z);
  state.zombies = state.zombies.filter((x) => x !== z);
}

export function spawnXpShard(state: RunState, x: number, y: number, value: number): void {
  try {
    const s = state.shardPool.acquire();
    s.id = nextShardId++;
    s.x = x;
    s.y = y;
    s.value = value;
    state.shards.push(s);
  } catch {
    /* pool full */
  }
}

export function releaseShard(state: RunState, shard: XpShard): void {
  state.shardPool.release(shard);
  state.shards = state.shards.filter((s) => s !== shard);
}
