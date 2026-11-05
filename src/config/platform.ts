/** Performance tier — read once at boot (PLAN §9.9). Headless/tests default to desktop. */
let mobilePlatform = false;

export function initPlatformCaps(): void {
  if (typeof window === 'undefined') {
    mobilePlatform = false;
    return;
  }
  mobilePlatform = window.matchMedia('(pointer: coarse)').matches;
}

export function isMobilePlatform(): boolean {
  return mobilePlatform;
}
