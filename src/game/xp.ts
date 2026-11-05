import { BALANCE } from '../config/balance.ts';
import type { RunState } from './state.ts';
import { spawnXpShard, releaseShard, type XpShard } from './zombieEntity.ts';
import { getVariant, xpFromKill, type ZombieVariantId } from './zombies/types.ts';

export function xpToNext(level: number): number {
  const { baseToNext, linearPerLevel, powCoeff, powExp } = BALANCE.xp;
  return Math.round(baseToNext + linearPerLevel * level + powCoeff * level ** powExp);
}

export function addXp(state: RunState, amount: number): void {
  if (amount <= 0) return;
  const scaled = Math.round(amount * state.stats.xpGainMult);
  state.xp += scaled;
  while (state.xp >= state.xpNext) {
    state.xp -= state.xpNext;
    state.level += 1;
    state.xpNext = xpToNext(state.level);
    state.pendingLevelUps += 1;
    state.presentation.push({ type: 'levelUp', level: state.level, pending: state.pendingLevelUps });
  }
}

export function updateXpShards(state: RunState, dt: number): void {
  const player = state.player;
  const pickupR = state.stats.pickupRadius;
  const keep: XpShard[] = [];
  for (const shard of state.shards) {
    if (!shard.active) continue;
    const dx = player.x - shard.x;
    const dy = player.y - shard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < pickupR * 1.8) {
      const pull = Math.min(dist, 220 * dt);
      if (dist > 0.001) {
        shard.x += (dx / dist) * pull;
        shard.y += (dy / dist) * pull;
      }
    }
    const d2 = (player.x - shard.x) ** 2 + (player.y - shard.y) ** 2;
    if (d2 <= pickupR * pickupR) {
      addXp(state, shard.value);
      state.presentation.push({ type: 'pickup', xp: shard.value });
      releaseShard(state, shard);
    } else {
      keep.push(shard);
    }
  }
  state.shards = keep;
}

export function grantKillXp(state: RunState, x: number, y: number, variant: ZombieVariantId): void {
  const def = getVariant(variant);
  const value = xpFromKill(def, state.wave);
  state.kills += 1;
  state.score += value * 10;
  state.presentation.push({ type: 'kill', variantId: variant, targetId: 0 });
  spawnXpShard(state, x, y, value);
}
