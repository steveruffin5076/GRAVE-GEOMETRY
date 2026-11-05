import type { RunState } from '../game/state.ts';
import {
  currentRank,
  describeOption,
  optionCategory,
  optionName,
  optionTier,
  type UpgradeOption,
} from '../game/upgrades.ts';

export class UpgradeModal {
  private root: HTMLElement;
  private dialog: HTMLElement;
  private queueEl: HTMLElement;
  private cards: HTMLButtonElement[] = [];
  private onPick: ((slot: 1 | 2 | 3) => void) | null = null;
  private focusIndex = 0;

  constructor(rootId = 'hud-root') {
    const host = document.getElementById(rootId);
    if (host === null) throw new Error('hud-root missing');
    this.root = document.createElement('div');
    this.root.className = 'gg-upgrade-overlay';
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    this.dialog = document.createElement('div');
    this.dialog.className = 'gg-upgrade-dialog';
    this.dialog.setAttribute('role', 'dialog');
    this.dialog.setAttribute('aria-modal', 'true');
    this.dialog.setAttribute('aria-label', 'Choose an upgrade');
    this.queueEl = document.createElement('div');
    this.queueEl.className = 'gg-upgrade-queue';
    const row = document.createElement('div');
    row.className = 'gg-upgrade-cards';
    for (let i = 0; i < 3; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gg-upgrade-card';
      btn.dataset.slot = String(i + 1);
      const slot = (i + 1) as 1 | 2 | 3;
      btn.addEventListener('click', () => this.onPick?.(slot));
      this.cards.push(btn);
      row.append(btn);
    }
    this.dialog.append(this.queueEl, row);
    this.root.append(this.dialog);
    host.append(this.root);
    window.addEventListener('keydown', this.onKey);
  }

  bindPick(handler: (slot: 1 | 2 | 3) => void): void {
    this.onPick = handler;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }

  sync(state: RunState): void {
    const options = state.levelUpOptions;
    const open = state.phase === 'LEVEL_UP' && options !== null && options.length >= 3;
    this.root.hidden = !open;
    this.root.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (!open) {
      for (const btn of this.cards) btn.innerHTML = '';
      return;
    }

    const queued = state.pendingLevelUps - 1;
    this.queueEl.textContent = queued > 0 ? `+${queued} queued` : '';

    options.forEach((opt, i) => {
      this.renderCard(this.cards[i]!, opt, state, i + 1);
    });
    this.cards[this.focusIndex]?.focus();
  }

  private renderCard(
    btn: HTMLButtonElement,
    opt: UpgradeOption,
    state: RunState,
    slot: number,
  ): void {
    const rank = currentRank(state, opt);
    const tier = optionTier(opt);
    const cat = optionCategory(opt);
    btn.innerHTML = '';
    btn.setAttribute('aria-label', `${optionName(opt)} option ${slot}`);
    const hotkey = document.createElement('span');
    hotkey.className = 'gg-upgrade-hotkey';
    hotkey.textContent = String(slot);
    const title = document.createElement('div');
    title.className = 'gg-upgrade-title';
    title.textContent = optionName(opt);
    const meta = document.createElement('div');
    meta.className = 'gg-upgrade-meta';
    meta.textContent = `${cat} · tier ${tier}${rank > 0 ? ` · rank ${rank}` : ''}`;
    const desc = document.createElement('div');
    desc.className = 'gg-upgrade-desc';
    desc.textContent = describeOption(state, opt);
    const pips = document.createElement('div');
    pips.className = 'gg-upgrade-pips';
    pips.textContent = '•'.repeat(tier);
    btn.append(hotkey, pips, title, meta, desc);
  }

  private onKey = (e: KeyboardEvent): void => {
    if (this.root.hidden) return;
    if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
      this.focusIndex = (this.focusIndex + 1) % 3;
      this.cards[this.focusIndex]?.focus();
      e.preventDefault();
    }
    if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
      this.focusIndex = (this.focusIndex + 2) % 3;
      this.cards[this.focusIndex]?.focus();
      e.preventDefault();
    }
    if (e.code === 'Enter') {
      this.onPick?.((this.focusIndex + 1) as 1 | 2 | 3);
    }
  };
}
