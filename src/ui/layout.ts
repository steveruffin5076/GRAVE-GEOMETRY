export type LayoutMode = 'landscape' | 'compact' | 'portrait';

export function detectLayoutMode(width: number, height: number): LayoutMode {
  const aspect = width / Math.max(1, height);
  if (aspect < 1) return 'portrait';
  if (aspect < 1.4) return 'compact';
  return 'landscape';
}

export function bindResponsiveLayout(onChange?: (mode: LayoutMode) => void): () => void {
  const apply = (): void => {
    const mode = detectLayoutMode(window.innerWidth, window.innerHeight);
    document.body.classList.remove('gg-layout-landscape', 'gg-layout-compact', 'gg-layout-portrait');
    document.body.classList.add(`gg-layout-${mode}`);
    onChange?.(mode);
  };
  apply();
  window.addEventListener('resize', apply);
  return () => window.removeEventListener('resize', apply);
}

export function portraitCameraZoom(mode: LayoutMode): number {
  return mode === 'portrait' ? 1.15 : 1;
}
