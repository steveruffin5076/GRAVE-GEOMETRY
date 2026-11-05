import { shuffleInPlace, weightedPick } from '../core/math/rng.ts';
import type { RunState } from './state.ts';
import { recomputeStats, syncPlayerFromStats, repeatableGain } from './stats.ts';
import type { WeaponId } from './weapons.ts';
import { CATALOG_UPGRADE_DEFS } from './upgradeCatalog.ts';

export type UpgradeCategory = 'weapon' | 'ammo' | 'attachment' | 'grenade' | 'skill';

export interface UpgradeDef {
  id: string;
  category: UpgradeCategory;
  name: string;
  description: (rank: number) => string;
  icon: string;
  tier: 1 | 2 | 3;
  weight: number;
  minLevel: number;
  minWave: number;
  requires?: string[];
  unique?: boolean;
  maxRank: number | null;
  gain?: (rank: number) => number;
  apply: (state: RunState) => void;
}

export interface UpgradeOption {
  id: string;
  rank: number;
}

const TIER_WEIGHT: Record<1 | 2 | 3, number> = { 1: 1, 2: 0.85, 3: 0.7 };

function rankOf(state: RunState, id: string): number {
  return state.ranks[id] ?? 0;
}

function ownsUnique(state: RunState, def: UpgradeDef): boolean {
  if (!def.unique) return false;
  if (def.category === 'weapon') return state.owned.weapons.includes(def.id.replace('weapon_', '') as WeaponId);
  if (def.category === 'grenade') return state.owned.grenades.includes(def.id);
  return (state.ranks[def.id] ?? 0) > 0;
}

function requirementsMet(state: RunState, def: UpgradeDef): boolean {
  if (!def.requires || def.requires.length === 0) return true;
  return def.requires.every((req) => {
    if (req.startsWith('weapon_')) {
      const wid = req.replace('weapon_', '') as WeaponId;
      return state.owned.weapons.includes(wid);
    }
    return (state.ranks[req] ?? 0) > 0 || state.owned.skills.includes(req);
  });
}

function eligible(state: RunState, def: UpgradeDef): boolean {
  if (state.level < def.minLevel) return false;
  if (state.wave < def.minWave) return false;
  if (!requirementsMet(state, def)) return false;
  const rank = rankOf(state, def.id);
  if (def.maxRank !== null && rank >= def.maxRank) return false;
  if (def.unique && ownsUnique(state, def)) return false;
  return true;
}

function isUsableNow(state: RunState, def: UpgradeDef): boolean {
  return requirementsMet(state, def);
}

function categoryBiasMultiplier(state: RunState, category: UpgradeCategory): number {
  const recent = state.recentUpgradeCategories;
  const count = recent.filter((c) => c === category).length;
  if (count === 0) return 1.35;
  if (count === 1) return 1.1;
  return 0.85;
}

function defWeight(state: RunState, def: UpgradeDef): number {
  return def.weight * TIER_WEIGHT[def.tier] * categoryBiasMultiplier(state, def.category);
}

function makeCacheDef(category: UpgradeCategory): UpgradeDef {
  const id = `cache_${category}` as const;
  const labels: Record<UpgradeCategory, string> = {
    weapon: 'Weapon Cache',
    ammo: 'Ammo Cache',
    attachment: 'Gear Cache',
    grenade: 'Grenade Cache',
    skill: 'Skill Cache',
  };
  return {
    id,
    category,
    name: labels[category],
    description: (rank) => `+${Math.round(repeatableGain(0.04, rank - 1) * 100)}% minor boost`,
    icon: 'cache',
    tier: 1,
    weight: 0.5,
    minLevel: 1,
    minWave: 1,
    maxRank: null,
    apply: (s) => {
      s.ranks[id] = (s.ranks[id] ?? 0) + 1;
    },
  };
}

const CACHE_DEFS: UpgradeDef[] = (
  ['weapon', 'ammo', 'attachment', 'grenade', 'skill'] as UpgradeCategory[]
).map(makeCacheDef);

export const PRESTIGE_DEF: UpgradeDef = {
  id: 'prestige_all',
  category: 'skill',
  name: 'Prestige',
  description: (rank) => `All gains ×${(1 + repeatableGain(0.1, rank - 1)).toFixed(2)}`,
  icon: 'prestige',
  tier: 3,
  weight: 0,
  minLevel: 25,
  minWave: 1,
  maxRank: null,
  apply: (s) => {
    s.ranks.prestige_all = (s.ranks.prestige_all ?? 0) + 1;
  },
};

const ALL_DEFS: UpgradeDef[] = [...CATALOG_UPGRADE_DEFS, ...CACHE_DEFS, PRESTIGE_DEF];

const DEF_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(ALL_DEFS.map((d) => [d.id, d]));

export function getUpgradeDef(id: string): UpgradeDef {
  const def = DEF_BY_ID[id];
  if (def === undefined) throw new Error(`unknown upgrade ${id}`);
  return def;
}

export { repeatableGain } from './stats.ts';

function pickOne(
  state: RunState,
  pool: UpgradeDef[],
  picked: UpgradeDef[],
  preferNewCategory: boolean,
): UpgradeDef | null {
  const usedCats = new Set(picked.map((p) => p.category));
  const candidates = pool.filter((d) => !picked.some((p) => p.id === d.id));
  if (candidates.length === 0) return null;
  return weightedPick(state.rng, candidates, (d) => {
    let w = defWeight(state, d);
    if (preferNewCategory && !usedCats.has(d.category)) w *= 1.6;
    return w;
  });
}

export function roll3(state: RunState): UpgradeOption[] {
  let pool = ALL_DEFS.filter((d) => d.id !== 'prestige_all' && eligible(state, d));
  const picked: UpgradeDef[] = [];

  for (let i = 0; i < 3; i++) {
    let def = pickOne(state, pool, picked, true);
    if (def === null) {
      const cats: UpgradeCategory[] = ['weapon', 'ammo', 'attachment', 'grenade', 'skill'];
      const cat = cats[i % cats.length]!;
      def = makeCacheDef(cat);
    }
    picked.push(def);
    pool = pool.filter((p) => p.id !== def.id);
  }

  if (!picked.some((d) => isUsableNow(state, d))) {
    picked[0] = CATALOG_UPGRADE_DEFS.find((d) => d.id === 'skill_fleetfoot') ?? picked[0]!;
  }

  if (state.level > 0 && state.level % 25 === 0) {
    picked[2] = PRESTIGE_DEF;
  }

  const options: UpgradeOption[] = picked.map((d) => ({
    id: d.id,
    rank: rankOf(state, d.id) + 1,
  }));

  shuffleInPlace(
    state.rng,
    options as unknown as { id: string; rank: number }[],
  );
  return options;
}

export function applyUpgrade(state: RunState, id: string): void {
  const def = getUpgradeDef(id);
  def.apply(state);
  state.stats = recomputeStats(state);
  syncPlayerFromStats(state);
  if (def.id === 'skill_vitality') {
    state.player.hp = Math.min(state.player.hp + 20, state.player.maxHp);
  }
  state.recentUpgradeCategories = [...state.recentUpgradeCategories, def.category].slice(-3);
  state.pendingLevelUps = Math.max(0, state.pendingLevelUps - 1);
  state.presentation.push({ type: 'upgradeApplied', id: def.id, rank: rankOf(state, def.id) });
}

export function describeOption(_state: RunState, option: UpgradeOption): string {
  const def = getUpgradeDef(option.id);
  return def.description(option.rank);
}

export function optionName(option: UpgradeOption): string {
  return getUpgradeDef(option.id).name;
}

export function optionCategory(option: UpgradeOption): UpgradeCategory {
  return getUpgradeDef(option.id).category;
}

export function optionTier(option: UpgradeOption): 1 | 2 | 3 {
  return getUpgradeDef(option.id).tier;
}

export function currentRank(state: RunState, option: UpgradeOption): number {
  return rankOf(state, option.id);
}
