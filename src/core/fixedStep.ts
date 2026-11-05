import { FIXED_DT, MAX_SUBSTEPS } from '../config/constants.ts';

export const MAX_FRAME_DT = 0.1;

export interface FixedStepAccumulator {
  accumulator: number;
}

export function createFixedStepAccumulator(): FixedStepAccumulator {
  return { accumulator: 0 };
}

export interface FixedStepResult {
  steps: number;
  consumed: number;
}

/**
 * Integrate frame delta into fixed 1/60 s steps (max MAX_SUBSTEPS, dt clamped).
 * Returns how many simulation steps to run and how much time was consumed.
 */
export function advanceFixedStep(
  acc: FixedStepAccumulator,
  frameDt: number,
): FixedStepResult {
  const dt = Math.min(Math.max(0, frameDt), MAX_FRAME_DT);
  acc.accumulator += dt;
  let steps = 0;
  while (acc.accumulator >= FIXED_DT && steps < MAX_SUBSTEPS) {
    acc.accumulator -= FIXED_DT;
    steps++;
  }
  const consumed = steps * FIXED_DT;
  return { steps, consumed };
}

export function resetAccumulator(acc: FixedStepAccumulator): void {
  acc.accumulator = 0;
}
