import { describe, expect, it } from 'vitest';
import { BALANCE } from '../src/config/balance.ts';
import { isAudioUnlocked } from '../src/audio/sfx.ts';
import { FlashLimiter, JuicePools } from '../src/render/juicePools.ts';
import { resolveJuiceCaps, shouldScreenShake } from '../src/render/visualSettings.ts';
import { DEFAULT_SETTINGS } from '../src/persistence/storage.ts';

describe('juice', () => {
  it('pool caps are never exceeded', () => {
    const caps = resolveJuiceCaps('high', false);
    const pools = new JuicePools(caps);
    for (let i = 0; i < caps.particles + 50; i++) {
      pools.spawnParticles(3);
    }
    expect(pools.counts().particles).toBeLessThanOrEqual(caps.particles);
    for (let i = 0; i < caps.damageNumbers + 10; i++) {
      pools.spawnDamageNumber();
    }
    expect(pools.counts().damageNumbers).toBeLessThanOrEqual(caps.damageNumbers);
  });

  it('quality low disables decals and damage numbers', () => {
    const low = resolveJuiceCaps('low', false);
    expect(low.decals).toBe(0);
    expect(low.damageNumbers).toBe(0);
    expect(low.lightPools).toBe(false);
    expect(low.particles).toBeLessThan(BALANCE.vfx.maxParticlesDesktop);
  });

  it('reduced motion disables screen shake', () => {
    expect(
      shouldScreenShake({ ...DEFAULT_SETTINGS, screenShake: true, reducedMotion: true }),
    ).toBe(false);
    expect(
      shouldScreenShake({ ...DEFAULT_SETTINGS, screenShake: true, reducedMotion: false }),
    ).toBe(true);
  });

  it('flash limiter enforces max 3 Hz', () => {
    const limiter = new FlashLimiter();
    expect(limiter.minInterval()).toBeCloseTo(1 / 3, 5);
    let allowed = 0;
    for (let t = 0; t < 1; t += 0.05) {
      if (limiter.canFlash(t)) allowed += 1;
    }
    expect(allowed).toBeLessThanOrEqual(4);
    expect(allowed).toBeGreaterThanOrEqual(2);
  });

  it('sfx does not autoplay before unlock', () => {
    expect(isAudioUnlocked()).toBe(false);
  });
});
