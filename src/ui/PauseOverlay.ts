import { UI } from '../data/strings.ts';

export class PauseOverlay {
  private root: HTMLElement;
  private onResume: (() => void) | null = null;
  private onSettings: (() => void) | null = null;
  private onRestart: (() => void) | null = null;
  private onMenu: (() => void) | null = null;

  constructor(hostId = 'hud-root') {
    const host = document.getElementById(hostId);
    if (host === null) throw new Error('hud-root missing');
    this.root = document.createElement('div');
    this.root.className = 'gg-pause-overlay';
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    const dialog = document.createElement('div');
    dialog.className = 'gg-pause-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', UI.pauseTitle);

    const title = document.createElement('h2');
    title.className = 'gg-overlay-title';
    title.textContent = UI.pauseTitle;
    dialog.append(title);

    const actions = document.createElement('div');
    actions.className = 'gg-overlay-actions';
    actions.append(
      this.btn(UI.resume, () => this.onResume?.()),
      this.btn(UI.settings, () => this.onSettings?.()),
      this.btn(UI.restart, () => this.onRestart?.()),
      this.btn(UI.menu, () => this.onMenu?.()),
    );
    dialog.append(actions);
    this.root.append(dialog);
    host.append(this.root);
  }

  private btn(label: string, fn: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gg-overlay-btn';
    b.textContent = label;
    b.setAttribute('aria-label', label);
    b.addEventListener('click', fn);
    return b;
  }

  bindHandlers(handlers: {
    resume: () => void;
    settings: () => void;
    restart: () => void;
    menu: () => void;
  }): void {
    this.onResume = handlers.resume;
    this.onSettings = handlers.settings;
    this.onRestart = handlers.restart;
    this.onMenu = handlers.menu;
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
    this.root.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
}
