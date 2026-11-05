import { BALANCE } from '../../config/balance.ts';
import { weightedPick } from '../../core/math/rng.ts';
import type { RngState } from '../../core/math/rng.ts';
import { COMBAT_VARIANTS, type ZombieVariantId } from './types.ts';

type VariantWeights = Record<ZombieVariantId, number>;
type WeightKeyframe = { wave: number } & Partial<Record<ZombieVariantId, number>>;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rowAtWave(wave: number): VariantWeights {
  const kf = BALANCE.zombies.variantWeightKeyframes as readonly WeightKeyframe[];
  let lo: WeightKeyframe = kf[0]!;
  let hi: WeightKeyframe = kf[kf.length - 1]!;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i]!;
    const b = kf[i + 1]!;
    if (wave >= a.wave && wave <= b.wave) {
      lo = a;
      hi = b;
      break;
    }
  }
  const t = hi.wave === lo.wave ? 0 : (wave - lo.wave) / (hi.wave - lo.wave);
  const out = {} as VariantWeights;
  for (const id of COMBAT_VARIANTS) {
    const wLo = lo[id] ?? 0;
    const wHi = hi[id] ?? 0;
    out[id] = Math.max(0, lerp(wLo, wHi, t));
  }
  return out;
}

export function pickVariantForWave(rng: RngState, wave: number): ZombieVariantId {
  const row = rowAtWave(wave);
  const ids = COMBAT_VARIANTS.filter(
    (id) => wave >= BALANCE.zombies.variants[id].unlockWave && row[id] > 0,
  );
  if (ids.length === 0) return 'walker';
  return weightedPick(rng, ids, (id) => row[id]);
}

export function eliteChance(wave: number): number {
  if (wave < BALANCE.zombies.eliteMinWave) return 0;
  const { base, perWave, cap } = BALANCE.zombies.eliteChance;
  return Math.min(cap, base + perWave * (wave - BALANCE.zombies.eliteMinWave));
}
