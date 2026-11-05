import { formatCompact } from '../core/formatNumber.ts';
import { WAVE_SECONDS } from '../config/constants.ts';
import type { RunPhase } from '../game/state.ts';
import { UI, weaponLabel } from '../data/strings.ts';
import type { FireMode } from '../persistence/storage.ts';
import type { WeaponId } from '../game/weapons.ts';

export interface HudStats {
  hp: number;
  maxHp: number;
  dashCharges: number;
  phase: RunPhase;
  fireMode: FireMode;
  ammo: number;
  mag: number;
  reloading: boolean;
  reloadProgress: number;
  wave: number;
  waveTime: number;
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  score: number;
  weaponId: WeaponId;
  activeAmmo: string;
}

export class Hud {
  private root: HTMLElement;
  private hpBar: HTMLElement;
  private hpText: HTMLElement;
  private dashEl: HTMLElement;
  private waveEl: HTMLElement;
  private waveBar: HTMLElement;
  private killsEl: HTMLElement;
  private levelEl: HTMLElement;
  private xpBar: HTMLElement;
  private xpText: HTMLElement;
  private scoreEl: HTMLElement;
  private weaponEl: HTMLElement;
  private ammoEl: HTMLElement;
  private reloadRing: HTMLElement;
  private statusEl: HTMLElement;
  private fireChip: HTMLButtonElement;
  private settingsChip: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private liveRegion: HTMLElement;
  private onFireToggle: (() => void) | null = null;
  private onSettings: (() => void) | null = null;
  private onPause: (() => void) | null = null;

  constructor(rootId = 'hud-root') {
    const root = document.getElementById(rootId);
    if (root === null) throw new Error('hud-root missing');
    this.root = root;
    this.root.innerHTML = '';
    this.root.classList.add('gg-hud');

    this.liveRegion = document.createElement('div');
    this.liveRegion.className = 'gg-sr-live';
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');

    const topLeft = document.createElement('div');
    topLeft.className = 'gg-hud-block gg-hud-topleft';
    this.hpBar = this.progressBar('HP');
    this.hpText = document.createElement('div');
    this.hpText.className = 'gg-hud-hp-text';
    this.dashEl = document.createElement('div');
    this.dashEl.className = 'gg-hud-dash';
    topLeft.append(this.hpBar, this.hpText, this.dashEl);

    const topCenter = document.createElement('div');
    topCenter.className = 'gg-hud-block gg-hud-topcenter';
    this.waveEl = document.createElement('div');
    this.waveEl.className = 'gg-hud-wave';
    this.waveBar = this.progressBar('Wave timer');
    this.killsEl = document.createElement('div');
    this.killsEl.className = 'gg-hud-kills';
    topCenter.append(this.waveEl, this.waveBar, this.killsEl);

    const topRight = document.createElement('div');
    topRight.className = 'gg-hud-block gg-hud-topright';
    this.levelEl = document.createElement('div');
    this.levelEl.className = 'gg-hud-level';
    this.xpBar = this.progressBar('XP');
    this.xpText = document.createElement('div');
    this.xpText.className = 'gg-hud-xp-text';
    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'gg-hud-score';
    this.fireChip = document.createElement('button');
    this.fireChip.type = 'button';
    this.fireChip.className = 'gg-fire-chip';
    this.fireChip.setAttribute('aria-label', 'Toggle fire mode');
    this.fireChip.addEventListener('click', () => this.onFireToggle?.());
    this.settingsChip = document.createElement('button');
    this.settingsChip.type = 'button';
    this.settingsChip.className = 'gg-fire-chip';
    this.settingsChip.textContent = UI.settings.toUpperCase();
    this.settingsChip.setAttribute('aria-label', UI.settings);
    this.settingsChip.addEventListener('click', () => this.onSettings?.());
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.type = 'button';
    this.pauseBtn.className = 'gg-fire-chip';
    this.pauseBtn.textContent = UI.pause.toUpperCase();
    this.pauseBtn.setAttribute('aria-label', UI.pause);
    this.pauseBtn.addEventListener('click', () => this.onPause?.());
    topRight.append(
      this.levelEl,
      this.xpBar,
      this.xpText,
      this.scoreEl,
      this.pauseBtn,
      this.settingsChip,
      this.fireChip,
    );

    const weaponPanel = document.createElement('div');
    weaponPanel.className = 'gg-hud-weapon';
    this.weaponEl = document.createElement('div');
    this.weaponEl.className = 'gg-hud-weapon-name';
    this.ammoEl = document.createElement('div');
    this.ammoEl.className = 'gg-hud-ammo';
    this.reloadRing = document.createElement('div');
    this.reloadRing.className = 'gg-reload-ring';
    this.reloadRing.setAttribute('aria-hidden', 'true');
    weaponPanel.append(this.weaponEl, this.ammoEl, this.reloadRing);

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'gg-hud-status';

    const grid = document.createElement('div');
    grid.className = 'gg-hud-grid';
    grid.append(topLeft, topCenter, topRight);
    this.root.append(this.liveRegion, grid, weaponPanel, this.statusEl);
  }

  private progressBar(label: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'gg-bar';
    wrap.setAttribute('role', 'progressbar');
    wrap.setAttribute('aria-label', label);
    const fill = document.createElement('div');
    fill.className = 'gg-bar-fill';
    wrap.append(fill);
    return wrap;
  }

  private setBar(bar: HTMLElement, now: number, max: number): void {
    const pct = max > 0 ? Math.max(0, Math.min(1, now / max)) : 0;
    const fill = bar.querySelector('.gg-bar-fill');
    if (fill instanceof HTMLElement) fill.style.width = `${Math.round(pct * 100)}%`;
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(Math.round(max)));
    bar.setAttribute('aria-valuenow', String(Math.round(now)));
  }

  bindSettings(handler: () => void): void {
    this.onSettings = handler;
  }

  bindFireToggle(handler: () => void): void {
    this.onFireToggle = handler;
  }

  bindPause(handler: () => void): void {
    this.onPause = handler;
  }

  announce(message: string): void {
    this.liveRegion.textContent = message;
  }

  update(stats: HudStats): void {
    this.setBar(this.hpBar, stats.hp, stats.maxHp);
    this.hpText.textContent = `${formatCompact(Math.round(stats.hp))} / ${formatCompact(stats.maxHp)}`;
    this.dashEl.textContent = `Dash ×${stats.dashCharges}`;

    this.waveEl.textContent = `${UI.wave.toUpperCase()} ${stats.wave}`;
    const waveElapsed = stats.waveTime % WAVE_SECONDS;
    this.setBar(this.waveBar, waveElapsed, WAVE_SECONDS);
    this.killsEl.textContent = `${UI.kills}: ${formatCompact(stats.kills)}`;

    this.levelEl.textContent = `${UI.level.toUpperCase()} ${formatCompact(stats.level)}`;
    this.setBar(this.xpBar, stats.xp, stats.xpNext);
    this.xpText.textContent = `${formatCompact(stats.xp)} / ${formatCompact(stats.xpNext)}`;
    this.scoreEl.textContent = `${UI.score}: ${formatCompact(stats.score)}`;

    this.weaponEl.textContent = weaponLabel(stats.weaponId);
    const ammoText = stats.reloading
      ? 'reload…'
      : `${formatCompact(stats.ammo)} / ${formatCompact(stats.mag)} · ${stats.activeAmmo}`;
    this.ammoEl.textContent = ammoText;
    this.reloadRing.style.opacity = stats.reloading ? '1' : '0';
    this.reloadRing.style.setProperty('--reload-pct', String(Math.round(stats.reloadProgress * 100)));

    this.statusEl.textContent =
      stats.phase === 'PLAYING'
        ? 'WASD move · Space dash · Esc pause'
        : stats.phase === 'LEVEL_UP'
          ? UI.levelUpPick
          : stats.phase === 'PAUSED'
            ? UI.pauseTitle
            : stats.phase;

    this.fireChip.textContent = stats.fireMode === 'auto' ? UI.fireAuto : UI.fireManual;
    this.root.classList.toggle('gg-hud-paused', stats.phase === 'PAUSED');
  }
}
