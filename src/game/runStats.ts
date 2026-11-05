import type { RunState } from './state.ts';

export function recordDamageDealt(state: RunState, amount: number): void {
  if (amount > 0 && Number.isFinite(amount)) state.damageDealt += amount;
}

export function recordDamageTaken(state: RunState, amount: number): void {
  if (amount > 0 && Number.isFinite(amount)) state.damageTaken += amount;
}

export function recordKillComboPeak(state: RunState): void {
  if (state.killComboCount > state.peakCombo) state.peakCombo = state.killComboCount;
}
