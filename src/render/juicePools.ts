import { BALANCE } from '../config/balance.ts';
import type { JuiceCaps } from './visualSettings.ts';

export interface PoolCounts {
  particles: number;
  decals: number;
  damageNumbers: number;
}

export class JuicePools {
  private particles = 0;
  private decals = 0;
  private damageNumbers = 0;

  constructor(private caps: JuiceCaps) {}

  setCaps(caps: JuiceCaps): void {
    this.caps = caps;
    this.particles = Math.min(this.particles, caps.particles);
    this.decals = Math.min(this.decals, caps.decals);
    this.damageNumbers = Math.min(this.damageNumbers, caps.damageNumbers);
  }

  counts(): PoolCounts {
    return {
      particles: this.particles,
      decals: this.decals,
      damageNumbers: this.damageNumbers,
    };
  }

  spawnParticles(n: number): number {
    const room = Math.max(0, this.caps.particles - this.particles);
    const added = Math.min(room, n);
    this.particles += added;
    return added;
  }

  releaseParticles(n: number): void {
    this.particles = Math.max(0, this.particles - n);
  }

  spawnDecal(): boolean {
    if (this.caps.decals <= 0) return false;
    if (this.decals >= this.caps.decals) return true;
    this.decals += 1;
    return true;
  }

  releaseDecal(): void {
    this.decals = Math.max(0, this.decals - 1);
  }

  spawnDamageNumber(): boolean {
    if (this.caps.damageNumbers <= 0) return false;
    if (this.damageNumbers >= this.caps.damageNumbers) return false;
    this.damageNumbers += 1;
    return true;
  }

  releaseDamageNumber(): void {
    this.damageNumbers = Math.max(0, this.damageNumbers - 1);
  }
}

export class FlashLimiter {
  private lastFlashAt = -Infinity;

  constructor(private minIntervalSeconds = 1 / BALANCE.vfx.maxFlashHz) {}

  canFlash(nowSeconds: number): boolean {
    if (nowSeconds - this.lastFlashAt >= this.minIntervalSeconds) {
      this.lastFlashAt = nowSeconds;
      return true;
    }
    return false;
  }

  minInterval(): number {
    return this.minIntervalSeconds;
  }
}
