import type { GameSettings } from '../persistence/storage.ts';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let unlocked = false;
let activeVoices = 0;
let settingsRef: GameSettings | null = null;

const MAX_VOICES = 16;

function ensureAudio(): AudioContext | null {
  if (ctx !== null) return ctx;
  if (typeof AudioContext === 'undefined') return null;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function unlockAudio(): void {
  const a = ensureAudio();
  if (a === null || unlocked) return;
  void a.resume();
  unlocked = true;
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

export function bindSfxSettings(settings: GameSettings): void {
  settingsRef = settings;
  applyMasterGain();
}

function applyMasterGain(): void {
  if (masterGain === null || settingsRef === null) return;
  masterGain.gain.value = 0.25 * settingsRef.masterVolume;
}

export type SfxId =
  | 'shot'
  | 'hit'
  | 'reload'
  | 'levelUp'
  | 'waveStart'
  | 'kill'
  | 'explosion'
  | 'hurt';

export function playSfx(id: SfxId): void {
  const a = ensureAudio();
  if (a === null || masterGain === null || !unlocked) return;
  if (activeVoices >= MAX_VOICES) return;
  const sfxVol = settingsRef?.sfxVolume ?? 1;
  if (sfxVol <= 0) return;

  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.connect(gain);
  gain.connect(masterGain);
  const now = a.currentTime;
  activeVoices += 1;
  const done = (): void => {
    activeVoices = Math.max(0, activeVoices - 1);
  };
  osc.addEventListener('ended', done);

  const v = 0.12 * sfxVol;
  if (id === 'shot') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);
    gain.gain.setValueAtTime(v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.start(now);
    osc.stop(now + 0.08);
  } else if (id === 'hit' || id === 'kill') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(id === 'kill' ? 90 : 140, now);
    gain.gain.setValueAtTime(v * 0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.start(now);
    osc.stop(now + 0.07);
  } else if (id === 'hurt') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(70, now + 0.1);
    gain.gain.setValueAtTime(v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.13);
  } else if (id === 'levelUp') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.linearRampToValueAtTime(660, now + 0.12);
    gain.gain.setValueAtTime(v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.22);
  } else if (id === 'waveStart') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.35);
    gain.gain.setValueAtTime(v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.42);
  } else if (id === 'explosion') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    gain.gain.setValueAtTime(v * 0.9, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.2);
  } else {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(180, now + 0.12);
    gain.gain.setValueAtTime(v * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.16);
  }
}

export function maxConcurrentVoices(): number {
  return MAX_VOICES;
}

export function concurrentVoiceCount(): number {
  return activeVoices;
}
