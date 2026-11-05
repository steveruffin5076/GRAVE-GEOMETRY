export type FireMode = 'auto' | 'manual';

export type ColourBlindMode = 'off' | 'protan' | 'deutan' | 'tritan';

export type QualityMode = 'auto' | 'high' | 'low';

export interface GameSettings {
  fireMode: FireMode;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  reducedMotion: boolean;
  colourBlind: ColourBlindMode;
  damageNumbers: boolean;
  quality: QualityMode;
  leftHanded: boolean;
  stickSize: number;
}

export interface PersonalBest {
  time: number;
  wave: number;
  level: number;
  kills: number;
  score: number;
  date: string;
}

const SETTINGS_KEY = 'gravegeometry.v1.settings';
const BEST_KEY = 'gravegeometry.v1.best';

const DEFAULT_BEST: PersonalBest = {
  time: 0,
  wave: 0,
  level: 0,
  kills: 0,
  score: 0,
  date: '',
};

const memoryFallback = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    /* private mode */
  }
  return memoryFallback.get(key) ?? null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    /* private mode */
  }
  memoryFallback.set(key, value);
}

export const DEFAULT_SETTINGS: GameSettings = {
  fireMode: 'manual',
  masterVolume: 1,
  sfxVolume: 1,
  musicVolume: 0,
  screenShake: true,
  reducedMotion: false,
  colourBlind: 'off',
  damageNumbers: true,
  quality: 'auto',
  leftHanded: false,
  stickSize: 96,
};

export function loadSettings(defaultFireMode: FireMode = 'manual'): GameSettings {
  try {
    const raw = storageGet(SETTINGS_KEY);
    if (raw === null) {
      return { ...DEFAULT_SETTINGS, fireMode: defaultFireMode };
    }
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      fireMode: parsed.fireMode === 'auto' || parsed.fireMode === 'manual' ? parsed.fireMode : defaultFireMode,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, fireMode: defaultFireMode };
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    storageSet(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* private mode / quota */
  }
}

export function settingsStorageRoundTrip(settings: GameSettings): GameSettings {
  saveSettings(settings);
  return loadSettings(settings.fireMode);
}

export function loadPersonalBest(): PersonalBest {
  try {
    const raw = storageGet(BEST_KEY);
    if (raw === null) return { ...DEFAULT_BEST };
    const parsed = JSON.parse(raw) as Partial<PersonalBest>;
    return {
      time: Number(parsed.time) || 0,
      wave: Number(parsed.wave) || 0,
      level: Number(parsed.level) || 0,
      kills: Number(parsed.kills) || 0,
      score: Number(parsed.score) || 0,
      date: typeof parsed.date === 'string' ? parsed.date : '',
    };
  } catch {
    return { ...DEFAULT_BEST };
  }
}

export function savePersonalBest(best: PersonalBest): void {
  try {
    storageSet(BEST_KEY, JSON.stringify(best));
  } catch {
    /* private mode */
  }
}

export function resetPersonalBest(): void {
  try {
    storageSet(BEST_KEY, JSON.stringify(DEFAULT_BEST));
  } catch {
    /* private mode */
  }
}

export interface RunSummary {
  time: number;
  wave: number;
  level: number;
  kills: number;
  score: number;
  damageDealt: number;
  damageTaken: number;
  peakCombo: number;
  seed: number;
}

export function mergePersonalBest(prev: PersonalBest, run: RunSummary): PersonalBest {
  const next: PersonalBest = {
    time: Math.max(prev.time, run.time),
    wave: Math.max(prev.wave, run.wave),
    level: Math.max(prev.level, run.level),
    kills: Math.max(prev.kills, run.kills),
    score: Math.max(prev.score, run.score),
    date: new Date().toISOString(),
  };
  savePersonalBest(next);
  return next;
}

export function isNewPersonalBest(prev: PersonalBest, run: RunSummary): boolean {
  return (
    run.score > prev.score ||
    run.wave > prev.wave ||
    run.level > prev.level ||
    run.kills > prev.kills ||
    run.time > prev.time
  );
}

export function loadCorruptBestSafe(): PersonalBest {
  storageSet(BEST_KEY, '{not json');
  return loadPersonalBest();
}
