/** Compact display for HUD (PLAN §11.1). */
export function formatCompact(n: number): string {
  const v = Math.floor(n);
  if (!Number.isFinite(v)) return '0';
  const abs = Math.abs(v);
  if (abs < 10_000) return String(v);
  if (abs < 1_000_000) {
    const k = v / 1000;
    const rounded = Math.round(k * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}k` : `${rounded.toFixed(1)}k`;
  }
  if (abs < 1_000_000_000) {
    const m = v / 1_000_000;
    const rounded = Math.round(m * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}M` : `${rounded.toFixed(1)}M`;
  }
  const b = v / 1_000_000_000;
  const rounded = Math.round(b * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}B` : `${rounded.toFixed(1)}B`;
}

export function formatTimeSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}
