export interface RngState {
  seed: number;
  state: number;
}

export function createRng(seed: number): RngState {
  return { seed, state: seed >>> 0 };
}

/** mulberry32 — deterministic, no Math.random */
function nextU32(rng: RngState): number {
  let t = (rng.state += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function nextFloat(rng: RngState): number {
  return nextU32(rng) / 4294967296;
}

export function nextInt(rng: RngState, minInclusive: number, maxInclusive: number): number {
  const lo = Math.ceil(minInclusive);
  const hi = Math.floor(maxInclusive);
  if (hi < lo) throw new RangeError('invalid int range');
  const span = hi - lo + 1;
  return lo + Math.floor(nextFloat(rng) * span);
}

export function pick<T>(rng: RngState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('pick: empty array');
  return items[nextInt(rng, 0, items.length - 1)] as T;
}

export function weightedPick<T>(
  rng: RngState,
  items: readonly T[],
  weightOf: (item: T, index: number) => number,
): T {
  if (items.length === 0) throw new Error('weightedPick: empty array');
  let total = 0;
  const weights: number[] = [];
  for (let i = 0; i < items.length; i++) {
    const w = Math.max(0, weightOf(items[i] as T, i));
    weights.push(w);
    total += w;
  }
  if (total <= 0) {
    return pick(rng, items);
  }
  let roll = nextFloat(rng) * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return items[i] as T;
  }
  return items[items.length - 1] as T;
}

export function shuffleInPlace<T>(rng: RngState, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = nextInt(rng, 0, i);
    const tmp = items[i] as T;
    items[i] = items[j] as T;
    items[j] = tmp;
  }
  return items;
}

export function cloneRng(rng: RngState): RngState {
  return { seed: rng.seed, state: rng.state };
}

/** Advance rng by n steps (for reproducibility checks). */
export function skip(rng: RngState, n: number): void {
  for (let i = 0; i < n; i++) nextFloat(rng);
}

export function snapshotSequence(seed: number, count: number): number[] {
  const rng = createRng(seed);
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(nextFloat(rng));
  return out;
}
