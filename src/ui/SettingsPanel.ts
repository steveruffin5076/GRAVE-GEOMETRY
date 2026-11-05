import type { GameSettings } from '../persistence/storage.ts';
import { DEFAULT_SETTINGS, loadSettings, resetPersonalBest, saveSettings } from '../persistence/storage.ts';
import { UI } from '../data/strings.ts';

export class SettingsPanel {
  private root: HTMLElement;
  private dialog: HTMLElement;
  private onChange: ((s: GameSettings) => void) | null = null;

  constructor(rootId = 'hud-root') {
    const host = document.getElementById(rootId);
    if (host === null) throw new Error('hud-root missing');
    this.root = document.createElement('div');
    this.root.className = 'gg-settings-overlay';
    this.root.hidden = true;
    this.dialog = document.createElement('div');
    this.dialog.className = 'gg-settings-dialog';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-label', 'Settings');
    host.append(this.root);
    this.root.append(this.dialog);
  }

  bindChange(handler: (s: GameSettings) => void): void {
    this.onChange = handler;
  }

  open(settings: GameSettings): void {
    this.root.hidden = false;
    this.render(settings);
  }

  close(): void {
    this.root.hidden = true;
  }

  isOpen(): boolean {
    return !this.root.hidden;
  }

  private render(settings: GameSettings): void {
    this.dialog.innerHTML = '';
    const title = document.createElement('h2');
    title.textContent = 'Settings';
    this.dialog.append(title);

    this.addSelect(settings, 'fireMode', 'Fire mode', [
      { v: 'auto', l: 'Auto' },
      { v: 'manual', l: 'Manual' },
    ]);
    this.addRange(settings, 'masterVolume', 'Master volume');
    this.addRange(settings, 'sfxVolume', 'SFX');
    this.addRange(settings, 'musicVolume', 'Music');
    this.addToggle(settings, 'screenShake', 'Screen shake');
    this.addToggle(settings, 'reducedMotion', 'Reduced motion');
    this.addSelect(settings, 'colourBlind', 'Colour-blind', [
      { v: 'off', l: 'Off' },
      { v: 'protan', l: 'Protan' },
      { v: 'deutan', l: 'Deutan' },
      { v: 'tritan', l: 'Tritan' },
    ]);
    this.addToggle(settings, 'damageNumbers', 'Damage numbers');
    this.addSelect(settings, 'quality', 'Quality', [
      { v: 'auto', l: 'Auto' },
      { v: 'high', l: 'High' },
      { v: 'low', l: 'Low' },
    ]);
    this.addToggle(settings, 'leftHanded', 'Left-handed touch');
    this.addRange(settings, 'stickSize', 'Touch stick size', 64, 128);

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'gg-overlay-btn';
    reset.textContent = UI.resetRecords;
    reset.setAttribute('aria-label', UI.resetRecords);
    reset.addEventListener('click', () => {
      resetPersonalBest();
    });
    this.dialog.append(reset);

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Close';
    close.className = 'gg-fire-chip';
    close.addEventListener('click', () => this.close());
    this.dialog.append(close);
  }

  private patch(settings: GameSettings, patch: Partial<GameSettings>): void {
    const next = { ...settings, ...patch };
    saveSettings(next);
    this.onChange?.(next);
    this.render(next);
  }

  private addToggle(settings: GameSettings, key: keyof GameSettings, label: string): void {
    const row = document.createElement('label');
    row.className = 'gg-settings-row';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(settings[key]);
    input.addEventListener('change', () => this.patch(settings, { [key]: input.checked } as Partial<GameSettings>));
    row.append(input, document.createTextNode(` ${label}`));
    this.dialog.append(row);
  }

  private addRange(
    settings: GameSettings,
    key: keyof GameSettings,
    label: string,
    min = 0,
    max = 1,
  ): void {
    const row = document.createElement('label');
    row.className = 'gg-settings-row';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(settings[key] as number);
    input.addEventListener('input', () =>
      this.patch(settings, { [key]: Number(input.value) } as Partial<GameSettings>),
    );
    row.append(document.createTextNode(`${label} `), input);
    this.dialog.append(row);
  }

  private addSelect(
    settings: GameSettings,
    key: keyof GameSettings,
    label: string,
    options: { v: string; l: string }[],
  ): void {
    const row = document.createElement('label');
    row.className = 'gg-settings-row';
    const select = document.createElement('select');
    for (const o of options) {
      const opt = document.createElement('option');
      opt.value = o.v;
      opt.textContent = o.l;
      select.append(opt);
    }
    select.value = String(settings[key]);
    select.addEventListener('change', () =>
      this.patch(settings, { [key]: select.value } as Partial<GameSettings>),
    );
    row.append(document.createTextNode(`${label} `), select);
    this.dialog.append(row);
  }
}

export function loadGameSettings(defaultFire: GameSettings['fireMode']): GameSettings {
  return loadSettings(defaultFire) ?? DEFAULT_SETTINGS;
}
