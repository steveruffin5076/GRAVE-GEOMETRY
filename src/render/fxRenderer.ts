import Phaser from 'phaser';
import { BALANCE } from '../config/balance.ts';
import { PALETTE } from '../config/palette.ts';
import { LAYER } from '../config/constants.ts';
import { worldToScreen } from '../core/math/iso.ts';
import type { PresentationEvent } from '../game/state.ts';
import type { Bullet } from '../game/bullets.ts';
import type { GameSettings } from '../persistence/storage.ts';
import { isMobilePlatform } from '../config/platform.ts';
import { FlashLimiter, JuicePools } from './juicePools.ts';
import {
  effectiveQuality,
  resolveJuiceCaps,
  shouldHitFlash,
} from './visualSettings.ts';

type ParticleKind = 'spark' | 'muzzle' | 'explosion' | 'xp' | 'boomer';

interface Particle {
  ttl: number;
  maxTtl: number;
  x: number;
  y: number;
  kind: ParticleKind;
}

interface Decal {
  ttl: number;
  x: number;
  y: number;
}

interface DamageNumber {
  ttl: number;
  x: number;
  y: number;
  vy: number;
  text: string;
}

interface FxItem {
  ttl: number;
  draw: (g: Phaser.GameObjects.Graphics) => void;
}

export class FxRenderer {
  private gfx: Phaser.GameObjects.Graphics;
  private overlay: Phaser.GameObjects.Graphics;
  private items: FxItem[] = [];
  private particles: Particle[] = [];
  private decals: Decal[] = [];
  private damageNumbers: DamageNumber[] = [];
  private pools = new JuicePools(resolveJuiceCaps('high', false));
  private flashLimiter = new FlashLimiter();
  private simTime = 0;
  private hitFlashTimer = 0;
  private levelVignetteTimer = 0;
  private comboBannerTimer = 0;
  private comboBannerText = '';
  private settings: GameSettings | null = null;
  private bulletTracersEnabled = true;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(LAYER.FX);
    this.overlay = scene.add.graphics().setDepth(LAYER.FX + 2).setScrollFactor(0);
  }

  configure(settings: GameSettings): void {
    this.settings = settings;
    const q = effectiveQuality(settings.quality, isMobilePlatform());
    this.pools.setCaps(resolveJuiceCaps(q, isMobilePlatform()));
    this.bulletTracersEnabled = q === 'high' && settings.damageNumbers;
  }

  getPoolCounts(): ReturnType<JuicePools['counts']> {
    return this.pools.counts();
  }

  getFlashLimiter(): FlashLimiter {
    return this.flashLimiter;
  }

  hitFlashActive(): boolean {
    return this.hitFlashTimer > 0;
  }

  ingest(events: PresentationEvent[]): void {
    const settings = this.settings;
    for (const e of events) {
      if (e.type === 'shot') {
        this.spawnMuzzle(e.x, e.y);
      } else if (e.type === 'hit') {
        this.spawnHitSpark(e.x, e.y);
        if (settings?.damageNumbers) this.spawnDamageNumber(e.x, e.y, Math.round(e.damage));
        if (settings && shouldHitFlash(settings)) this.hitFlashTimer = 0.06;
      } else if (e.type === 'explosion') {
        this.spawnExplosion(e.x, e.y, e.radius);
      } else if (e.type === 'zombieDeath') {
        this.spawnBloodDecal(e.x, e.y);
        if (e.variant === 'boomer') this.spawnBoomerRing(e.x, e.y);
      } else if (e.type === 'playerHurt') {
        if (settings && shouldHitFlash(settings)) this.hitFlashTimer = 0.08;
      } else if (e.type === 'levelUp') {
        if (settings && this.flashLimiter.canFlash(this.simTime)) {
          this.levelVignetteTimer = 0.35;
        }
      } else if (e.type === 'killCombo') {
        this.comboBannerText = `${e.count}× COMBO`;
        this.comboBannerTimer = 1.2;
      } else if (e.type === 'telegraph') {
        /* shape drawn on entity */
      }
    }
  }

  trackBullets(bullets: readonly Bullet[]): void {
    if (!this.bulletTracersEnabled) return;
    for (const b of bullets) {
      if (!b.active) continue;
      const s0 = worldToScreen(b.x - b.vx * (1 / 120), b.y - b.vy * (1 / 120));
      const s1 = worldToScreen(b.x, b.y);
      this.items.push({
        ttl: 0.05,
        draw: (g) => {
          g.lineStyle(1, Number(`0x${PALETTE.player2.slice(1)}`), 1);
          g.lineBetween(Math.round(s0.x), Math.round(s0.y - 8), Math.round(s1.x), Math.round(s1.y - 8));
        },
      });
    }
  }

  update(dt: number): void {
    this.simTime += dt;
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.levelVignetteTimer = Math.max(0, this.levelVignetteTimer - dt);
    this.comboBannerTimer = Math.max(0, this.comboBannerTimer - dt);

    let releasedP = 0;
    this.particles = this.particles.filter((p) => {
      p.ttl -= dt;
      if (p.ttl <= 0) releasedP += 1;
      return p.ttl > 0;
    });
    this.pools.releaseParticles(releasedP);

    let releasedD = 0;
    this.decals = this.decals.filter((d) => {
      d.ttl -= dt;
      if (d.ttl <= 0) releasedD += 1;
      return d.ttl > 0;
    });
    for (let i = 0; i < releasedD; i++) this.pools.releaseDecal();

    let releasedN = 0;
    this.damageNumbers = this.damageNumbers.filter((n) => {
      n.ttl -= dt;
      n.y += n.vy * dt;
      if (n.ttl <= 0) releasedN += 1;
      return n.ttl > 0;
    });
    for (let i = 0; i < releasedN; i++) this.pools.releaseDamageNumber();

    this.gfx.clear();
    for (const d of this.decals) this.drawDecal(this.gfx, d);
    for (const p of this.particles) this.drawParticle(this.gfx, p);
    for (const n of this.damageNumbers) this.drawDamageNumber(this.gfx, n);

    this.items = this.items.filter((item) => {
      item.ttl -= dt;
      if (item.ttl > 0) item.draw(this.gfx);
      return item.ttl > 0;
    });

    this.overlay.clear();
    const w = this.overlay.scene.scale.width;
    const h = this.overlay.scene.scale.height;
    if (this.levelVignetteTimer > 0) {
      this.overlay.fillStyle(Number(`0x${PALETTE.ui3.slice(1)}`), 0.12 * (this.levelVignetteTimer / 0.35));
      this.overlay.fillRect(0, 0, w, h);
    }
    if (this.hitFlashTimer > 0) {
      this.overlay.fillStyle(Number(`0x${PALETTE.blood2.slice(1)}`), 0.15);
      this.overlay.fillRect(0, 0, w, h);
    }
    if (this.comboBannerTimer > 0 && this.comboBannerText) {
      this.overlay.fillStyle(Number(`0x${PALETTE.ink0.slice(1)}`), 0.55);
      this.overlay.fillRect(8, 48, 120, 18);
    }
  }

  private spawnMuzzle(x: number, y: number): void {
    if (this.pools.spawnParticles(2) <= 0) return;
    const s = worldToScreen(x, y);
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        ttl: 0.08,
        maxTtl: 0.08,
        x: s.x,
        y: s.y - 8,
        kind: 'muzzle',
      });
    }
  }

  private spawnHitSpark(x: number, y: number): void {
    if (this.pools.spawnParticles(4) <= 0) return;
    const s = worldToScreen(x, y);
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        ttl: 0.12,
        maxTtl: 0.12,
        x: s.x + (i - 2) * 2,
        y: s.y - 10 + i,
        kind: 'spark',
      });
    }
  }

  private spawnExplosion(x: number, y: number, radius: number): void {
    const n = this.pools.spawnParticles(8);
    if (n <= 0) return;
    const s = worldToScreen(x, y);
    for (let i = 0; i < n; i++) {
      this.particles.push({
        ttl: 0.25,
        maxTtl: 0.25,
        x: s.x + Math.cos(i) * radius * 0.2,
        y: s.y - 8 + Math.sin(i) * radius * 0.1,
        kind: 'explosion',
      });
    }
  }

  private spawnBloodDecal(x: number, y: number): void {
    if (!this.pools.spawnDecal()) return;
    const cap = this.pools.counts().decals;
    if (cap > 0 && this.decals.length >= cap) {
      this.decals.shift();
      this.pools.releaseDecal();
    }
    const s = worldToScreen(x, y);
    this.decals.push({
      ttl: BALANCE.vfx.decalTtlSeconds,
      x: s.x,
      y: s.y,
    });
  }

  private spawnBoomerRing(x: number, y: number): void {
    if (this.pools.spawnParticles(6) <= 0) return;
    const s = worldToScreen(x, y);
    for (let i = 0; i < 6; i++) {
      this.particles.push({ ttl: 0.3, maxTtl: 0.3, x: s.x, y: s.y - 8, kind: 'boomer' });
    }
  }

  private spawnDamageNumber(x: number, y: number, damage: number): void {
    if (!this.pools.spawnDamageNumber()) return;
    const s = worldToScreen(x, y);
    this.damageNumbers.push({
      ttl: BALANCE.vfx.damageNumberTtlSeconds,
      x: s.x,
      y: s.y - 14,
      vy: -28,
      text: String(damage),
    });
  }

  private drawParticle(g: Phaser.GameObjects.Graphics, p: Particle): void {
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    if (p.kind === 'muzzle') {
      g.fillStyle(Number(`0x${PALETTE.hazard2.slice(1)}`), p.ttl / p.maxTtl);
      g.fillCircle(cx, cy, 3);
    } else if (p.kind === 'explosion' || p.kind === 'boomer') {
      g.fillStyle(Number(`0x${PALETTE.fire1.slice(1)}`), 0.5 + p.ttl);
      g.fillCircle(cx, cy, 4);
    } else if (p.kind === 'xp') {
      g.fillStyle(Number(`0x${PALETTE.acid2.slice(1)}`), 1);
      g.fillRect(cx - 1, cy - 1, 2, 2);
    } else {
      g.fillStyle(Number(`0x${PALETTE.blood2.slice(1)}`), 1);
      g.fillRect(cx - 1, cy - 1, 2, 2);
    }
  }

  private drawDecal(g: Phaser.GameObjects.Graphics, d: Decal): void {
    g.fillStyle(Number(`0x${PALETTE.blood1.slice(1)}`), 0.35);
    g.fillRect(Math.round(d.x) - 3, Math.round(d.y) - 12, 6, 4);
  }

  private drawDamageNumber(g: Phaser.GameObjects.Graphics, n: DamageNumber): void {
    g.fillStyle(Number(`0x${PALETTE.ui3.slice(1)}`), 1);
    g.fillRect(Math.round(n.x) - 2, Math.round(n.y) - 4, 4 + n.text.length * 2, 6);
  }
}
