import { formatCompact, formatTimeSeconds } from '../core/formatNumber.ts';
import { UI } from '../data/strings.ts';
import type { PersonalBest, RunSummary } from '../persistence/storage.ts';

export interface GameOverView {
  summary: RunSummary;
  best: PersonalBest;
  newBest: boolean;
  killsByVariant: Record<string, number>;
}

export class GameOverScreen {
  private root: HTMLElement;
  private onRestart: (() => void) | null = null;
  private onMenu: (() => void) | null = null;

  constructor(hostId = 'hud-root') {
    const host = document.getElementById(hostId);
    if (host === null) throw new Error('hud-root missing');
    this.root = document.createElement('div');
    this.root.className = 'gg-gameover-overlay';
    this.root.hidden = true;
    host.append(this.root);
  }

  bindHandlers(handlers: { restart: () => void; menu: () => void }): void {
    this.onRestart = handlers.restart;
    this.onMenu = handlers.menu;
  }

  show(view: GameOverView): void {
    this.root.hidden = false;
    this.root.innerHTML = '';
    const dialog = document.createElement('div');
    dialog.className = 'gg-gameover-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', UI.gameOver);

    const title = document.createElement('h2');
    title.className = 'gg-overlay-title';
    title.textContent = UI.gameOver;
    if (view.newBest) {
      const badge = document.createElement('span');
      badge.className = 'gg-new-best';
      badge.textContent = UI.newBest;
      title.append(' ', badge);
    }
    dialog.append(title);

    const grid = document.createElement('div');
    grid.className = 'gg-gameover-grid';
    grid.append(
      this.row(UI.timeSurvived, formatTimeSeconds(view.summary.time)),
      this.row(UI.wave, String(view.summary.wave)),
      this.row(UI.level, String(view.summary.level)),
      this.row(UI.kills, formatCompact(view.summary.kills)),
      this.row(UI.score, formatCompact(view.summary.score)),
      this.row(UI.damageDealt, formatCompact(view.summary.damageDealt)),
      this.row(UI.damageTaken, formatCompact(view.summary.damageTaken)),
      this.row(UI.bestCombo, formatCompact(view.summary.peakCombo)),
      this.row(UI.seed, String(view.summary.seed)),
    );
    dialog.append(grid);

    const variantBlock = document.createElement('div');
    variantBlock.className = 'gg-gameover-variants';
    const vTitle = document.createElement('div');
    vTitle.textContent = 'Kills by variant';
    variantBlock.append(vTitle);
    for (const [variant, count] of Object.entries(view.killsByVariant).sort((a, b) => b[1] - a[1])) {
      const line = document.createElement('div');
      line.textContent = `${variant}: ${formatCompact(count)}`;
      variantBlock.append(line);
    }
    dialog.append(variantBlock);

    const pb = document.createElement('div');
    pb.className = 'gg-gameover-pb';
    pb.textContent = `${UI.personalBest} — ${UI.score} ${formatCompact(view.best.score)} · ${UI.wave} ${view.best.wave}`;
    dialog.append(pb);

    const actions = document.createElement('div');
    actions.className = 'gg-overlay-actions';
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'gg-overlay-btn gg-overlay-btn-primary';
    restart.textContent = UI.restart;
    restart.addEventListener('click', () => this.onRestart?.());
    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'gg-overlay-btn';
    menu.textContent = UI.menu;
    menu.addEventListener('click', () => this.onMenu?.());
    actions.append(restart, menu);
    dialog.append(actions);
    this.root.append(dialog);
    restart.focus();
  }

  close(): void {
    this.root.hidden = true;
  }

  private row(label: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'gg-gameover-row';
    const l = document.createElement('span');
    l.textContent = label;
    const v = document.createElement('strong');
    v.textContent = value;
    row.append(l, v);
    return row;
  }
}
