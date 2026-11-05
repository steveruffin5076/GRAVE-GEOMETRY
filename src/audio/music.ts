import type { GameSettings } from '../persistence/storage.ts';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let unlocked = false;
let loopTimer: ReturnType<typeof setInterval> | null = null;

function ensureAudio(): AudioContext | null {
  if (ctx !== null) return ctx;
  if (typeof AudioContext === 'undefined') return null;
  ctx = new AudioContext();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(masterGain);
  return ctx;
}

function playDrone(): void {
  const a = ensureAudio();
  if (a === null || musicGain === null || !unlocked) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(55, a.currentTime);
  gain.gain.setValueAtTime(0.04, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 1.8);
  osc.connect(gain);
  gain.connect(musicGain);
  osc.start();
  osc.stop(a.currentTime + 1.9);
}

export function unlockMusic(): void {
  unlocked = true;
}

export function startMusic(settings: GameSettings): void {
  unlockMusic();
  updateMusicVolume(settings);
  if (loopTimer !== null || settings.musicVolume <= 0) return;
  loopTimer = setInterval(() => playDrone(), 2000);
}

export function stopMusic(): void {
  if (loopTimer !== null) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}

export function updateMusicVolume(settings: GameSettings): void {
  ensureAudio();
  if (musicGain === null) return;
  musicGain.gain.value = settings.musicVolume * settings.masterVolume * 0.35;
  if (settings.musicVolume <= 0) stopMusic();
  else if (unlocked && loopTimer === null) startMusic(settings);
}

export function isMusicUnlocked(): boolean {
  return unlocked;
}
