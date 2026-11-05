export class WaveAnnouncer {
  private el: HTMLDivElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.setAttribute('aria-live', 'polite');
    this.el.setAttribute('aria-atomic', 'true');
    this.el.className = 'wave-announcer';
    this.el.style.cssText =
      'position:fixed;top:20%;left:50%;transform:translateX(-50%);padding:8px 16px;background:#121722;color:#e6edf5;font-family:ui-monospace,monospace;font-size:14px;pointer-events:none;opacity:0;transition:opacity 0.2s;z-index:9000;';
    document.body.appendChild(this.el);
  }

  announceWave(wave: number): void {
    this.el.textContent = `Wave ${wave}`;
    this.el.style.opacity = '1';
    window.setTimeout(() => {
      this.el.style.opacity = '0';
    }, 1600);
  }
}
