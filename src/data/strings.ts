export const GAME_TITLE = 'GRAVE GEOMETRY';
export const GAME_TAGLINE = 'One map. No last wave.';

export const UI = {
  pauseTitle: 'Paused',
  resume: 'Resume',
  restart: 'Restart',
  menu: 'Menu',
  settings: 'Settings',
  gameOver: 'Run ended',
  newBest: 'NEW BEST',
  timeSurvived: 'Time survived',
  wave: 'Wave',
  level: 'Level',
  kills: 'Kills',
  score: 'Score',
  damageDealt: 'Damage dealt',
  damageTaken: 'Damage taken',
  bestCombo: 'Best combo',
  seed: 'Seed',
  personalBest: 'Personal best',
  fireAuto: 'FIRE: AUTO',
  fireManual: 'FIRE: MANUAL',
  pause: 'Pause',
  resetRecords: 'Reset records',
  levelUpPick: 'Level up — pick 1 / 2 / 3',
} as const;

export function weaponLabel(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
