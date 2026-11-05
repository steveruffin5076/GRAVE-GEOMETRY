import { BALANCE } from '../config/balance.ts';
import type { GameSettings, QualityMode } from '../persistence/storage.ts';

export interface JuiceCaps {
  particles: number;
  decals: number;
  damageNumbers: number;
  lightPools: boolean;
}

export function effectiveQuality(quality: QualityMode, mobilePlatform: boolean): 'high' | 'low' {
  if (quality === 'low') return 'low';
  if (quality === 'high') return 'high';
  return mobilePlatform ? 'low' : 'high';
}

export function resolveJuiceCaps(quality: 'high' | 'low', mobilePlatform: boolean): JuiceCaps {
  const v = BALANCE.vfx;
  const particles =
    quality === 'low'
      ? Math.floor((mobilePlatform ? v.maxParticlesMobile : v.maxParticlesDesktop) * 0.5)
      : mobilePlatform
        ? v.maxParticlesMobile
        : v.maxParticlesDesktop;
  if (quality === 'low') {
    return { particles, decals: 0, damageNumbers: 0, lightPools: false };
  }
  return {
    particles,
    decals: mobilePlatform ? v.maxDecalsMobile : v.maxDecalsDesktop,
    damageNumbers: mobilePlatform ? v.maxDamageNumbersMobile : v.maxDamageNumbersDesktop,
    lightPools: true,
  };
}

export function shouldScreenShake(settings: GameSettings): boolean {
  return settings.screenShake && !settings.reducedMotion;
}

export function shouldHitFlash(settings: GameSettings): boolean {
  return !settings.reducedMotion;
}

export function particleScale(settings: GameSettings, mobilePlatform: boolean): number {
  const q = effectiveQuality(settings.quality, mobilePlatform);
  return q === 'low' ? 0.5 : 1;
}
