import type { RngState } from '../core/math/rng.ts';
import { createRng } from '../core/math/rng.ts';
import type { Vec2 } from '../core/math/vec2.ts';
import { vec2 } from '../core/math/vec2.ts';
import type { ObjectPool } from '../core/objectPool.ts';
import { createBulletPool, type Bullet } from './bullets.ts';
import type { Obstacle } from './map.ts';
import { createWeaponInstance, type WeaponInstance } from './weapons.ts';
import { createSpawnState, type SpawnState } from './zombies/spawnDirector.ts';
import {
  createShardPool,
  createZombiePool,
  type XpShard,
  type Zombie,
} from './zombieEntity.ts';
import { xpToNext } from './xp.ts';
import { defaultDerivedStats, recomputeStats, type DerivedStats } from './stats.ts';
import type { UpgradeCategory, UpgradeOption } from './upgrades.ts';
import { defaultAmmoId, type AmmoId } from './ammo.ts';
import type { GrenadeId } from './grenades.ts';
import type { WeaponId } from './weapons.ts';

export type RunPhase = 'MENU' | 'PLAYING' | 'PAUSED' | 'LEVEL_UP' | 'GAME_OVER';

export interface PlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  hitRadius: number;
  moveSpeed: number;
  dashCharges: number;
  dashCooldown: number;
  dashTimer: number;
  dashVel: Vec2;
  iFrameTimer: number;
  slowTimer: number;
  aim: Vec2;
}

export type PresentationEvent =
  | { type: 'shot'; x: number; y: number; dir: Vec2 }
  | { type: 'hit'; x: number; y: number; damage: number }
  | { type: 'reload' }
  | { type: 'kill'; variantId: string; targetId: number }
  | { type: 'killCombo'; count: number }
  | { type: 'levelUp'; level: number; pending: number }
  | { type: 'playerHurt'; damage: number }
  | { type: 'pickup'; xp: number }
  | { type: 'waveStart'; wave: number }
  | { type: 'tracer'; x0: number; y0: number; x1: number; y1: number; ttl: number }
  | { type: 'upgradeApplied'; id: string; rank: number }
  | { type: 'explosion'; x: number; y: number; radius: number; damage: number }
  | {
      type: 'telegraph';
      variant: string;
      shape: string;
      duration: number;
      x: number;
      y: number;
    }
  | { type: 'zombieDeath'; variant: string; x: number; y: number }
  | { type: 'titanSpawn'; wave: number };

export interface AcidPool {
  x: number;
  y: number;
  radius: number;
  dps: number;
  timer: number;
}

export interface GrenadeField {
  x: number;
  y: number;
  radius: number;
  dps: number;
  timer: number;
}

export interface DecoyState {
  x: number;
  y: number;
  timer: number;
  radius: number;
}

export interface OwnedState {
  weapons: WeaponId[];
  ammo: string[];
  attachments: string[];
  grenades: string[];
  skills: string[];
}

export interface RunState {
  seed: number;
  rng: RngState;
  time: number;
  phase: RunPhase;
  wave: number;
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  score: number;
  pendingLevelUps: number;
  levelUpOptions: UpgradeOption[] | null;
  ranks: Record<string, number>;
  owned: OwnedState;
  stats: DerivedStats;
  recentUpgradeCategories: UpgradeCategory[];
  grenadeCharges: number;
  maxGrenadeCharges: number;
  grenadeCooldownTimer: number;
  activeAmmo: AmmoId;
  activeGrenade: GrenadeId | null;
  grenadeFields: GrenadeField[];
  decoy: DecoyState | null;
  acidPools: AcidPool[];
  killsByVariant: Partial<Record<string, number>>;
  combatDamageWindow: number;
  combatDamageWindowSec: number;
  combatDps: number;
  killComboCount: number;
  killComboTimer: number;
  damageDealt: number;
  damageTaken: number;
  peakCombo: number;
  waveKills: number;
  cycleArsenalMode: 'weapon' | 'ammo';
  weaponStores: Partial<Record<WeaponId, WeaponInstance>>;
  secondWindTimer: number;
  player: PlayerState;
  weapon: WeaponInstance;
  bullets: Bullet[];
  bulletPool: ObjectPool<Bullet>;
  zombies: Zombie[];
  zombiePool: ObjectPool<Zombie>;
  shards: XpShard[];
  shardPool: ObjectPool<XpShard>;
  spawn: SpawnState;
  obstacles: Obstacle[];
  mapWidth: number;
  mapHeight: number;
  presentation: PresentationEvent[];
}

export interface CreateRunStateOptions {
  seed?: number;
  spawn: Vec2;
  obstacles: Obstacle[];
  mapWidth: number;
  mapHeight: number;
}

export function createRunState(opts: CreateRunStateOptions): RunState {
  const seed = opts.seed ?? 1;
  return {
    seed,
    rng: createRng(seed),
    time: 0,
    phase: 'PLAYING',
    wave: 1,
    level: 1,
    xp: 0,
    xpNext: xpToNext(1),
    kills: 0,
    score: 0,
    pendingLevelUps: 0,
    levelUpOptions: null,
    ranks: {},
    owned: {
      weapons: ['pistol'],
      ammo: [],
      attachments: [],
      grenades: [],
      skills: [],
    },
    stats: defaultDerivedStats(),
    recentUpgradeCategories: [],
    grenadeCharges: 0,
    maxGrenadeCharges: 0,
    grenadeCooldownTimer: 0,
    activeAmmo: defaultAmmoId(),
    activeGrenade: null,
    grenadeFields: [],
    decoy: null,
    acidPools: [],
    killsByVariant: {},
    combatDamageWindow: 0,
    combatDamageWindowSec: 0,
    combatDps: 0,
    killComboCount: 0,
    killComboTimer: 0,
    damageDealt: 0,
    damageTaken: 0,
    peakCombo: 0,
    waveKills: 0,
    cycleArsenalMode: 'weapon',
    secondWindTimer: 0,
    player: {
      x: opts.spawn.x,
      y: opts.spawn.y,
      hp: 100,
      maxHp: 100,
      hitRadius: 8,
      moveSpeed: 150,
      dashCharges: 1,
      dashCooldown: 0,
      dashTimer: 0,
      dashVel: vec2(0, 0),
      iFrameTimer: 0,
      slowTimer: 0,
      aim: vec2(1, 0),
    },
    weapon: createWeaponInstance('pistol'),
    weaponStores: { pistol: createWeaponInstance('pistol') },
    bullets: [],
    bulletPool: createBulletPool(),
    zombies: [],
    zombiePool: createZombiePool(),
    shards: [],
    shardPool: createShardPool(),
    spawn: createSpawnState(),
    obstacles: opts.obstacles,
    mapWidth: opts.mapWidth,
    mapHeight: opts.mapHeight,
    presentation: [],
  };
}

export function initRunDerivedState(state: RunState): void {
  state.stats = recomputeStats(state);
}
