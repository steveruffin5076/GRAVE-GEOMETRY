import { BALANCE } from '../config/balance.ts';
import type { DerivedStats } from './stats.ts';
import { repeatableGain } from './stats.ts';
import type { RunState } from './state.ts';

export type AttachmentId = keyof typeof BALANCE.attachments;

export const ATTACHMENT_IDS = Object.keys(BALANCE.attachments) as AttachmentId[];

export function getAttachmentDamageMult(state: RunState): number {
  let mult = 1;
  const ranks = state.ranks;
  for (const key of ATTACHMENT_IDS) {
    const rank = ranks[`attach_${key}`] ?? 0;
    const def = BALANCE.attachments[key];
    for (let r = 0; r < rank; r++) {
      const g = repeatableGain(1, r);
      if ('damageMult' in def && def.damageMult !== undefined) {
        mult *= def.damageMult ** g;
      }
    }
  }
  return mult;
}

export function applyAttachmentStats(state: RunState, stats: DerivedStats): void {
  const ranks = state.ranks;
  for (const key of ATTACHMENT_IDS) {
    const rank = ranks[`attach_${key}`] ?? 0;
    const def = BALANCE.attachments[key];
    for (let r = 0; r < rank; r++) {
      const g = repeatableGain(1, r);
      if ('magMult' in def && def.magMult !== undefined) {
        stats.magSizeMult += def.magMult * g;
      }
      if ('reloadMult' in def && def.reloadMult !== undefined) {
        stats.reloadMult *= def.reloadMult ** g;
      }
      if ('spreadMult' in def && def.spreadMult !== undefined) {
        stats.spreadMult *= def.spreadMult ** g;
      }
      if ('damageMult' in def && def.damageMult !== undefined) {
        stats.damageMult *= def.damageMult ** g;
      }
      if ('critAdd' in def && def.critAdd !== undefined) {
        stats.critChance += def.critAdd * g;
      }
      if ('fireRateMult' in def && def.fireRateMult !== undefined) {
        stats.fireRateMult *= def.fireRateMult ** g;
      }
      if ('knockbackMult' in def && def.knockbackMult !== undefined) {
        stats.knockbackMult *= def.knockbackMult ** g;
      }
    }
  }
}

export function stabiliserRemovesMovePenalty(state: RunState): boolean {
  return (state.ranks.attach_stabiliser ?? 0) > 0;
}
