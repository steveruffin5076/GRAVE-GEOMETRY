import { describe, expect, it } from 'vitest';
import { FIXED_DT, MAX_SUBSTEPS } from '../src/config/constants.ts';
import {
  advanceFixedStep,
  createFixedStepAccumulator,
  MAX_FRAME_DT,
} from '../src/core/fixedStep.ts';

describe('fixedStep', () => {
  it('steps at FIXED_DT with clamped frame dt', () => {
    const acc = createFixedStepAccumulator();
    const r = advanceFixedStep(acc, 1 / 30);
    expect(r.steps).toBe(2);
    expect(r.consumed).toBeCloseTo(2 * FIXED_DT);
  });

  it('never exceeds MAX_SUBSTEPS per frame', () => {
    const acc = createFixedStepAccumulator();
    acc.accumulator = 1;
    const r = advanceFixedStep(acc, 0);
    expect(r.steps).toBe(MAX_SUBSTEPS);
  });

  it('clamps negative and huge dt', () => {
    const acc = createFixedStepAccumulator();
    expect(advanceFixedStep(acc, -1).steps).toBe(0);
    const acc2 = createFixedStepAccumulator();
    const steps = advanceFixedStep(acc2, 999).steps;
    expect(steps).toBeLessThanOrEqual(MAX_SUBSTEPS);
    expect(MAX_FRAME_DT).toBe(0.1);
  });
});
